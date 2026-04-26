import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { NewExitInput } from '@/types';

function transformTrade(raw: Record<string, unknown>) {
  const tt = (raw.trade_tags as { tags: unknown }[] | null) ?? [];
  return { ...raw, tags: tt.map(t => t.tags).filter(Boolean), trade_tags: undefined };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const body: NewExitInput = await req.json();

  // Fetch current trade
  const { data: trade, error: tradeErr } = await supabase
    .from('trades')
    .select('*, instruments(point_value)')
    .eq('id', params.id)
    .single();

  if (tradeErr || !trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });

  // Fetch instrument point value
  const { data: instrument } = await supabase
    .from('instruments')
    .select('point_value')
    .eq('symbol', trade.symbol)
    .single();

  const pointValue = instrument?.point_value ?? 1;
  const dirMultiplier = trade.direction === 'long' ? 1 : -1;
  const pnl = (body.exit_price - trade.entry_price) * body.size * pointValue * dirMultiplier;

  const newRemaining = Math.max(0, trade.remaining_size - body.size);
  const newGrossPnl = trade.gross_pnl + pnl;
  const newNetPnl = newGrossPnl - trade.fees;
  const isClosed = newRemaining <= 0;

  // Insert exit
  const { error: exitErr } = await supabase.from('exits').insert({
    trade_id: params.id,
    exit_price: body.exit_price,
    size: body.size,
    exit_date: body.exit_date,
    pnl,
    notes: body.notes ?? '',
  });

  if (exitErr) return NextResponse.json({ error: exitErr.message }, { status: 500 });

  // Update trade
  await supabase.from('trades').update({
    remaining_size: newRemaining,
    gross_pnl: newGrossPnl,
    net_pnl: newNetPnl,
    status: isClosed ? 'closed' : 'open',
    closed_at: isClosed ? new Date().toISOString() : null,
  }).eq('id', params.id);

  const { data: full } = await supabase
    .from('trades')
    .select('*, exits(*), trade_tags(tags(*))')
    .eq('id', params.id)
    .single();

  return NextResponse.json(transformTrade(full as Record<string, unknown>), { status: 201 });
}
