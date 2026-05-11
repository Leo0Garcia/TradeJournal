import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function transformTrade(raw: Record<string, unknown>) {
  const tt = (raw.trade_tags as { tags: unknown }[] | null) ?? [];
  return { ...raw, tags: tt.map(t => t.tags).filter(Boolean), trade_tags: undefined };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('trades')
    .select('*, exits(*), trade_tags(tags(*))')
    .eq('id', params.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(transformTrade(data as Record<string, unknown>));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const body = await req.json();

  if (body.tag_ids !== undefined) {
    await supabase.from('trade_tags').delete().eq('trade_id', params.id);
    if (body.tag_ids.length > 0) {
      await supabase.from('trade_tags').insert(
        body.tag_ids.map((tag_id: string) => ({ trade_id: params.id, tag_id }))
      );
    }
  }

  const directFields = ['notes', 'emotion_before', 'emotion_during', 'emotion_after', 'followed_rules', 'psychology_notes'];
  const updates: Record<string, unknown> = {};
  for (const f of directFields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }
  if (Object.keys(updates).length > 0) {
    await supabase.from('trades').update(updates).eq('id', params.id);
  }

  const { data } = await supabase
    .from('trades')
    .select('*, exits(*), trade_tags(tags(*))')
    .eq('id', params.id)
    .single();
  return NextResponse.json(transformTrade(data as Record<string, unknown>));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  await supabase.from('trades').delete().eq('id', params.id);
  return NextResponse.json({ ok: true });
}
