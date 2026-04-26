export type Direction = 'long' | 'short';
export type TradeStatus = 'open' | 'closed';

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
