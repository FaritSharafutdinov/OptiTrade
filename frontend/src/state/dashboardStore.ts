import { create } from 'zustand';
import { BotStatus, TradeRecord } from '../lib/api';

interface DashboardState {
  botStatus: BotStatus | null;
  trades: TradeRecord[];
  setBotStatus: (status: BotStatus | null) => void;
  setTrades: (trades: TradeRecord[]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  botStatus: null,
  trades: [],
  setBotStatus: (status) => set({ botStatus: status }),
  setTrades: (trades) => set({ trades }),
}));

