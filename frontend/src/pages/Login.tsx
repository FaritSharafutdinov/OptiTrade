import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User as UserIcon, AlertCircle, Loader } from 'lucide-react';
import { signIn, signUp } from '../lib/auth';
import { useAuth } from '../components/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

const loginSchema = z
  .object({
    mode: z.enum(['signin', 'signup']),
    email: z
      .string({ required_error: 'Email обязателен' })
      .min(1, 'Email обязателен')
      .email('Введите корректный email'),
    password: z
      .string({ required_error: 'Пароль обязателен' })
      .min(6, 'Пароль должен содержать минимум 6 символов'),
    displayName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'signup') {
      const value = data.displayName?.trim() ?? '';
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Имя обязательно',
          path: ['displayName'],
        });
      } else if (value.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Имя должно содержать минимум 2 символа',
          path: ['displayName'],
        });
      }
    }
  });

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const { loginAsDemo } = useAuth();
  const demoMode = !isSupabaseConfigured;

  const form = useForm<LoginFormValues>({
    mode: 'onChange',
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mode: 'signin',
      email: '',
      password: '',
      displayName: '',
    },
  });

  const mode = form.watch('mode');
  const isSignUp = mode === 'signup';

  const toggleMode = () => {
    const nextMode = isSignUp ? 'signin' : 'signup';
    form.setValue('mode', nextMode);
    if (nextMode === 'signin') {
      form.setValue('displayName', '');
    }
    setServerError('');
  };

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('');
    try {
      if (values.mode === 'signup') {
        await signUp(values.email, values.password, values.displayName?.trim() ?? '');
      } else {
        await signIn(values.email, values.password);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Ошибка при входе. Проверьте учетные данные.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#141b2d] to-[#0a0f1e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#141b2d] border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <UserIcon className="w-7 h-7 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-2">OptiTrade</h1>
          <p className="text-gray-400 text-center text-sm mb-8">
            {isSignUp ? 'Создайте учетную запись' : 'Войдите в свой аккаунт'}
          </p>

          {demoMode && (
            <div className="bg-blue-600/10 border border-blue-600 rounded-lg p-4 mb-6 text-sm text-blue-200">
              Запущен демо-режим без Supabase. Вы можете пропустить авторизацию и сразу посмотреть интерфейс.
            </div>
          )}

          {serverError && (
            <div className="bg-red-600/10 border border-red-600 rounded-lg p-4 mb-6 flex items-start gap-3" role="alert" aria-live="assertive">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-500 text-sm">{serverError}</p>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register('mode')} />

            {isSignUp && (
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Имя</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    {...form.register('displayName')}
                    placeholder="Ваше имя"
                    className={`w-full bg-gray-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                      form.formState.errors.displayName
                        ? 'border-red-600 focus:border-red-600 focus:ring-red-600'
                        : 'border-gray-700 focus:border-blue-600 focus:ring-blue-600'
                    }`}
                    aria-invalid={!!form.formState.errors.displayName}
                    aria-describedby={form.formState.errors.displayName ? 'displayName-error' : undefined}
                  />
                </div>
                {form.formState.errors.displayName && (
                  <p className="text-red-500 text-xs mt-1" id="displayName-error">
                    {form.formState.errors.displayName.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  {...form.register('email')}
                  placeholder="your@email.com"
                  className={`w-full bg-gray-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                    form.formState.errors.email
                      ? 'border-red-600 focus:border-red-600 focus:ring-red-600'
                      : 'border-gray-700 focus:border-blue-600 focus:ring-blue-600'
                  }`}
                  aria-invalid={!!form.formState.errors.email}
                  aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-red-500 text-xs mt-1" id="email-error">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  {...form.register('password')}
                  placeholder="••••••••"
                  className={`w-full bg-gray-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                    form.formState.errors.password
                      ? 'border-red-600 focus:border-red-600 focus:ring-red-600'
                      : 'border-gray-700 focus:border-blue-600 focus:ring-blue-600'
                  }`}
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-red-500 text-xs mt-1" id="password-error">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              {form.formState.isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
              {isSignUp ? 'Создать аккаунт' : 'Войти'}
            </button>

            {demoMode && (
              <button
                type="button"
                onClick={() => {
                  loginAsDemo();
                  navigate('/dashboard', { replace: true });
                }}
                className="w-full mt-3 border border-gray-600 text-gray-200 hover:text-white hover:border-white rounded-lg py-3 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-200"
              >
                Войти в демо-режиме
              </button>
            )}
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            {isSignUp ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-500 hover:text-blue-400 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 rounded"
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
