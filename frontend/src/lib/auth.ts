import { supabase } from './supabase';

export async function signUp(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        display_name: displayName,
        initial_balance: 10000,
      });

    if (profileError) throw profileError;

    const { error: portfolioError } = await supabase
      .from('portfolios')
      .insert({
        user_id: data.user.id,
        total_value: 10000,
        initial_balance: 10000,
      });

    if (portfolioError) throw portfolioError;

    return { user: data.user };
  }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
