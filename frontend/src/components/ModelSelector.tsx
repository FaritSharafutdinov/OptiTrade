import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listModels, switchModel, type ModelsListResponse } from '../lib/api';

// API key для работы с моделями - должен совпадать с ADMIN_API_KEY в backend
const API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'devkey';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export default function ModelSelector() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: modelsData, isLoading } = useQuery<ModelsListResponse>({
    queryKey: ['models'],
    queryFn: listModels,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const switchMutation = useMutation({
    mutationFn: (modelType: string) => switchModel(modelType, API_KEY),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsOpen(false);
    },
  });

  const activeModel = modelsData?.active_model?.toUpperCase() || 'PPO';
  const availableModels = modelsData?.available_models || [];

  if (isLoading) {
    return (
      <div className="bg-slate-100/80 dark:bg-gray-800/50 rounded-lg p-3 border border-slate-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          <span className="text-xs text-slate-500 dark:text-gray-400">Loading models...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-slate-100/80 dark:bg-gray-800/50 rounded-lg p-3 border border-slate-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-500 dark:text-gray-400 text-xs">Active Model</span>
          <span className="text-green-600 dark:text-green-500 text-xs font-semibold">
            {availableModels.find((m) => m.active)?.loaded ? 'Loaded' : 'Not Loaded'}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between text-xs bg-white dark:bg-gray-900 rounded px-2 py-1.5 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-slate-900 dark:text-white font-medium">{activeModel} v1</span>
          <span className="text-slate-500 dark:text-gray-400">▼</span>
        </button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-gray-700 shadow-lg z-20 max-h-64 overflow-y-auto">
            <div className="p-2 space-y-1">
              {availableModels.map((model) => (
                <button
                  key={model.type}
                  onClick={() => {
                    if (model.available && !model.active) {
                      switchMutation.mutate(model.type.toLowerCase());
                    }
                  }}
                  disabled={!model.available || model.active || switchMutation.isPending}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                    model.active
                      ? 'bg-blue-600 text-white'
                      : model.available
                      ? 'hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-gray-600 cursor-not-allowed'
                  } ${switchMutation.isPending ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.type}</span>
                    {!model.loaded && model.available && (
                      <span className="text-xs text-slate-500 dark:text-gray-400">(will load)</span>
                    )}
                    {!model.available && (
                      <span className="text-xs text-red-500">(not found)</span>
                    )}
                  </div>
                  {model.active && <Check className="w-4 h-4" />}
                  {switchMutation.isPending && switchMutation.variables === model.type.toLowerCase() && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                </button>
              ))}
            </div>
            {switchMutation.isError && (
              <div className="p-2 border-t border-slate-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Failed to switch model</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

