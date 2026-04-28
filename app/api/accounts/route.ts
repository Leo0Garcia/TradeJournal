import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

function challengeFields(body: Record<string, unknown>, isFunded: boolean) {
  if (!isFunded) return { is_challenge: false, profit_target: null, daily_loss_limit: null, total_loss_limit: null };
  const isChallenge = !!body.is_challenge;
  return {
    is_challenge: isChallenge,
    profit_target: isChallenge && body.profit_target ? parseFloat(String(body.profit_target)) : null,
    daily_loss_limit: isChallenge && body.daily_loss_limit ? parseFloat(String(body.daily_loss_limit)) : null,
    total_loss_limit: isChallenge && body.total_loss_limit ? parseFloat(String(body.total_loss_limit)) : null,
  };
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const isFunded = (body.account_type ?? 'live') === 'funded';

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      name: body.name,
      broker: body.broker ?? null,
      description: body.description ?? null,
      currency: body.currency ?? 'USD',
      account_type: body.account_type ?? 'live',
      account_size: body.account_size ? parseFloat(String(body.account_size)) : null,
      ...challengeFields(body, isFunded),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
