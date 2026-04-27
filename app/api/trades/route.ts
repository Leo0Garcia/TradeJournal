import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { NewTradeInput } from '@/types';

function transformTrade(raw: Record<string, unknown>) {
  const tt = (raw.trade_tags as { tags: unknown }[] | null) ?? [];
  const { accounts, ...rest } = raw;
  return {
    ...rest,
    account: accounts ?? null,
    tags: tt.map(t => t.tags).filter(Boolean),
    trade_tags: undefined,
  };
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);

  let query = supabase
    .from('trades')
    .select('*, exits(*), trade_tags(tags(*)), accounts(id,name,broker,currency)')
    .order('trade_date', { ascending: false })
    .order('created_at', { ascending: false });

  const status = searchParams.get('status');
  const symbol = searchParams.get('symbol');
  const direction = searchParams.get('direction');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const accountId = searchParams.get('account_id');
  const accountType = searchParams.get('account_type');

  if (status && status !== 'all') query = query.eq('status', status);
  if (symbol) query = query.eq('symbol', symbol);
  if (direction && direction !== 'all') query = query.eq('direction', direction);
  if (from) query = query.gte('trade_date', from);
  if (to) query = query.lte('trade_date', to + 'T23:59:59Z');

  if (accountId) {
    query = query.eq('account_id', accountId);
  } else if (accountType) {
    const { data: typeAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('account_type', accountType);
    const ids = (typeAccounts ?? []).map((a: { id: string }) => a.id);
    if (ids.length === 0) return NextResponse.json([]);
    query = query.in('account_id', ids);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((data ?? []).map(row => transformTrade(row as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: NewTradeInput = await req.json();

  const { data: trade, error } = await supabase
    .from('trades')
    .insert({
      user_id: user.id,
      account_id: body.account_id ?? null,
      symbol: body.symbol,
      direction: body.direction,
      trade_date: body.trade_date,
      entry_price: body.entry_price,
      initial_size: body.initial_size,
      remaining_size: body.initial_size,
      stop_loss: body.stop_loss ?? null,
      take_profit: body.take_profit ?? null,
      notes: body.notes ?? '',
      fees: body.fees ?? 0,
      gross_pnl: 0,
      net_pnl: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.tag_ids?.length) {
    await supabase.from('trade_tags').insert(
      body.tag_ids.map(tag_id => ({ trade_id: trade.id, tag_id }))
    );
  }

  const { data: full } = await supabase
    .from('trades')
    .select('*, exits(*), trade_tags(tags(*)), accounts(id,name,broker,currency)')
    .eq('id', trade.id)
    .single();

  return NextResponse.json(transformTrade(full as Record<string, unknown>), { status: 201 });
}
