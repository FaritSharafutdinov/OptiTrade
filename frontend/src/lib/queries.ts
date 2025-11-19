import { useQuery } from '@tanstack/react-query';
import { getBotStatus, getRecentTrades } from './api';
import { useDashboardStore } from '../state/dashboardStore';

export function useBotStatus() {
  const setBotStatus = useDashboardStore((state) => state.setBotStatus);

  return useQuery({
    queryKey: ['bot-status'],
    queryFn: getBotStatus,
    staleTime: 30_000,
    onSuccess: (data) => setBotStatus(data),
  });
}

export function useRecentTrades(limit = 5) {
  const setTrades = useDashboardStore((state) => state.setTrades);

  return useQuery({
    queryKey: ['recent-trades', limit],
    queryFn: () => getRecentTrades(limit),
    staleTime: 15_000,
    onSuccess: (data) => setTrades(data),
  });
}

