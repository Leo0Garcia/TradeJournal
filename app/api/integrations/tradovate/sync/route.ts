import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncConnection } from '@/lib/tradovate-sync';

export const maxDuration = 30;

// POST — manually trigger sync for a specific connection
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { connection_id } = await req.json();

  const { data: conn, error } = await supabase
    .from('tradovate_connections')
    .select('*')
    .eq('id', connection_id)
    .eq('user_id', user.id)
    .single();

  if (error || !conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });

  const result = await syncConnection(conn);
  return NextResponse.json(result);
}
