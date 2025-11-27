// API Base Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Error handling
export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown, options?: { cause?: unknown }) {
    super(message, options);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
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

// ========== Type Definitions ==========

export type TradeRecord = {
  id: number;
  timestamp: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  size: number;
  fee: number;
  pnl?: number | null;
};

export type BotStatus = {
  running: boolean;
  balance: number;
  unrealized_pnl: number;
  realized_pnl: number;
  mode: string;
  open_positions: Array<{
    symbol: string;
    size: number;
    avg_price: number;
  }>;
  last_action: Record<string, unknown> | null;
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
  status: string;
  model: string;
};

export type PortfolioAsset = {
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  updated_at: string;
};

export type PortfolioData = {
  total_value: number;
  assets: PortfolioAsset[];
  unrealized_pnl: number;
};

export type BacktestParams = {
  start_date: string;
  end_date: string;
  initial_balance: number;
  symbols: string[];
  strategy_params?: Record<string, unknown>;
  model_type?: string;
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

export type Backtest = {
  id: number;
  created_at: string;
  params: BacktestParams;
  metrics: BacktestMetrics;
  equity_curve?: number[];
};

export type BotConfig = {
  max_position_size?: number;
  risk_per_trade?: number;
  symbols?: string[];
  mode?: string;
  stop_loss_percent?: number;
  take_profit_percent?: number;
  max_daily_loss?: number;
};

export type StartBotRequest = {
  mode?: 'paper' | 'live';
};

export type BacktestRunRequest = {
  start_date: string;
  end_date: string;
  initial_balance?: number;
  symbols?: string[];
  strategy_params?: Record<string, unknown>;
};

export type ModelInfo = {
  type: string;
  available: boolean;
  loaded: boolean;
  active: boolean;
  path: string | null;
};

export type ModelsListResponse = {
  available_models: ModelInfo[];
  active_model: string | null;
  total_loaded: number;
};

// ========== API Functions ==========

export async function getBotStatus() {
  return fetchJSON<BotStatus>('/bot/status');
}

export async function getRecentTrades(limit = 100, offset = 0, symbol?: string) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (symbol) {
    params.append('symbol', symbol);
  }
  return fetchJSON<TradeRecord[]>(`/trades?${params.toString()}`);
}

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

// ========== Model Management API ==========

export async function listModels() {
  return fetchJSON<ModelsListResponse>('/model/list');
}

export async function switchModel(modelType: string, apiKey: string) {
  return fetchJSON<{ status: string; message: string; active_model: string }>('/model/switch', {
    method: 'POST',
    body: JSON.stringify({ model_type: modelType }),
    headers: {
      'X-API-Key': apiKey,
    },
  });
}

export async function loadModel(modelType: string, apiKey: string) {
  return fetchJSON<{ status: string; message: string; loaded_models: string[] }>('/model/load', {
    method: 'POST',
    body: JSON.stringify({ model_type: modelType }),
    headers: {
      'X-API-Key': apiKey,
    },
  });
}

// ========== Risk Management API ==========

export type RiskLimits = {
  max_position_size: number;
  max_daily_loss: number;
  max_risk_per_trade: number;
  stop_loss_percent: number;
  take_profit_percent: number;
};

export type DailyRiskStats = {
  daily_pnl: number;
  trades_today: number;
  last_reset_date: string;
};

export type RiskStats = {
  limits: RiskLimits;
  daily_stats: DailyRiskStats;
  should_stop_trading: boolean;
};

export async function getRiskStats() {
  return fetchJSON<RiskStats>('/risk/stats');
}

// ========== Model Performance API ==========

export type ModelPerformanceData = {
  overall_stats: {
    total_models_tracked: number;
    total_trades_across_models: number;
    total_pnl_across_models: number;
    last_updated: string;
  };
  model_details: Array<{
    model_type: string;
    total_trades: number;
    winning_trades: number;
    win_rate: number;
    total_pnl: number;
    sharpe_ratio: number;
    last_updated: string | null;
  }>;
};

export async function getModelsPerformance() {
  return fetchJSON<ModelPerformanceData>('/models/performance');
}
