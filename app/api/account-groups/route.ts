import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  // Fetch groups with their member account IDs
  const { data: groups, error } = await supabase
    .from('account_groups')
    .select('*, account_group_members(account_id)')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (groups ?? []).map(g => ({
    ...g,
    account_ids: (g.account_group_members as { account_id: string }[]).map(m => m.account_id),
    account_group_members: undefined,
  }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { data: group, error } = await supabase
    .from('account_groups')
    .insert({ user_id: user.id, name: body.name })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert initial members if provided
  if (body.account_ids?.length) {
    await supabase.from('account_group_members').insert(
      body.account_ids.map((account_id: string) => ({ group_id: group.id, account_id }))
    );
  }
  return NextResponse.json({ ...group, account_ids: body.account_ids ?? [] }, { status: 201 });
}
