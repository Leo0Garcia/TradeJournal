import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST is no longer used — connections are made via OAuth (/api/integrations/tradovate/authorize)
export async function POST() {
  return NextResponse.json({ error: 'Use the OAuth flow instead' }, { status: 410 });
}

// DELETE — remove all connections for this user
export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('tradovate_connections').delete().eq('user_id', user.id);
  return new NextResponse(null, { status: 204 });
}
