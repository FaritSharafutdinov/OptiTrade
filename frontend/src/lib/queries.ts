import { useQuery } from '@tanstack/react-query';
import { getBotStatus, getRecentTrades } from './api';

export function useBotStatus() {
  return useQuery({
    queryKey: ['bot-status'],
    queryFn: getBotStatus,
    staleTime: 30_000,
  });
}

export function useRecentTrades(limit = 5) {
  return useQuery({
    queryKey: ['recent-trades', limit],
    queryFn: () => getRecentTrades(limit),
    staleTime: 15_000,
  });
}

