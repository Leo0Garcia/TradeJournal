import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; exitId: string } }
) {
  const supabase = createClient();
  const body = await req.json();

  // Update the exit record
  const { error: exitErr } = await supabase
    .from('exits')
    .update({
      exit_price: body.exit_price,
      size: body.size,
      pnl: body.pnl,
      notes: body.notes ?? '',
      exit_date: body.exit_date,
    })
    .eq('id', params.exitId)
    .eq('trade_id', params.id);

  if (exitErr) return NextResponse.json({ error: exitErr.message }, { status: 500 });

  // Recalculate trade totals from all exits
  const { data: exits } = await supabase
    .from('exits')
    .select('pnl, size')
    .eq('trade_id', params.id);

  const { data: trade } = await supabase
    .from('trades')
    .select('initial_size, fees')
    .eq('id', params.id)
    .single();

  if (exits && trade) {
    const grossPnl = exits.reduce((s: number, e: { pnl: number }) => s + parseFloat(String(e.pnl)), 0);
    const netPnl = grossPnl - (trade.fees ?? 0);
    const totalExited = exits.reduce((s: number, e: { size: number }) => s + e.size, 0);
    const remaining = Math.max(0, trade.initial_size - totalExited);

    await supabase.from('trades').update({
      gross_pnl: grossPnl,
      net_pnl: netPnl,
      remaining_size: remaining,
    }).eq('id', params.id);
  }

  // Return updated trade
  const { data: full } = await supabase
    .from('trades')
    .select('*, exits(*), trade_tags(tags(*))')
    .eq('id', params.id)
    .single();

  const tt = ((full as Record<string, unknown>)?.trade_tags as { tags: unknown }[] | null) ?? [];
  return NextResponse.json({ ...(full as object), tags: tt.map(t => t.tags).filter(Boolean), trade_tags: undefined });
}
