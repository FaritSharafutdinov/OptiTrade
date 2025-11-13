import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  display_name: string;
  avatar_url: string;
  initial_balance: number;
  created_at: string;
};

export type Portfolio = {
  id: string;
  user_id: string;
  total_value: number;
  initial_balance: number;
  updated_at: string;
};

export type PortfolioAsset = {
  id: string;
  portfolio_id: string;
  symbol: string;
  quantity: number;
  avg_buy_price: number;
  created_at: string;
  updated_at: string;
};

export type Trade = {
  id: string;
  portfolio_id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
};

export type Alert = {
  id: string;
  user_id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  read: boolean;
  created_at: string;
};

export type PriceCache = {
  id: string;
  symbol: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  updated_at: string;
};
