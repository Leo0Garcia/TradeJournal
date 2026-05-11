export type Direction = 'long' | 'short';
export type TradeStatus = 'open' | 'closed';
export type AccountType = 'live' | 'funded' | 'demo';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Instrument {
  symbol: string;
  name: string;
  category: 'futures' | 'crypto' | 'forex' | 'stock';
  point_value: number;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  broker: string | null;
  description: string | null;
  currency: string;
  account_type: AccountType;
  account_size: number | null;
  // Challenge/eval fields (funded accounts only)
  is_challenge: boolean;
  profit_target: number | null;
  daily_loss_limit: number | null;
  total_loss_limit: number | null;
  is_disabled: boolean;
  challenge_passed: boolean;
  created_at: string;
}

export interface TradovateConnection {
  id: string;
  user_id: string;
  account_id: string | null;
  tradovate_account_id: number | null;
  tradovate_account_name: string | null;
  environment: 'live' | 'demo';
  is_active: boolean;
  last_sync_at: string | null;
  sync_error: string | null;
  last_fill_id: number;
}

export interface Exit {
  id: string;
  trade_id: string;
  exit_price: number;
  size: number;
  exit_date: string;
  pnl: number;
  notes: string;
  created_at: string;
}

export interface Trade {
  id: string;
  account_id: string | null;
  account?: Account | null;
  symbol: string;
  direction: Direction;
  status: TradeStatus;
  trade_date: string;
  entry_price: number;
  initial_size: number;
  remaining_size: number;
  stop_loss: number | null;
  take_profit: number | null;
  notes: string;
  emotion_before: string | null;
  emotion_during: string | null;
  emotion_after: string | null;
  followed_rules: boolean | null;
  psychology_notes: string | null;
  gross_pnl: number;
  fees: number;
  net_pnl: number;
  created_at: string;
  closed_at: string | null;
  tags: Tag[];
  exits: Exit[];
}

export interface DashboardStats {
  todayPnl: number;
  todayTrades: number;
  todayWins: number;
  weekPnl: number;
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  avgRR: number;
  largestWin: number;
  largestLoss: number;
  currentDrawdown: number;
  maxDrawdown: number;
  openTrades: number;
}

export interface NewTradeInput {
  account_id?: string;
  symbol: string;
  direction: Direction;
  trade_date: string;
  entry_price: number;
  initial_size: number;
  stop_loss?: number;
  take_profit?: number;
  notes?: string;
  fees?: number;
  tag_ids?: string[];
}

export interface NewExitInput {
  exit_price: number;
  size: number;
  exit_date: string;
  notes?: string;
  pnl_override?: number;
}

export interface PnLByTicker {
  symbol: string;
  pnl: number;
  trades: number;
  wins: number;
}

export interface PnLByDay {
  date: string;
  pnl: number;
  cumulative: number;
}

export interface TagPerformance {
  tag: Tag;
  trades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
}

// Account selection: a specific account or all accounts of a given type
export type AccountSelection =
  | { type: 'account'; id: string }
  | { type: 'account_type'; accountType: AccountType };
