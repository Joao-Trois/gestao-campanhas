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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Evita setState em componente desmontado
      if (!mounted) return;

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

    // Ping periódico para evitar cold start do Supabase (plano gratuito hiberna após inatividade)
    const keepAlive = setInterval(async () => {
      try {
        // Ping na sessão
        await supabase.auth.getSession();
        // Ping no banco
        await supabase.from('configuracoes').select('chave').limit(1);
      } catch (e) {
        console.log('keepAlive ping falhou:', e);
      }
    }, 2 * 60 * 1000); // ping a cada 2 minutos

    return () => {
      mounted = false;
      clearTimeout(timeout);
      clearInterval(keepAlive);
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
