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
