import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, Megaphone, MessageSquare, Users,
  Calendar, ClipboardList, Check, AlertCircle,
  Clock, Zap, Info, ChevronRight, User
} from 'lucide-react';

// ─── Status config (Consistent with Campaigns.jsx) ────────────────────────────
const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  agendada: { label: 'Agendada', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  em_andamento: { label: 'Em andamento', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  concluida: { label: 'Concluída', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  cancelada: { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  com_erros: { label: 'Com erros', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.rascunho;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewText, setPreviewText] = useState('');
  const [stats, setStats] = useState({ total: 0, success: 0, error: 0, pending: 0, percent: 0 });

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Campanha
      const { data: camp, error: cError } = await supabase
        .from('campanhas')
        .select(`
          *,
          templates (*),
          listas_contatos (*)
        `)
        .eq('id', id)
        .single();

      if (cError) throw cError;
      setCampaign(camp);

      // 2. Entregas
      const { data: delivs, error: dError } = await supabase
        .from('entregas')
        .select('*')
        .eq('campanha_id', id)
        .order('atualizado_em', { ascending: false });

      if (dError) throw dError;
      setDeliveries(delivs || []);

      // Calcular stats
      const total = delivs?.length || 0;
      const success = delivs?.filter(d => d.status === 'enviado').length || 0;
      const error = delivs?.filter(d => d.status === 'erro').length || 0;
      const pending = delivs?.filter(d => d.status === 'pendente' || d.status === 'processando').length || 0;
      const percent = total > 0 ? Math.round((success / total) * 100) : 0;
      setStats({ total, success, error, pending, percent });

      // 3. Preview Context (primeiro contato da lista)
      if (camp.templates && camp.lista_id) {
        const { data: contatos } = await supabase
          .from('contatos')
          .select('*')
          .eq('lista_id', camp.lista_id)
          .limit(1);

        if (contatos?.[0]) {
          processPreview(camp.templates.texto, camp.mapeamento, contatos[0]);
        } else {
          setPreviewText(camp.templates.texto);
        }
      }

    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  function processPreview(text, mapping, contact) {
    if (!text) return;
    let final = text;
    Object.entries(mapping || {}).forEach(([varName, mapValue]) => {
      const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
      const contactVal = contact.dados?.[mapValue] || contact[mapValue] || '';
      final = final.replace(regex, contactVal || mapValue);
    });
    setPreviewText(final);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-[var(--color-primary)] rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-[#240B4B] font-bold text-xl">Campanha não encontrada</p>
        <button onClick={() => navigate('/campanhas')} className="text-[var(--color-primary)] font-bold hover:underline">
          Voltar para listagem
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pt-8 pb-10 relative h-full overflow-y-auto animate-fadeIn">

      {/* Header */}
      <div className="px-[26px] mb-8 flex flex-col gap-2 flex-shrink-0">
        <button
          onClick={() => navigate('/campanhas')}
          className="flex items-center gap-1 text-gray-500 hover:text-[var(--color-primary)] transition-colors w-fit font-semibold text-sm mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Campanhas
        </button>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Megaphone className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-[32px] font-bold text-[var(--color-text-main)] leading-tight">{campaign.nome}</h1>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={campaign.status} />
                <span className="text-xs text-gray-400 font-medium">ID: {campaign.id.split('-')[0]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-[26px] grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Coluna Esquerda: Resumo e Mapeamento */}
        <div className="lg:col-span-1 flex flex-col gap-8">

          {/* Resume Card */}
          <div className="bg-[var(--color-bg-card)] border border-gray-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#240B4B] mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-400" />
              Resumo da Configuração
            </h3>
            <div className="flex flex-col gap-5">
              <SummaryRow icon={MessageSquare} label="Template Utilizado" value={campaign.templates?.nome} />
              <SummaryRow icon={Users} label="Lista de Contatos" value={campaign.listas_contatos?.nome} />
              <SummaryRow icon={Calendar} label="Data de Disparo" value={formatDate(campaign.agendado_para || campaign.criado_em)} />
              <SummaryRow icon={User} label="Criado em" value={formatDate(campaign.criado_em)} />
            </div>

            {/* Mapping Section */}
            {campaign.mapeamento && Object.keys(campaign.mapeamento).length > 0 && (
              <div className="mt-8">
                <div style={{ borderTop: '1px solid #F3F4F6' }} />
                <div className="pt-4">
                  <h4 className="text-sm font-bold text-[#240B4B] mb-4">Mapeamento de Variáveis</h4>
                  <div className="flex flex-col">
                    {Object.entries(campaign.mapeamento).map(([variavel, valor], idx) => (
                      <div key={variavel}
                        className="flex items-center gap-3 py-3"
                        style={idx !== Object.entries(campaign.mapeamento).length - 1 ? { borderBottom: '1px solid #F3F4F6' } : {}}
                      >
                        <span
                          className="text-xs font-mono px-2 py-0.5 rounded shrink-0"
                          style={{ color: '#7C3AED', backgroundColor: '#F3EEFF' }}
                        >
                          {`{{${variavel}}}`}
                        </span>
                        <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                        <span className="text-sm font-semibold text-gray-700 truncate">{valor || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Card */}
          <div className="bg-[var(--color-bg-card)] border border-gray-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#240B4B] mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Preview da Mensagem
            </h3>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 relative">
              <div className="absolute top-3 right-3">
                <div className="px-2 py-1 bg-white border border-gray-100 rounded text-[10px] font-bold text-gray-400 uppercase tracking-tighter shadow-sm">WhatsApp</div>
              </div>
              <p className="text-sm text-[#54456B] whitespace-pre-wrap leading-relaxed font-medium">
                {previewText || '—'}
              </p>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 italic">* Exemplo usando dados do primeiro contato disponível na lista.</p>
          </div>
        </div>

        {/* Coluna Direita: Relatório de Entregas */}
        <div className="lg:col-span-2 flex flex-col gap-8">

          {/* Stats Dashboard */}
          <div className="bg-[var(--color-bg-card)] border border-gray-100 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                <h3 className="text-xl font-bold text-[#240B4B] mb-1">Relatório de Entregas</h3>
                <p className="text-sm text-gray-500 font-medium">Acompanhamento em tempo real dos disparos</p>
              </div>
              <div className="p-4 flex items-center gap-4 bg-[#F3EEFF] px-5 py-4 rounded-2xl border border-purple-100 w-full md:w-auto">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-14 h-14 transform -rotate-90">
                    <circle cx="28" cy="28" r="24" stroke="#EAE2F5" strokeWidth="5" fill="transparent" />
                    <circle cx="28" cy="28" r="24" stroke="#7C3AED" strokeWidth="5" fill="transparent" strokeDasharray={150.7} strokeDashoffset={150.7 - (150.7 * stats.percent) / 100} className="transition-all duration-1000" strokeLinecap="round" />
                  </svg>
                  <span className="absolute text-sm font-bold text-[#7C3AED]">{stats.percent}%</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Taxa de Sucesso</p>
                  <p className="text-lg font-black text-[var(--color-primary)]">{stats.success} / {stats.total}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total" value={stats.total} icon={Users} color="bg-gray-100 text-gray-600" />
              <StatCard label="Enviados" value={stats.success} icon={Check} color="bg-green-100 text-green-600" />
              <StatCard label="Falhas" value={stats.error} icon={AlertCircle} color="bg-red-100 text-red-600" />
              <StatCard label="Pendentes" value={stats.pending} icon={Clock} color="bg-amber-100 text-amber-600" />
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-[var(--color-bg-card)] border border-gray-100 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
            <div className="px-6 py-4 bg-white flex justify-between items-center bg-gray-50/30" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h3 className="font-bold text-[#240B4B]">Log de Entregas</h3>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50" style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Destinatário</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Última Atualização</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Observação</th>
                  </tr>
                </thead>
                <tbody className="">
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-medium">
                        Nenhum registro de entrega encontrado.
                      </td>
                    </tr>
                  ) : (
                    deliveries.map((d, idx) => (
                      <tr
                        key={d.id}
                        className="hover:bg-gray-50 transition-colors"
                        style={idx !== deliveries.length - 1 ? { borderBottom: '1px solid #F3F4F6' } : {}}
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-[#240B4B]">{d.telefone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <DeliveryStatusBadge status={d.status} />
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                          {formatDate(d.atualizado_em)}
                        </td>
                        <td className="px-6 py-4">
                          {d.erro ? (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold bg-red-50 px-2 py-1 rounded w-fit border border-red-100">
                              <Info className="w-3 h-3" /> {d.erro}
                            </div>
                          ) : d.status === 'enviado' ? (
                            <span className="text-xs text-green-500 font-bold">Sucesso</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────
function SummaryRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-1.5 bg-purple-100 rounded-md flex-shrink-0 mt-0.5">
        <Icon className="w-6 h-6 text-[var(--color-primary)]" />
      </div>
      <div>
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider leading-none mb-1">{label}</p>
        <p className="text-sm font-bold text-[#240B4B]">{value || '—'}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div
      className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 pb-3 mb-1" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-lg font-black text-[#240B4B] leading-none mt-1">{value}</p>
    </div>
  );
}

function DeliveryStatusBadge({ status }) {
  const configs = {
    pendente: { label: 'Pendente', bg: 'bg-gray-100', text: 'text-gray-600' },
    processando: { label: 'Processando', bg: 'bg-blue-100', text: 'text-blue-600' },
    enviado: { label: 'Enviado', bg: 'bg-green-100', text: 'text-green-600' },
    erro: { label: 'Erro', bg: 'bg-red-100', text: 'text-red-600' },
  };
  const cfg = configs[status] || configs.pendente;
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
