import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import {
  Plus, Search, Megaphone, Copy, XCircle,
  AlertCircle, Check, Calendar, Users, MessageSquare,
  ChevronRight, MoreVertical, Pencil, Trash2, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Status config ────────────────────────────────────────────────────────────
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CampaignActions({ campaign, onDuplicate, onCancel, onDelete, onEdit, onView }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      const isInsideMenu = menuRef.current?.contains(event.target);
      const isInsideDropdown = dropdownRef.current?.contains(event.target);

      if (!isInsideMenu && !isInsideDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.right - 192
    });
    setIsOpen(!isOpen);
  };

  const status = campaign.status;

  const actions = [
    {
      label: 'Visualizar',
      icon: Eye,
      onClick: onView,
      show: ['agendada', 'em_andamento', 'concluida', 'cancelada', 'com_erros'].includes(status)
    },
    {
      label: 'Editar',
      icon: Pencil,
      onClick: onEdit,
      show: status === 'rascunho'
    },
    {
      label: 'Duplicar',
      icon: Copy,
      onClick: onDuplicate,
      show: ['concluida', 'cancelada', 'com_erros'].includes(status)
    },
    {
      label: 'Cancelar',
      icon: XCircle,
      onClick: onCancel,
      show: status === 'agendada',
      variant: 'danger'
    },
    {
      label: 'Excluir',
      icon: Trash2,
      onClick: onDelete,
      show: ['rascunho', 'cancelada', 'com_erros'].includes(status),
      variant: 'danger'
    },
  ].filter(a => a.show);

  if (actions.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleOpen}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            zIndex: 9999
          }}
          className="w-48 bg-white border border-[#EAE2F5] rounded-xl shadow-lg py-1.5 overflow-hidden animate-fadeIn"
        >
          {actions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 flex items-center gap-2.5 text-sm font-medium transition-colors ${action.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-[#54456B] hover:bg-gray-50'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  // Modais
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  useEffect(() => { fetchCampaigns(); }, []);

  async function fetchCampaigns() {
    setLoading(true);
    const { data, error } = await supabase
      .from('campanhas')
      .select(`
        *,
        templates (nome),
        listas_contatos (nome)
      `)
      .order('criado_em', { ascending: false });

    if (error) {
      showToast('error', 'Erro ao buscar campanhas: ' + error.message);
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  }

  // ─── Duplicar ──────────────────────────────────────────────────────────────
  async function handleDuplicate(campaign) {
    setIsDuplicating(campaign.id);
    try {
      const { data, error } = await supabase
        .from('campanhas')
        .insert([{
          nome: `Cópia de ${campaign.nome}`,
          template_id: campaign.template_id,
          lista_id: campaign.lista_id,
          mapeamento: campaign.mapeamento,
          status: 'rascunho',
        }])
        .select(`*, templates (nome), listas_contatos (nome)`)
        .single();

      if (error) throw error;
      setCampaigns(prev => [data, ...prev]);
      showToast('success', 'Campanha duplicada com sucesso!');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsDuplicating(null);
    }
  }

  // ─── Cancelar ──────────────────────────────────────────────────────────────
  async function handleCancel() {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('campanhas')
        .update({ status: 'cancelada' })
        .eq('id', cancelTarget.id);

      if (error) throw error;
      setCampaigns(prev =>
        prev.map(c => c.id === cancelTarget.id ? { ...c, status: 'cancelada' } : c)
      );
      showToast('success', 'Campanha cancelada.');
      setCancelTarget(null);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsCancelling(false);
    }
  }

  // ─── Excluir ───────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      console.log('Excluindo entregas da campanha:', deleteTarget.id);
      // Primeiro excluir as entregas (cascata manual se não estiver no banco)
      const { error: entError } = await supabase
        .from('entregas')
        .delete()
        .eq('campanha_id', deleteTarget.id);

      if (entError) throw entError;

      console.log('Excluindo registro da campanha:', deleteTarget.id);
      const { error } = await supabase
        .from('campanhas')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      setCampaigns(prev => prev.filter(c => c.id !== deleteTarget.id));
      showToast('success', 'Campanha excluída permanentemente.');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Erro na função handleDelete:', err);
      showToast('error', 'Erro ao excluir: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  const filtered = campaigns.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col pt-8 pb-10 relative h-full overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-semibold animate-fadeIn ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="px-[26px] mb-8 flex justify-between items-center flex-shrink-0 animate-fadeIn">
        <h1 className="text-[36px] font-bold text-[var(--color-text-main)]">Campanhas</h1>
        <button
          onClick={() => navigate('/campanhas/nova')}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 h-[42px] rounded-lg font-semibold text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      {/* Search */}
      <div className="px-[26px] mb-6 animate-scaleIn">
        <div className="relative max-w-md">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar campanha..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-[#54456B] font-medium"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-[26px] overflow-y-auto pb-8">
        {loading ? (
          <p className="text-[var(--color-text-main)] font-medium">Carregando campanhas...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center animate-scaleIn">
            <Megaphone className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#240B4B] mb-2">Nenhuma campanha encontrada</h3>
            <p className="text-gray-500 mb-6 max-w-xs mx-auto text-sm">
              Crie sua primeira campanha de disparo de mensagens via WhatsApp.
            </p>
            <button
              onClick={() => navigate('/campanhas/nova')}
              className="inline-flex items-center gap-2 text-[var(--color-primary)] font-bold hover:underline"
            >
              <Plus className="w-4 h-4" />
              Criar campanha agora
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(campaign => (
              <div
                key={campaign.id}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-xl p-5 shadow-sm transition-all animate-scaleIn relative"
              >
                {/* Row 1: Name + Badge + Actions */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[17px] text-[#240B4B] truncate">{campaign.nome}</h3>
                    </div>
                    <StatusBadge status={campaign.status} />
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <CampaignActions
                      campaign={campaign}
                      onDuplicate={() => handleDuplicate(campaign)}
                      onCancel={() => setCancelTarget(campaign)}
                      onDelete={() => setDeleteTarget(campaign)}
                      onEdit={() => navigate(`/campanhas/${campaign.id}/editar`)}
                      onView={() => navigate(`/campanhas/${campaign.id}`)}
                    />
                  </div>
                </div>

                {/* Row 2: Meta info */}
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-[#54456B] font-medium pl-[52px]">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                    {campaign.templates?.nome || '—'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    {campaign.listas_contatos?.nome || '—'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {campaign.agendado_para
                      ? `Agendada: ${formatDate(campaign.agendado_para)}`
                      : `Criada: ${formatDate(campaign.criado_em)}`
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn">
          <div className="bg-[#FCFBFD] border border-[#EAE2F5] rounded-xl w-full max-w-[400px] p-6 shadow-2xl flex flex-col gap-5 animate-scaleIn">
            <div className="flex flex-col gap-2 text-center">
              <Trash2 className="w-10 h-10 text-red-500 mx-auto" strokeWidth={1.5} />
              <h2 className="text-[#240B4B] text-[20px] font-bold">Excluir campanha?</h2>
              <p className="text-[#54456B] text-sm">
                Esta ação <strong className="text-red-600 uppercase">não pode ser desfeita</strong>. A campanha <strong className="text-[#240B4B]">"{deleteTarget.nome}"</strong> e todos os registros de disparos serão apagados.
              </p>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-[#54456B] font-semibold border-2 border-[#EAE2F5] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-white font-semibold bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn">
          <div className="bg-[#FCFBFD] border border-[#EAE2F5] rounded-xl w-full max-w-[400px] p-6 shadow-2xl flex flex-col gap-5 animate-scaleIn">
            <div className="flex flex-col gap-2 text-center">
              <XCircle className="w-10 h-10 text-red-400 mx-auto" strokeWidth={1.5} />
              <h2 className="text-[#240B4B] text-[20px] font-bold">Cancelar campanha?</h2>
              <p className="text-[#54456B] text-sm">
                A campanha <strong className="text-[#240B4B]">"{cancelTarget.nome}"</strong> está agendada. Ao cancelar, ela não será disparada.
              </p>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={isCancelling}
                className="flex-1 py-2.5 text-[#54456B] font-semibold border-2 border-[#EAE2F5] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 py-2.5 text-white font-semibold bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isCancelling ? 'Confirmar cancelamento' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
