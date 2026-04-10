import { useAuth } from '../contexts/AuthContext';
import GraficoUsoPorGrupo from '../components/GraficoUsoPorGrupo'; // ← linha que falta

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="bg-[var(--color-bg-card)] rounded-lg shadow p-6 border border-gray-100">
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Dashboard Interno</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">Bem-vindo, {user?.email}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <GraficoUsoPorGrupo />
          {/* Outros widgets do dash podem entrar aqui */}
        </div>
      </div>
    </div>
  );
}
