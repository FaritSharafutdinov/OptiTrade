import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="flex-1 bg-[#0a0f1e] p-8 overflow-auto">
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold mb-2">Настройки Агента</h1>
        <p className="text-gray-400">Конфигурация параметров торгового агента OptiTrade</p>
      </div>

      <div className="bg-[#141b2d] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center" style={{ minHeight: '500px' }}>
        <SettingsIcon className="w-20 h-20 text-gray-500 mb-6" />
        <p className="text-gray-300 text-lg mb-2">Настройки загружаются...</p>
        <p className="text-gray-500 text-sm">Инициализация панели конфигурации</p>
      </div>
    </div>
  );
}
