import { useState } from 'react';
import { Mail, Lock, User as UserIcon, AlertCircle, Loader } from 'lucide-react';
import { signIn, signUp } from '../lib/auth';

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName) {
          setError('Пожалуйста, введите имя');
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ошибка при входе. Проверьте учетные данные.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#141b2d] to-[#0a0f1e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#141b2d] border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <UserIcon className="w-7 h-7 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-2">
            OptiTrade
          </h1>
          <p className="text-gray-400 text-center text-sm mb-8">
            {isSignUp ? 'Создайте учетную запись' : 'Войдите в свой аккаунт'}
          </p>

          {error && (
            <div className="bg-red-600/10 border border-red-600 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Имя
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ваше имя"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {isSignUp ? 'Создать аккаунт' : 'Войти'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            {isSignUp ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-blue-500 hover:text-blue-400 font-semibold transition-colors"
            >
              {isSignUp ? 'Войдите' : 'Зарегистрируйтесь'}
            </button>
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">Начальный баланс</p>
            <p className="text-white font-bold">$10,000</p>
          </div>
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">Демо счет</p>
            <p className="text-white font-bold">Реальные данные</p>
          </div>
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">API</p>
            <p className="text-white font-bold">Live</p>
          </div>
        </div>
      </div>
    </div>
  );
}
