import { useState } from 'react';
import { Mail, Lock, User as UserIcon, AlertCircle, Loader } from 'lucide-react';
import { signIn, signUp } from '../lib/auth';
import { useAuth } from '../components/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

interface LoginProps {
  onSuccess: () => void;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  displayName?: string;
}

export default function Login({ onSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const { loginAsDemo } = useAuth();
  const demoMode = !isSupabaseConfigured;

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePassword(password: string): boolean {
    return password.length >= 6;
  }

  function validateForm(): boolean {
    const errors: ValidationErrors = {};

    if (!email.trim()) {
      errors.email = 'Email обязателен';
    } else if (!validateEmail(email)) {
      errors.email = 'Введите корректный email';
    }

    if (!password) {
      errors.password = 'Пароль обязателен';
    } else if (!validatePassword(password)) {
      errors.password = 'Пароль должен содержать минимум 6 символов';
    }

    if (isSignUp) {
      if (!displayName.trim()) {
        errors.displayName = 'Имя обязательно';
      } else if (displayName.trim().length < 2) {
        errors.displayName = 'Имя должно содержать минимум 2 символа';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
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

          {demoMode && (
            <div className="bg-blue-600/10 border border-blue-600 rounded-lg p-4 mb-6 text-sm text-blue-200">
              Запущен демо-режим без Supabase. Вы можете пропустить авторизацию и сразу посмотреть интерфейс.
            </div>
          )}

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
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (validationErrors.displayName) {
                        setValidationErrors((prev) => ({ ...prev, displayName: undefined }));
                      }
                    }}
                    placeholder="Ваше имя"
                    className={`w-full bg-gray-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                      validationErrors.displayName
                        ? 'border-red-600 focus:border-red-600 focus:ring-red-600'
                        : 'border-gray-700 focus:border-blue-600 focus:ring-blue-600'
                    }`}
                  />
                </div>
                {validationErrors.displayName && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.displayName}</p>
                )}
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) {
                      setValidationErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="your@email.com"
                  className={`w-full bg-gray-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                    validationErrors.email
                      ? 'border-red-600 focus:border-red-600 focus:ring-red-600'
                      : 'border-gray-700 focus:border-blue-600 focus:ring-blue-600'
                  }`}
                />
              </div>
              {validationErrors.email && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
              )}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) {
                      setValidationErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="••••••••"
                  className={`w-full bg-gray-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                    validationErrors.password
                      ? 'border-red-600 focus:border-red-600 focus:ring-red-600'
                      : 'border-gray-700 focus:border-blue-600 focus:ring-blue-600'
                  }`}
                />
              </div>
              {validationErrors.password && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {isSignUp ? 'Создать аккаунт' : 'Войти'}
            </button>

          {demoMode && (
            <button
              type="button"
              onClick={() => {
                loginAsDemo();
                onSuccess();
              }}
              className="w-full mt-3 border border-gray-600 text-gray-200 hover:text-white hover:border-white rounded-lg py-3 transition-all"
            >
              Войти в демо-режиме
            </button>
          )}
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            {isSignUp ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setValidationErrors({});
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
