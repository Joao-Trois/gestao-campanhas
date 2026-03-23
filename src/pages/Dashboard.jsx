import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  
  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao sair:', error);
      // Fallback radical se o signOut do Supabase falhar
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] p-8">
      <div className="max-w-7xl mx-auto bg-[var(--color-bg-card)] rounded-lg shadow p-6 border border-gray-100">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Dashboard Interno</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">Bem-vindo, {user?.email}</p>
        <button 
          onClick={handleLogout}
          className="mt-6 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
        >
          Sair do Sistema
        </button>
      </div>
    </div>
  );
}
