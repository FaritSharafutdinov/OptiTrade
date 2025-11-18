import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const looksLikePlaceholder = (value: string) => {
  const normalized = value.toLowerCase();
  return normalized.includes('placeholder') || normalized.includes('your-project');
};

const missingConfigMessage =
  'Supabase env vars are missing or still contain placeholder values. Add real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.';

const hasEnvValues = Boolean(supabaseUrl && supabaseAnonKey);
const envLooksValid = hasEnvValues && !looksLikePlaceholder(supabaseUrl) && !looksLikePlaceholder(supabaseAnonKey);
const isSupabaseConfigured = envLooksValid;

type DisabledResponse = { data: null; error: Error };

type DisabledQueryBuilder = PromiseLike<DisabledResponse> & {
  select: () => DisabledQueryBuilder;
  eq: () => DisabledQueryBuilder;
  order: () => DisabledQueryBuilder;
  limit: () => DisabledQueryBuilder;
  maybeSingle: () => Promise<DisabledResponse>;
  single: () => Promise<DisabledResponse>;
  insert: () => Promise<DisabledResponse>;
};

function createDisabledQueryBuilder(buildError: () => Error): DisabledQueryBuilder {
  const makeResponse = (): DisabledResponse => ({
    data: null,
    error: buildError(),
  });

  const builder: DisabledQueryBuilder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve(makeResponse()),
    single: () => Promise.resolve(makeResponse()),
    insert: () => Promise.resolve(makeResponse()),
    then: (onFulfilled, onRejected) => Promise.resolve(makeResponse()).then(onFulfilled, onRejected),
  };

  return builder;
}

function createDisabledSupabaseClient(): SupabaseClient {
  const buildError = () => new Error(missingConfigMessage);

  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: buildError() }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => undefined,
          },
        },
      }),
      signUp: () => Promise.reject(buildError()),
      signInWithPassword: () => Promise.reject(buildError()),
      signOut: () => Promise.reject(buildError()),
      getUser: () => Promise.resolve({ data: { user: null }, error: buildError() }),
    },
    from: () => createDisabledQueryBuilder(buildError),
  } as unknown as SupabaseClient;
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createDisabledSupabaseClient();

if (!isSupabaseConfigured) {
  console.warn(missingConfigMessage);
}

export { isSupabaseConfigured, missingConfigMessage };

export type User = {
  id: string;
  display_name: string;
  avatar_url: string;
  initial_balance: number;
  created_at: string;
};

export type Portfolio = {
  id: string;
  user_id: string;
  total_value: number;
  initial_balance: number;
  updated_at: string;
};

export type PortfolioAsset = {
  id: string;
  portfolio_id: string;
  symbol: string;
  quantity: number;
  avg_buy_price: number;
  created_at: string;
  updated_at: string;
};

export type Trade = {
  id: string;
  portfolio_id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
};

export type Alert = {
  id: string;
  user_id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  read: boolean;
  created_at: string;
};

export type PriceCache = {
  id: string;
  symbol: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  updated_at: string;
};
