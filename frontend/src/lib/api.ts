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
      const text = await response.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }

      const message =
        (typeof body === 'object' && body && 'detail' in body && typeof body.detail === 'string'
          ? body.detail
          : undefined) || response.statusText || 'Request failed';

      throw new ApiError(message, response.status, body);
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

export async function getRecentTrades(limit = 5) {
  const search = new URLSearchParams({ limit: limit.toString() });
  return fetchJSON<TradeRecord[]>(`/trades?${search.toString()}`);
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

