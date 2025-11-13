import { RotateCcw } from 'lucide-react';

export default function TradeHistory() {
  return (
    <div className="flex-1 bg-[#0a0f1e] p-8 overflow-auto">
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold mb-2">История Торгов</h1>
        <p className="text-gray-400">Полная история всех торговых операций агента</p>
      </div>

      <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center" style={{ minHeight: '500px' }}>
        <RotateCcw className="w-20 h-20 text-pink-500 mb-6" />
        <p className="text-gray-300 text-lg mb-2">История сделок загружается...</p>
        <p className="text-gray-500 text-sm">Подождите, пока система обработает данные</p>
      </div>
    </div>
  );
}
