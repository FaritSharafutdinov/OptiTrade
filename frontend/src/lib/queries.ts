import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getBotStatus,
  getRecentTrades,
  startBot,
  stopBot,
  updateBotConfig,
  getDashboardData,
  getPortfolioData,
  getNotifications,
  getBacktests,
  getBacktest,
  runBacktest,
  getMarketAnalysis,
  type BotConfig,
  type StartBotRequest,
  type BacktestRunRequest,
} from './api';
import { useDashboardStore } from '../state/dashboardStore';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from './api';

export function useBotStatus() {
  const setBotStatus = useDashboardStore((state) => state.setBotStatus);
  const query = useQuery({
    queryKey: ['bot-status'],
    queryFn: getBotStatus,
    staleTime: 30_000,
    refetchInterval: 10_000, // Auto-refresh every 10 seconds
  });

  useEffect(() => {
    if (query.data) {
      setBotStatus(query.data);
    }
  }, [query.data, setBotStatus]);

  return query;
}

export function useRecentTrades(limit = 5, offset = 0, symbol?: string) {
  const setTrades = useDashboardStore((state) => state.setTrades);
  const query = useQuery({
    queryKey: ['recent-trades', limit, offset, symbol],
    queryFn: () => getRecentTrades(limit, offset, symbol),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (query.data) {
      setTrades(query.data);
    }
  }, [query.data, setTrades]);

  return query;
}

export function useStartBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request, apiKey }: { request?: StartBotRequest; apiKey: string }) =>
      startBot(request, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-status'] });
      toast.success('Bot started successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useStopBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (apiKey: string) => stopBot(apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-status'] });
      toast.success('Bot stopped successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateBotConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ config, apiKey }: { config: BotConfig; apiKey: string }) =>
      updateBotConfig(config, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-status'] });
      toast.success('Bot configuration updated');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: getDashboardData,
    staleTime: 10_000,
    refetchInterval: 10_000, // Auto-refresh every 10 seconds
    retry: 2,
    retryDelay: 1000,
  });
}

export function usePortfolioData() {
  return useQuery({
    queryKey: ['portfolio-data'],
    queryFn: getPortfolioData,
    staleTime: 15_000,
    refetchInterval: 15_000, // Auto-refresh every 15 seconds
    retry: 2,
    retryDelay: 1000,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 30_000,
  });
}

export function useBacktests(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['backtests', limit, offset],
    queryFn: () => getBacktests(limit, offset),
    staleTime: 60_000,
  });
}

export function useBacktest(id: number) {
  return useQuery({
    queryKey: ['backtest', id],
    queryFn: () => getBacktest(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useRunBacktest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ request, apiKey }: { request: BacktestRunRequest; apiKey: string }) =>
      runBacktest(request, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backtests'] });
      toast.success('Backtest started successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to run backtest: ${getErrorMessage(error)}`);
    },
  });
}

export function useMarketAnalysis() {
  return useQuery({
    queryKey: ['market-analysis'],
    queryFn: getMarketAnalysis,
    staleTime: 30_000,
    refetchInterval: 30_000, // Auto-refresh every 30 seconds
  });
}
