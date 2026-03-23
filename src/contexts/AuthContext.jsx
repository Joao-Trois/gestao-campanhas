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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Erro ao buscar profile (fallback aplicado):', error);
      // Fallback seguro: se falhar, assume role basica 'usuario'
      // ativo: true garante que o usuário consiga acessar as telas normais 
      // mesmo em falha de conexão repentina, mas não concede acesso a rotas admin.
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
    console.log('Registrando onAuthStateChange — se aparecer mais de uma vez tem problema');
    let lastEvent = null;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'User:', session?.user?.email, 'Expires:', new Date(session?.expires_at * 1000).toLocaleTimeString());
      // Evita setState em componente desmontado
      if (!mounted) return;

      // Ignora eventos duplicados consecutivos
      if (event === lastEvent && event === 'SIGNED_IN') {
        console.log('Evento duplicado ignorado:', event);
        return;
      }
      lastEvent = event;

      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        return; // não precisa rebuscar o profile
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
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
