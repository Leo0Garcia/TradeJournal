import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — return saved connection rows for this user (sans credentials)
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('tradovate_connections')
    .select('id, tradovate_account_id, tradovate_account_name, account_id, is_active, last_sync_at, sync_error, last_fill_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
