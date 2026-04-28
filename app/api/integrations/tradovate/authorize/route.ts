import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TradovateClient, TradovateEnvironment } from '@/lib/tradovate';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const env = req.nextUrl.searchParams.get('environment') === 'live' ? 'live' : 'demo' as TradovateEnvironment;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const redirectUri = `${appUrl}/api/integrations/tradovate/callback`;

  const oauthUrl = TradovateClient.getOAuthUrl(env, redirectUri, env);
  return NextResponse.redirect(oauthUrl);
}
