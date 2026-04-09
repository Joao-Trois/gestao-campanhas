import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] p-8">
      <div className="max-w-7xl mx-auto bg-[var(--color-bg-card)] rounded-lg shadow p-6 border border-gray-100">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Dashboard Interno</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">Bem-vindo, {user?.email}</p>
      </div>
    </div>
  );
}
