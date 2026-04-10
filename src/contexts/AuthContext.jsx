import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// 1. Valores padrão seguros
const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signIn: async () => { },
  signOut: async () => { }
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função isolada e protegida com try/catch
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      setProfile({ role: 'usuario', ativo: true });
    }
  };

  useEffect(() => {
    let mounted = true;

    // Timeout de segurança: garante que a tela nunca fique branca eternamente
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    // Apenas o listener é mantido. O Supabase v2 dispara um evento "INITIAL_SESSION"
    // ou "SIGNED_IN" na primeira carga, evitando dupla tentativa e "lock steal" no client.
    let lastEvent = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Evita setState em componente desmontado
      if (!mounted) return;

      // Ignora eventos duplicados consecutivos
      if (event === lastEvent && event === 'SIGNED_IN') {
        return;
      }
      lastEvent = event;

      // Logout real — zera tudo e redireciona
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUser(null);
        setSession(null);
        localStorage.clear();
        window.location.href = '/login';
        return;
      }

      // Refresh de token — só atualiza sessão, preserva profile
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      try {
        if (session?.user) {
          // Só busca o profile se ainda não tiver um carregado
          if (!profile) {
            await fetchProfile(session.user.id);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    });

    // Ping periódico temporariamente removido para testes.

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ session, user, profile, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
