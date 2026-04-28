import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const body = await req.json();
  const isFunded = (body.account_type ?? 'live') === 'funded';

  const { data, error } = await supabase
    .from('accounts')
    .update({
      name: body.name,
      broker: body.broker ?? null,
      description: body.description ?? null,
      currency: body.currency ?? 'USD',
      account_type: body.account_type ?? 'live',
      account_size: body.account_size ? parseFloat(String(body.account_size)) : null,
      ...challengeFields(body, isFunded),
      // Allow explicit disable/enable and challenge_passed via PATCH
      ...(body.is_disabled !== undefined ? { is_disabled: body.is_disabled } : {}),
      ...(body.challenge_passed !== undefined ? { challenge_passed: body.challenge_passed, is_challenge: false } : {}),
    })
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { error } = await supabase.from('accounts').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
