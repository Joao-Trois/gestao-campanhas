import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart2, AlertCircle } from 'lucide-react';
import { SkeletonBlock } from './Skeleton';

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value ?? 0);
}

function getBarColor(percent) {
  if (percent >= 90) return '#ef4444';
  if (percent >= 70) return '#f59e0b';
  return '#22c55e';
}

export default function GraficoUsoPorGrupo() {
  const { profile } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aguarda profile completamente carregado
    if (!profile?.role) return;
    // Não-admin sem grupo_id não deve buscar nada
    if (profile.role !== 'admin' && !profile.grupo_id) return;

    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const isAdmin = profile.role === 'admin';

      let query = supabase
        .from('vw_budget_grupos')
        .select('grupo_id, grupo_nome, valor_limite, saldo_reservado, gasto_atual');

      if (!isAdmin) {
        query = query.eq('grupo_id', profile.grupo_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const combined = (data || []).map(row => {
        const gasto = Number(row.gasto_atual);
        const limite = row.valor_limite ? Number(row.valor_limite) : null;
        const percent = limite && limite > 0
          ? Math.min(Math.round((gasto / limite) * 100), 100)
          : null;

        const reservado = Number(row.saldo_reservado ?? 0);
        const percentReservado = limite && limite > 0
          ? Math.min(Math.round((reservado / limite) * 100), 100 - percent)
          : 0;

        return {
          id: row.grupo_id,
          nome: row.grupo_nome,
          gasto,
          reservado,
          limite,
          percent,
          percentReservado
        };
      });

      setData(combined);
    } catch (err) {
      console.error('Erro ao buscar dados de budget:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  // Loading state — mantém skeleton enquanto profile ainda não chegou
  if (loading || !profile?.role) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[#eae2f5] rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <SkeletonBlock className="w-5 h-5 rounded" />
          <SkeletonBlock className="h-5 w-48" />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#eae2f5] rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-5 w-12" />
              </div>
              <SkeletonBlock className="h-3 w-full rounded-full mb-2" />
              <SkeletonBlock className="h-3 w-52" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[#eae2f5] rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="text-lg font-bold text-[var(--color-text-main)]">Uso de Budget por Grupo</h3>
        </div>
        <div className="flex flex-col items-center py-8 text-gray-400">
          <AlertCircle className="w-10 h-10 mb-2 opacity-40" />
          <p className="font-medium text-sm">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-card)] border border-[#eae2f5] rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 className="w-5 h-5 text-[var(--color-primary)]" />
        <h3 className="text-lg font-bold text-[var(--color-text-main)]">Uso de Budget por Grupo</h3>
      </div>

      <div className="flex flex-col gap-4">
        {data.map((item) => {
          const hasCota = item.limite !== null;
          const barWidth = hasCota ? `${item.percent}%` : '100%';
          const barColor = hasCota ? getBarColor(item.percent) : '#d1d5db';

          return (
            <div
              key={item.id}
              className="bg-white border border-[#eae2f5] rounded-xl p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-[var(--color-text-main)] text-[15px]">{item.nome}</h4>
                <span
                  className="text-sm font-black tabular-nums"
                  style={{ color: hasCota ? barColor : '#9ca3af' }}
                >
                  {hasCota ? `${item.percent}%` : '—'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex mb-3">
                <div
                  className="h-full"
                  style={{ width: barWidth, backgroundColor: barColor, transition: 'width 0.6s ease' }}
                />
                {hasCota && item.percentReservado > 0 && (
                  <div
                    className="h-full"
                    style={{ width: `${item.percentReservado}%`, backgroundColor: '#a78bfa', transition: 'width 0.6s ease' }}
                  />
                )}
              </div>
              <p className="text-xs text-[#54456B] font-medium">
                {hasCota ? (
                  <>
                    <span className="font-bold text-[var(--color-text-main)]">{formatBRL(item.gasto)}</span>
                    {' gastos'}
                    {item.reservado > 0 && (
                      <>
                        {' · '}
                        <span className="font-bold text-purple-500">{formatBRL(item.reservado)}</span>
                        {' reservados'}
                      </>
                    )}
                    {' de '}
                    <span className="font-bold text-[var(--color-text-main)]">{formatBRL(item.limite)}</span>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-[var(--color-text-main)]">{formatBRL(item.gasto)}</span>
                    {' gastos — '}
                    <span className="text-amber-500 font-semibold">sem limite definido</span>
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}