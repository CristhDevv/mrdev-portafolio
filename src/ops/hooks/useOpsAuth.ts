import { useEffect, useState } from 'react';
import { getOpsSupabaseClient, isSupabaseConfigured } from '../services/supabaseClient';

export function useOpsAuth() {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getOpsSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = getOpsSupabaseClient();
    if (!supabase) {
      setError('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para habilitar autenticación.');
      return;
    }
    setError(null);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) setError(authErr.message);
  };

  const signOut = async () => {
    const supabase = getOpsSupabaseClient();
    await supabase?.auth.signOut();
    setUserEmail(null);
  };

  return { configured, loading, userEmail, error, signIn, signOut };
}
