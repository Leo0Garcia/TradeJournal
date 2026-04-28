import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TradovateClient, TradovateEnvironment } from '@/lib/tradovate';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error_description') ?? req.nextUrl.searchParams.get('error');

  const settingsUrl = new URL('/settings', req.url);

  if (!code) {
    settingsUrl.searchParams.set('tv_error', oauthError ?? 'Tradovate authorisation was cancelled');
    return NextResponse.redirect(settingsUrl);
  }

  const env = (state === 'live' ? 'live' : 'demo') as TradovateEnvironment;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const redirectUri = `${appUrl}/api/integrations/tradovate/callback`;

  let auth;
  try {
    auth = await TradovateClient.exchangeOAuthCode(code, redirectUri, env);
  } catch (err) {
    settingsUrl.searchParams.set('tv_error', err instanceof Error ? err.message : 'Token exchange failed');
    return NextResponse.redirect(settingsUrl);
  }

  const client = new TradovateClient(auth.accessToken, env);
  let tradovateAccounts;
  try {
    tradovateAccounts = await client.getAccounts();
  } catch {
    settingsUrl.searchParams.set('tv_error', 'Connected but failed to fetch accounts — try again');
    return NextResponse.redirect(settingsUrl);
  }

  if (!tradovateAccounts?.length) {
    settingsUrl.searchParams.set('tv_error', 'No Tradovate accounts found on this account');
    return NextResponse.redirect(settingsUrl);
  }

  const rows = tradovateAccounts.map(a => ({
    user_id: user.id,
    environment: env,
    tradovate_account_id: a.id,
    tradovate_account_name: a.name,
    access_token: auth.accessToken,
    token_expires_at: auth.expirationTime,
    refresh_token: auth.refreshToken ?? null,
    encrypted_username: '',
    encrypted_password: '',
    device_id: '',
    is_active: false,
  }));

  const { error } = await supabase
    .from('tradovate_connections')
    .upsert(rows, { onConflict: 'user_id,tradovate_account_id', ignoreDuplicates: false });

  if (error) {
    settingsUrl.searchParams.set('tv_error', error.message);
    return NextResponse.redirect(settingsUrl);
  }

  settingsUrl.searchParams.set('tv_connected', '1');
  return NextResponse.redirect(settingsUrl);
}
