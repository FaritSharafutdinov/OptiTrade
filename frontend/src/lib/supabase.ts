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
export type {
  SupabaseUser as User,
  SupabasePortfolio as Portfolio,
  SupabasePortfolioAsset as PortfolioAsset,
  SupabaseTrade as Trade,
  SupabaseAlert as Alert,
  SupabasePriceCache as PriceCache,
} from '../types';
