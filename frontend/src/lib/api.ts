export type BotStatus = {
  running: boolean;
  balance: number;
  unrealized_pnl: number;
  realized_pnl: number;
  open_positions: Array<{
    symbol?: string;
    size?: number;
    avg_price?: number;
  }>;
  last_action?: {
    action: string;
    timestamp: string;
  } | null;
  mode?: string;
};

export type TradeRecord = {
  id: number;
  timestamp: string;
  symbol: string;
  action: string;
  price: number;
  size: number;
  pnl?: number | null;
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown, options?: { cause?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  // Log API calls in development
  if (import.meta.env.DEV) {
    console.log(`[API] ${init?.method || 'GET'} ${url}`);
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      let body: unknown;
      const text = await response.text().catch(() => '');
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
      console.error(`[API Error] ${response.status} ${response.statusText}: ${url}`, body);

      const message =
        (typeof body === 'object' && body && 'detail' in body && typeof body.detail === 'string'
          ? body.detail
          : `API request failed: ${response.status} ${response.statusText}`) ||
        `API request failed: ${response.status} ${response.statusText}`;

      throw new ApiError(message, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to reach backend service', 0, null, { cause: error });
  }
}

export async function getBotStatus() {
  return fetchJSON<BotStatus>('/bot/status');
}

export async function getRecentTrades(limit = 5, offset = 0, symbol?: string) {
  const search = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  if (symbol) {
    search.append('symbol', symbol);
  }
  return fetchJSON<TradeRecord[]>(`/trades?${search.toString()}`);
}

export async function generateDemoTrades(apiKey: string) {
  return fetchJSON<{ status: string; count?: number; message?: string }>('/trades/generate-demo', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
    },
  });
}

export type BotConfig = {
  max_position_size?: number;
  risk_per_trade?: number;
  symbols?: string[];
  mode?: string;
};

export type DashboardData = {
  balance: number;
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  active_positions: number;
  positions_list: string[];
  chart_balance: { from: number; to: number };
  chart_pnl: { profit: number; loss: number };
  notifications: Array<{ type: 'warning' | 'success' | 'info'; text: string }>;
  uptime: string;
  status: 'active' | 'stopped';
  model: string;
};

export type PortfolioAsset = {
  symbol: string;
  name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  value: number;
  change_percent: number;
  unrealized_pnl: number;
};

export type PortfolioData = {
  total_value: number;
  assets_count: number;
  unrealized_pnl: number;
  free_cash: number;
  assets: PortfolioAsset[];
};

export type BacktestMetrics = {
  total_return: number;
  total_return_pct: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  total_trades: number;
  profit_factor: number;
  final_balance: number;
};

export type BacktestParams = {
  start_date: string;
  end_date: string;
  initial_balance: number;
  symbols?: string[];
  strategy_params?: Record<string, unknown>;
};

export type Backtest = {
  id: number;
  created_at: string;
  params: BacktestParams;
  metrics: BacktestMetrics;
};

export type BacktestRunRequest = {
  start_date: string;
  end_date: string;
  initial_balance?: number;
  symbols?: string[];
  strategy_params?: Record<string, unknown>;
};

export type StartBotRequest = {
  mode?: string;
};

export async function startBot(request: StartBotRequest = { mode: 'paper' }, apiKey: string) {
  return fetchJSON<{ status: string; mode: string }>('/bot/start', {
    method: 'POST',
    body: JSON.stringify(request),
    headers: {
      'X-API-Key': apiKey,
    },
  });
}

export async function stopBot(apiKey: string) {
  return fetchJSON<{ status: string }>('/bot/stop', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
    },
  });
}

export async function updateBotConfig(config: BotConfig, apiKey: string) {
  return fetchJSON<{ status: string; config_id: number }>('/bot/update-config', {
    method: 'POST',
    body: JSON.stringify(config),
    headers: {
      'X-API-Key': apiKey,
    },
  });
}

export async function getDashboardData() {
  return fetchJSON<DashboardData>('/dashboard');
}

export async function getPortfolioData() {
  return fetchJSON<PortfolioData>('/portfolio');
}

export async function getNotifications() {
  return fetchJSON<Array<{ type: 'warning' | 'success' | 'info'; text: string }>>('/notifications');
}

export async function getBacktests(limit = 20, offset = 0) {
  const search = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  return fetchJSON<Backtest[]>(`/backtests?${search.toString()}`);
}

export async function getBacktest(id: number) {
  return fetchJSON<Backtest>(`/backtest/${id}`);
}

export async function runBacktest(request: BacktestRunRequest, apiKey: string) {
  return fetchJSON<Backtest>('/backtest/run', {
    method: 'POST',
    body: JSON.stringify(request),
    headers: {
      'X-API-Key': apiKey,
    },
  });
}

export type MarketAsset = {
  symbol: string;
  price: number;
  change: number;
  volume: string;
  trend: 'up' | 'down';
};

export type MarketSignal = {
  type: 'bullish' | 'volatility' | 'entry';
  title: string;
  description: string;
};

export type MarketAnalysisData = {
  market_cap: string;
  market_cap_change: number;
  trading_volume_24h: string;
  trading_volume_change: number;
  btc_dominance: number;
  btc_dominance_change: number;
  assets: MarketAsset[];
  signals: MarketSignal[];
};

export async function getMarketAnalysis() {
  return fetchJSON<MarketAnalysisData>('/market/analysis');
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message || `Backend error (status ${error.status || 'unknown'})`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unexpected error';
}
