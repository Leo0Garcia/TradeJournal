import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const body = await req.json();

  const { error: nameErr } = await supabase
    .from('account_groups')
    .update({ name: body.name })
    .eq('id', params.id);
  if (nameErr) return NextResponse.json({ error: nameErr.message }, { status: 500 });

  if (Array.isArray(body.account_ids)) {
    // Replace members entirely
    await supabase.from('account_group_members').delete().eq('group_id', params.id);
    if (body.account_ids.length > 0) {
      await supabase.from('account_group_members').insert(
        body.account_ids.map((account_id: string) => ({ group_id: params.id, account_id }))
      );
    }
  }

  const { data, error } = await supabase
    .from('account_groups')
    .select('*, account_group_members(account_id)')
    .eq('id', params.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ...data,
    account_ids: (data.account_group_members as { account_id: string }[]).map(m => m.account_id),
    account_group_members: undefined,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { error } = await supabase.from('account_groups').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
