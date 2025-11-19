export interface Asset {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  value: number;
  change: number;
  icon?: string;
}

export interface Trade {
  id: string;
  asset: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  total: number;
}

export interface Notification {
  id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  icon?: string;
}

export type SupabaseUser = {
  id: string;
  display_name: string;
  avatar_url: string;
  initial_balance: number;
  created_at: string;
};

export type SupabasePortfolio = {
  id: string;
  user_id: string;
  total_value: number;
  initial_balance: number;
  updated_at: string;
};

export type SupabasePortfolioAsset = {
  id: string;
  portfolio_id: string;
  symbol: string;
  quantity: number;
  avg_buy_price: number;
  created_at: string;
  updated_at: string;
};

export type SupabaseTrade = {
  id: string;
  portfolio_id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
};

export type SupabaseAlert = {
  id: string;
  user_id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  read: boolean;
  created_at: string;
};

export type SupabasePriceCache = {
  id: string;
  symbol: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  updated_at: string;
};