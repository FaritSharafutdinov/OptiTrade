import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 text-slate-700 dark:border-gray-700 dark:text-gray-100 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      aria-pressed={isDark}
    >
      <div className="flex items-center gap-3">
        {isDark ? <Moon className="w-5 h-5" aria-hidden="true" /> : <Sun className="w-5 h-5" aria-hidden="true" />}
        <span className="text-sm font-medium">{isDark ? 'Dark Theme' : 'Light Theme'}</span>
      </div>
      <span className="text-xs text-slate-500 dark:text-gray-400">{isDark ? 'On' : 'Off'}</span>
    </button>
  );
}

