import { supabase } from './supabase';
import { Portfolio, PortfolioAsset } from './supabase';

export async function getPortfolio(userId: string) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPortfolioAssets(portfolioId: string) {
  const { data, error } = await supabase
    .from('portfolio_assets')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTradeHistory(portfolioId: string, limit = 50) {
  const { data, error } = await supabase
    .from('trade_history')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getPortfolioStats(portfolioId: string) {
  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('*')
    .eq('id', portfolioId)
    .single();

  const { data: trades } = await supabase
    .from('trade_history')
    .select('*')
    .eq('portfolio_id', portfolioId);

  if (!portfolio || !trades) return null;

  const totalProfit = portfolio.total_value - portfolio.initial_balance;
  const profitPercent = (totalProfit / portfolio.initial_balance) * 100;

  const winTrades = trades.filter((t) => t.type === 'sell').length;
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

  return {
    totalValue: portfolio.total_value,
    initialBalance: portfolio.initial_balance,
    totalProfit,
    profitPercent,
    winRate,
    totalTrades,
  };
}
