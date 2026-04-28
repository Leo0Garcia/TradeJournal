import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH — link a Tradovate connection to a journal account
export async function PATCH(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { account_id } = await req.json();

  const { data, error } = await supabase
    .from('tradovate_connections')
    .update({ account_id, is_active: !!account_id })
    .eq('id', params.connectionId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — remove a single connection
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('tradovate_connections')
    .delete()
    .eq('id', params.connectionId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
