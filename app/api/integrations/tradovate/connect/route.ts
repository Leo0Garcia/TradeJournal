import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { TradovateClient, TradovateEnvironment } from '@/lib/tradovate';
import { encrypt } from '@/lib/encryption';
import { randomUUID } from 'crypto';

// POST — connect with username + password
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username, password, environment } = await req.json() as {
    username: string;
    password: string;
    environment: TradovateEnvironment;
  };

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  const env: TradovateEnvironment = environment === 'live' ? 'live' : 'demo';

  // Generate a stable device ID for this connection attempt
  const deviceId = randomUUID();

  let auth: { accessToken: string; expirationTime: string };
  try {
    auth = await TradovateClient.authenticate(username, password, env, deviceId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Authentication failed' },
      { status: 401 }
    );
  }

  // Fetch accounts with the new token
  const client = new TradovateClient(auth.accessToken, env);
  let tradovateAccounts;
  try {
    tradovateAccounts = await client.getAccounts();
  } catch {
    return NextResponse.json({ error: 'Connected but failed to fetch accounts — try again' }, { status: 502 });
  }

  if (!tradovateAccounts?.length) {
    return NextResponse.json({ error: 'No Tradovate accounts found for this login' }, { status: 404 });
  }

  const encryptedUsername = encrypt(username);
  const encryptedPassword = encrypt(password);

  // Use service client to bypass RLS for upsert
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const rows = tradovateAccounts.map(a => ({
    user_id: user.id,
    environment: env,
    tradovate_account_id: a.id,
    tradovate_account_name: a.name,
    encrypted_username: encryptedUsername,
    encrypted_password: encryptedPassword,
    device_id: deviceId,
    access_token: auth.accessToken,
    token_expires_at: auth.expirationTime,
    refresh_token: null,
    is_active: false,
  }));

  const { error } = await db
    .from('tradovate_connections')
    .upsert(rows, { onConflict: 'user_id,tradovate_account_id', ignoreDuplicates: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, accounts: tradovateAccounts.length });
}

// DELETE — remove all connections for this user
export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('tradovate_connections').delete().eq('user_id', user.id);
  return new NextResponse(null, { status: 204 });
}
