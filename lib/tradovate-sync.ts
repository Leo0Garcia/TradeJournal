import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js';
import { TradovateClient, TradovateEnvironment, baseSymbol } from './tradovate';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceDb = SupabaseClient<any, any, any>;

function serviceClient(): ServiceDb {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Connection {
  id: string;
  user_id: string;
  account_id: string | null;
  tradovate_account_id: number | null;
  tradovate_account_name: string | null;
  encrypted_username: string;
  encrypted_password: string;
  device_id: string;
  environment: TradovateEnvironment;
  access_token: string | null;
  token_expires_at: string | null;
  refresh_token: string | null;
  last_fill_id: number;
}

async function getOrRefreshToken(conn: Connection, db: ServiceDb): Promise<{ token: string; expires: string }> {
  const now = new Date();
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  const bufferMs = 5 * 60 * 1000; // refresh 5 min before expiry

  if (conn.access_token && expiresAt && expiresAt.getTime() - now.getTime() > bufferMs) {
    return { token: conn.access_token, expires: conn.token_expires_at! };
  }

  // Try refresh token first (silent renewal — no user action needed)
  if (conn.refresh_token) {
    const env = conn.environment ?? 'demo';
    const refreshed = await TradovateClient.refreshOAuthToken(conn.refresh_token, env);
    await db.from('tradovate_connections').update({
      access_token: refreshed.accessToken,
      token_expires_at: refreshed.expirationTime,
      refresh_token: refreshed.refreshToken ?? conn.refresh_token,
      sync_error: null,
    }).eq('id', conn.id);
    return { token: refreshed.accessToken, expires: refreshed.expirationTime };
  }

  // No refresh token — user must reconnect via OAuth in Settings
  throw new Error('Token expired — reconnect Tradovate in Settings');
}

export async function syncConnection(conn: Connection): Promise<{ processed: number; error?: string }> {
  if (!conn.account_id || !conn.tradovate_account_id) {
    return { processed: 0 };
  }

  const db = serviceClient();

  try {
    const { token } = await getOrRefreshToken(conn, db);
    const client = new TradovateClient(token, conn.environment ?? 'demo');

    const fills = await client.getFillsForAccount(conn.tradovate_account_id);

    // Only fills newer than our last seen ID
    const newFills = fills
      .filter(f => f.id > (conn.last_fill_id ?? 0))
      .sort((a, b) => a.id - b.id);

    if (newFills.length === 0) {
      await db.from('tradovate_connections').update({ last_sync_at: new Date().toISOString(), sync_error: null }).eq('id', conn.id);
      return { processed: 0 };
    }

    // Cache for contract symbol lookups
    const contractCache: Record<number, string> = {};
    const getSymbol = async (contractId: number): Promise<string> => {
      if (contractCache[contractId]) return contractCache[contractId];
      const contract = await client.getContract(contractId);
      const sym = contract ? baseSymbol(contract.name) : String(contractId);
      contractCache[contractId] = sym;
      return sym;
    };

    let processed = 0;

    for (const fill of newFills) {
      const symbol = await getSymbol(fill.contractId);
      const fillDirection = fill.action === 'Buy' ? 'long' : 'short';

      // Find any open trade for this symbol + account
      const { data: openTrades } = await db
        .from('trades')
        .select('id, direction, remaining_size, initial_size, entry_price')
        .eq('account_id', conn.account_id)
        .eq('symbol', symbol)
        .eq('status', 'open')
        .order('created_at', { ascending: true })
        .limit(1);

      const openTrade = openTrades?.[0] ?? null;

      if (!openTrade) {
        // --- New position: create trade ---
        await db.from('trades').insert({
          account_id: conn.account_id,
          symbol,
          direction: fillDirection,
          trade_date: fill.timestamp,
          entry_price: fill.price,
          initial_size: fill.qty,
          remaining_size: fill.qty,
          gross_pnl: 0,
          net_pnl: 0,
          fees: 0,
          status: 'open',
          notes: `Auto-imported from Tradovate (fill #${fill.id})`,
        });
      } else if (fillDirection !== openTrade.direction) {
        // --- Closing fill: add exit ---
        const exitSize = Math.min(fill.qty, openTrade.remaining_size);

        // Fetch instrument point value
        const { data: instrument } = await db
          .from('instruments')
          .select('point_value')
          .eq('symbol', symbol)
          .single();
        const pointValue = instrument?.point_value ?? 1;
        const dirMultiplier = openTrade.direction === 'long' ? 1 : -1;
        const pnl = (fill.price - openTrade.entry_price) * exitSize * pointValue * dirMultiplier;

        const newRemaining = Math.max(0, openTrade.remaining_size - exitSize);
        const isClosed = newRemaining <= 0;

        await db.from('exits').insert({
          trade_id: openTrade.id,
          exit_price: fill.price,
          size: exitSize,
          exit_date: fill.timestamp,
          pnl,
          notes: `Auto-imported from Tradovate (fill #${fill.id})`,
        });

        const { data: currentTrade } = await db.from('trades').select('gross_pnl, fees').eq('id', openTrade.id).single();
        const newGrossPnl = (currentTrade?.gross_pnl ?? 0) + pnl;
        const newNetPnl = newGrossPnl - (currentTrade?.fees ?? 0);

        await db.from('trades').update({
          remaining_size: newRemaining,
          gross_pnl: newGrossPnl,
          net_pnl: newNetPnl,
          status: isClosed ? 'closed' : 'open',
          closed_at: isClosed ? new Date().toISOString() : null,
        }).eq('id', openTrade.id);
      } else {
        // --- Same direction: scaling into existing position ---
        const newSize = openTrade.initial_size + fill.qty;
        const newRemaining = openTrade.remaining_size + fill.qty;
        // Weighted average entry price
        const avgEntry =
          (openTrade.entry_price * openTrade.initial_size + fill.price * fill.qty) / newSize;

        await db.from('trades').update({
          initial_size: newSize,
          remaining_size: newRemaining,
          entry_price: avgEntry,
        }).eq('id', openTrade.id);
      }

      // Advance the watermark
      await db.from('tradovate_connections').update({ last_fill_id: fill.id }).eq('id', conn.id);
      processed++;
    }

    await db.from('tradovate_connections').update({
      last_sync_at: new Date().toISOString(),
      sync_error: null,
    }).eq('id', conn.id);

    // Check loss limits and profit targets for challenge accounts
    if (processed > 0) {
      await checkAccountLimits(conn.account_id, db);
    }

    return { processed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.from('tradovate_connections').update({ sync_error: msg }).eq('id', conn.id);
    return { processed: 0, error: msg };
  }
}

async function checkAccountLimits(accountId: string, db: ServiceDb): Promise<void> {
  const { data: account } = await db
    .from('accounts')
    .select('is_challenge, profit_target, daily_loss_limit, total_loss_limit, is_disabled, challenge_passed')
    .eq('id', accountId)
    .single();

  if (!account || !account.is_challenge || account.is_disabled || account.challenge_passed) return;

  // Sum all closed trade P&L
  const { data: allTrades } = await db
    .from('trades')
    .select('net_pnl, trade_date')
    .eq('account_id', accountId)
    .eq('status', 'closed');

  const totalPnl = (allTrades ?? []).reduce((s, t) => s + parseFloat(String(t.net_pnl)), 0);

  const today = new Date().toISOString().slice(0, 10);
  const dailyPnl = (allTrades ?? [])
    .filter(t => t.trade_date.slice(0, 10) === today)
    .reduce((s, t) => s + parseFloat(String(t.net_pnl)), 0);

  const updates: Record<string, unknown> = {};

  // Profit target hit → mark as passed (UI will prompt user to convert)
  if (account.profit_target != null && totalPnl >= account.profit_target) {
    updates.challenge_passed = true;
  }

  // Total loss limit breached
  if (account.total_loss_limit != null && totalPnl <= -Math.abs(account.total_loss_limit)) {
    updates.is_disabled = true;
  }

  // Daily loss limit breached
  if (account.daily_loss_limit != null && dailyPnl <= -Math.abs(account.daily_loss_limit)) {
    updates.is_disabled = true;
  }

  if (Object.keys(updates).length > 0) {
    await db.from('accounts').update(updates).eq('id', accountId);
  }
}

export async function syncAllConnections(): Promise<void> {
  const db = serviceClient();
  const { data: connections } = await db
    .from('tradovate_connections')
    .select('*')
    .eq('is_active', true)
    .not('account_id', 'is', null)
    .not('tradovate_account_id', 'is', null);

  if (!connections?.length) return;

  await Promise.allSettled(connections.map(c => syncConnection(c as Connection)));
}
