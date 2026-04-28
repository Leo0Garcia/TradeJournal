export type TradovateEnvironment = 'live' | 'demo';

const BASE_URLS: Record<TradovateEnvironment, string> = {
  live: 'https://live.tradovateapi.com/v1',
  demo: 'https://live-api-d.tradovate.com/v1',
};

const OAUTH_AUTHORIZE_URLS: Record<TradovateEnvironment, string> = {
  live: 'https://trader.tradovate.com/oauth',
  demo: 'https://trader-d.tradovate.com/oauth',
};

const OAUTH_TOKEN_URLS: Record<TradovateEnvironment, string> = {
  live: 'https://live.tradovateapi.com/auth/oauthtoken',
  demo: 'https://live-api-d.tradovate.com/auth/oauthtoken',
};

const CLIENT_ID = process.env.TRADOVATE_CLIENT_ID ?? '1';
const CLIENT_SECRET = process.env.TRADOVATE_CLIENT_SECRET ?? 'd369b9733404dabf4c0a1bf70ca7227769887d09d8d1d6cfa3f23326d6203297';

// Web app credentials — same for all users, embedded in Tradovate's JS bundle
const APP_ID = 'tradovate_trader(web)';
const APP_VERSION = '3.260424.1';

export interface TradovateTokenResponse {
  accessToken: string;
  expirationTime: string;
}

export interface TradovateAccount {
  id: number;
  name: string;
  userId: number;
  accountType: string;
  active: boolean;
}

export interface TradovateFill {
  id: number;
  contractId: number;
  orderId: number;
  timestamp: string;
  action: 'Buy' | 'Sell';
  qty: number;
  price: number;
  active: boolean;
  finallyPaired: number;
}

export interface TradovateContract {
  id: number;
  name: string;
  contractMaturityId: number;
  status: string;
}

// Strip expiry suffix: MNQH5 → MNQ, ESH25 → ES, GCJ5 → GC
export function baseSymbol(contractName: string): string {
  const match = /^(.+)[FGHJKMNQUVXZ]\d{1,2}$/.exec(contractName);
  return match ? match[1] : contractName;
}

export class TradovateClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string, environment: TradovateEnvironment = 'demo') {
    this.token = token;
    this.baseUrl = BASE_URLS[environment];
  }

  // ── Password auth ─────────────────────────────────────────────────────────

  static async authenticate(
    username: string,
    password: string,
    environment: TradovateEnvironment,
    deviceId: string,
  ): Promise<{ accessToken: string; expirationTime: string; mdAccessToken?: string }> {
    const url = `${BASE_URLS[environment]}/auth/accesstokenrequest`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: username,
        password,
        appId: APP_ID,
        appVersion: APP_VERSION,
        cid: CLIENT_ID,
        sec: CLIENT_SECRET,
        deviceId,
      }),
    });

    const data = await res.json();

    // Tradovate returns p-ticket (captcha required) or o-ticket (MFA) in some flows
    if (data['p-ticket'] || data['o-ticket']) {
      throw new Error('Tradovate requires additional verification — try logging in via the Tradovate website first to clear any security check, then retry.');
    }
    if (!res.ok || data.errorText || !data.accessToken) {
      throw new Error(data.errorText ?? `Authentication failed (${res.status})`);
    }

    const expiresInMs = data.expirationTime
      ? new Date(data.expirationTime).getTime() - Date.now()
      : 3600 * 1000;

    return {
      accessToken: data.accessToken,
      expirationTime: new Date(Date.now() + expiresInMs).toISOString(),
      mdAccessToken: data.mdAccessToken ?? undefined,
    };
  }

  // ── OAuth helpers ──────────────────────────────────────────────────────────

  static getOAuthUrl(environment: TradovateEnvironment, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      state,
      scope: 'offline_access',   // request refresh token
    });
    return `${OAUTH_AUTHORIZE_URLS[environment]}?${params}`;
  }

  static async exchangeOAuthCode(
    code: string,
    redirectUri: string,
    environment: TradovateEnvironment
  ): Promise<{ accessToken: string; expirationTime: string; refreshToken?: string }> {
    const res = await fetch(OAUTH_TOKEN_URLS[environment], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error || !data.access_token) {
      throw new Error(data.error_description ?? data.error ?? `OAuth token exchange failed (${res.status})`);
    }
    const expiresInMs = (data.expires_in ?? 3600) * 1000;
    return {
      accessToken: data.access_token,
      expirationTime: new Date(Date.now() + expiresInMs).toISOString(),
      refreshToken: data.refresh_token ?? undefined,
    };
  }

  static async refreshOAuthToken(
    refreshToken: string,
    environment: TradovateEnvironment
  ): Promise<{ accessToken: string; expirationTime: string; refreshToken?: string }> {
    const res = await fetch(OAUTH_TOKEN_URLS[environment], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error || !data.access_token) {
      throw new Error(data.error_description ?? data.error ?? 'Token refresh failed');
    }
    const expiresInMs = (data.expires_in ?? 3600) * 1000;
    return {
      accessToken: data.access_token,
      expirationTime: new Date(Date.now() + expiresInMs).toISOString(),
      refreshToken: data.refresh_token ?? refreshToken, // some providers rotate it
    };
  }

  // ── API calls ──────────────────────────────────────────────────────────────

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new Error(`Tradovate API error ${res.status}: ${path}`);
    return res.json();
  }

  async getAccounts(): Promise<TradovateAccount[]> {
    return this.get<TradovateAccount[]>('/account/list');
  }

  async getContract(contractId: number): Promise<TradovateContract | null> {
    try {
      return await this.get<TradovateContract>('/contract/item', { id: String(contractId) });
    } catch {
      return null;
    }
  }

  async getFillsForAccount(_accountId: number): Promise<TradovateFill[]> {
    try {
      const fills = await this.get<TradovateFill[]>('/fill/list');
      return Array.isArray(fills) ? fills : [];
    } catch {
      return [];
    }
  }
}
