import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User as UserIcon, AlertCircle, Loader } from 'lucide-react';
import { signIn, signUp } from '../lib/auth';
import { useAuth } from '../components/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import PageTransition from '../components/PageTransition';

const loginSchema = z
  .object({
    mode: z.enum(['signin', 'signup']),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    displayName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'signup') {
      const value = data.displayName?.trim() ?? '';
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Name is required',
          path: ['displayName'],
        });
      } else if (value.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Name must be at least 2 characters',
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
        err instanceof Error ? err.message : 'Sign in error. Please check your credentials.'
      );
    }
  };

  return (
    <PageTransition className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-[#0a0f1e] dark:via-[#141b2d] dark:to-[#0a0f1e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl dark:bg-[#141b2d] dark:border-gray-800">
          <div className="flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <UserIcon className="w-7 h-7 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 text-center mb-2 dark:text-white">
            OptiTrade
          </h1>
          <p className="text-center text-sm mb-8 text-slate-500 dark:text-gray-400">
            {isSignUp ? 'Create an account' : 'Sign in to your account'}
          </p>

          {demoMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-700 dark:bg-blue-600/10 dark:border-blue-600 dark:text-blue-200">
              Demo mode is active without Supabase. You can skip authentication and view the
              interface directly.
            </div>
          )}

          {serverError && (
            <div
              className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3 text-red-700 dark:bg-red-600/10 dark:border-red-600 dark:text-red-500"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{serverError}</p>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register('mode')} />

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                  Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400 dark:text-gray-500" />
                  <input
                    type="text"
                    {...form.register('displayName')}
                    placeholder="Your name"
                    className={`w-full rounded-lg border bg-white pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-all dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                      form.formState.errors.displayName
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600 dark:border-gray-700'
                    }`}
                    aria-invalid={!!form.formState.errors.displayName}
                    aria-describedby={
                      form.formState.errors.displayName ? 'displayName-error' : undefined
                    }
                  />
                </div>
                {form.formState.errors.displayName && (
                  <p className="text-xs mt-1 text-red-600 dark:text-red-400" id="displayName-error">
                    {form.formState.errors.displayName.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400 dark:text-gray-500" />
                <input
                  type="email"
                  {...form.register('email')}
                  placeholder="your@email.com"
                  className={`w-full rounded-lg border bg-white pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-all dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                    form.formState.errors.email
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600 dark:border-gray-700'
                  }`}
                  aria-invalid={!!form.formState.errors.email}
                  aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-xs mt-1 text-red-600 dark:text-red-400" id="email-error">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400 dark:text-gray-500" />
                <input
                  type="password"
                  {...form.register('password')}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border bg-white pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-all dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                    form.formState.errors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600 dark:border-gray-700'
                  }`}
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-xs mt-1 text-red-600 dark:text-red-400" id="password-error">
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
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>

            {demoMode && (
              <button
                type="button"
                onClick={() => {
                  loginAsDemo();
                  navigate('/dashboard', { replace: true });
                }}
                className="w-full mt-3 border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 rounded-lg py-3 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-200 dark:border-gray-600 dark:text-gray-200 dark:hover:text-white dark:hover:border-white"
              >
                Enter Demo Mode
              </button>
            )}
          </form>

          <p className="text-center text-sm mt-6 text-slate-500 dark:text-gray-400">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-600 hover:text-blue-500 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 rounded"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white/80 p-4 text-center dark:border-gray-700 dark:bg-gray-800/30">
            <p className="text-sm mb-1 text-slate-500 dark:text-gray-400">Initial Balance</p>
            <p className="font-bold text-slate-900 dark:text-white">$10,000</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white/80 p-4 text-center dark:border-gray-700 dark:bg-gray-800/30">
            <p className="text-sm mb-1 text-slate-500 dark:text-gray-400">Demo Account</p>
            <p className="font-bold text-slate-900 dark:text-white">Real Data</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white/80 p-4 text-center dark:border-gray-700 dark:bg-gray-800/30">
            <p className="text-sm mb-1 text-slate-500 dark:text-gray-400">API</p>
            <p className="font-bold text-slate-900 dark:text-white">Live</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
