import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Settings as SettingsIcon,
  Users,
  Globe,
  Eye,
  EyeOff,
  Edit2,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown
} from 'lucide-react';

// ─── CustomSelect ──────────────────────────────────────────────────────────
function CustomSelect({ value, onChange, options, placeholder, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-[#54456B] font-medium text-left"
      >
        <span className={!selectedOption ? "text-gray-400" : ""}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-[#EAE2F5] rounded-xl shadow-lg z-50 py-2 overflow-hidden animate-fadeIn">
          <div className="max-h-60 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${value === opt.value
                  ? 'bg-purple-50 text-[var(--color-primary)]'
                  : 'text-[#54456B] hover:bg-gray-50'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const SETTINGS_KEYS = [
  'n8n_webhook_base_url',
  'meta_api_token',
  'meta_waba_id',
  'meta_phone_number_id'
];

export default function Settings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    n8n_webhook_base_url: '',
    meta_api_token: '',
    meta_waba_id: '',
    meta_phone_number_id: '',
  });
  const [showToken, setShowToken] = useState(false);

  // Users Management State
  const [users, setUsers] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // ── ESTADOS E LÓGICA: Gestão de Cotas Mensais ──
  const [cotas, setCotas] = useState([]);
  const [isCotaModalOpen, setIsCotaModalOpen] = useState(false);
  const [editingGrupoCota, setEditingGrupoCota] = useState(null);
  const [cotaValor, setCotaValor] = useState('');
  const [isCotaLoading, setIsCotaLoading] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  const hoje = new Date();
  const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const dataFormatadaMesAtual = mesAtual.toISOString().split('T')[0];

  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const dataFormatadaMesAnterior = mesAnterior.toISOString().split('T')[0];

  const formatterBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatterMesAno = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

  const fetchCotas = async () => {
    try {
      const { data, error } = await supabase.from('cotas').select('*');
      if (error) throw error;
      setCotas(data || []);
    } catch (err) {
      console.error('Erro ao carregar cotas: ' + err.message);
    }
  };

  useEffect(() => {
    fetchCotas();
  }, []);

  const handleSaveCota = async (e) => {
    e.preventDefault();
    setIsCotaLoading(true);

    try {
      const valorNum = parseFloat(cotaValor.toString().replace(/,/g, '.'));
      if (isNaN(valorNum)) throw new Error('O valor informado é inválido.');

      const cotaExistente = cotas.find(
        c => c.grupo_id === editingGrupoCota.id && c.mes_referencia === dataFormatadaMesAtual
      );

      let error;
      if (cotaExistente) {
        ({ error } = await supabase
          .from('cotas')
          .update({ valor_limite: valorNum })
          .eq('id', cotaExistente.id));
      } else {
        ({ error } = await supabase
          .from('cotas')
          .insert({
            grupo_id: editingGrupoCota.id,
            valor_limite: valorNum,
            periodo: 'mensal',
            mes_referencia: dataFormatadaMesAtual,
            ativo: true
          }));
      }
      if (error) throw error;

      showToast('success', 'Cota configurada com sucesso!');
      fetchCotas();
      setIsCotaModalOpen(false);
    } catch (err) {
      const msg = err.message?.includes('row-level security') 
        ? 'Erro de permissões (RLS) ao processar cota.' 
        : err.message;
      showToast('error', 'Falha ao salvar: ' + msg);
    } finally {
      setIsCotaLoading(false);
    }
  };

  const handleClonarMesAnterior = async () => {
    if (!window.confirm("Deseja clonar os limites do mês passado para os grupos que ainda não possuem cota para este mês?")) return;

    setIsCotaLoading(true);
    try {
      const { data: cotasMesAnterior, error: errBusca } = await supabase
        .from('cotas')
        .select('*')
        .eq('mes_referencia', dataFormatadaMesAnterior)
        .eq('ativo', true);
      if (errBusca) throw errBusca;

      const gruposSemCota = cotasMesAnterior.filter(c =>
        !cotas.find(ca => ca.grupo_id === c.grupo_id && ca.mes_referencia === dataFormatadaMesAtual)
      );

      if (gruposSemCota.length === 0) {
        showToast('success', 'Todos os grupos já têm cota para este mês.');
        return;
      }

      const novasCotas = gruposSemCota.map(c => ({
        grupo_id: c.grupo_id,
        valor_limite: c.valor_limite,
        periodo: 'mensal',
        mes_referencia: dataFormatadaMesAtual,
        ativo: true
      }));

      const { error: errInsert } = await supabase.from('cotas').insert(novasCotas);
      if (errInsert) throw errInsert;

      showToast('success', 'Cotas passadas foram clonadas com sucesso!');
      fetchCotas();
    } catch (err) {
      showToast('error', 'Erro ao clonar: ' + err.message);
    } finally {
      setIsCotaLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [
        { data: settingsData, error: settingsError },
        { data: usersData, error: usersError },
        { data: gruposData },
      ] = await Promise.all([
        supabase.from('configuracoes').select('*').in('chave', SETTINGS_KEYS),
        supabase.from('profiles').select('*').order('nome'),
        supabase.from('grupos').select('id, nome').eq('ativo', true).order('nome'),
      ]);

      if (settingsError) throw settingsError;
      if (usersError) throw usersError;

      const settingsMap = {};
      settingsData.forEach(s => {
        settingsMap[s.chave] = s.valor || '';
      });

      setSystemSettings(prev => ({ ...prev, ...settingsMap }));
      setUsers(usersData);
      if (gruposData) setGrupos(gruposData);

    } catch (error) {
      console.error('Error fetching settings data:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveSystemSettings = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(systemSettings).map(([chave, valor]) => ({
        chave,
        valor: valor || ''
      }));

      const { error } = await supabase
        .from('configuracoes')
        .upsert(updates, { onConflict: 'chave' });

      if (error) throw error;
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      alert('Erro ao salvar as configurações: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, ativo: !currentStatus } : u));
    } catch (error) {
      alert('Erro ao alterar status do usuário: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 animate-fadeIn">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-[var(--color-primary)]" />
          Configurações do Sistema
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm">
          Gerencie as integrações da Meta, webhooks do n8n e acessos da equipe.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Section 1: System Config */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-[#F3F4F6] overflow-hidden">
            <div className="p-6 border-b border-[#F3F4F6] bg-[#F9FAFB]">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--color-primary)]" />
                Integrações e Webhooks
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* N8N Webhook */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Webhook N8N (Base URL)
                </label>
                <input
                  type="text"
                  value={systemSettings.n8n_webhook_base_url}
                  onChange={(e) => setSystemSettings({ ...systemSettings, n8n_webhook_base_url: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm"
                  placeholder="Ex: https://sua-instancia.n8n.cloud"
                />
              </div>

              {/* Meta API Token */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Token da Meta API
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={systemSettings.meta_api_token}
                    onChange={(e) => setSystemSettings({ ...systemSettings, meta_api_token: e.target.value })}
                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-[#E5E7EB] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm font-mono"
                    placeholder="EAAG...."
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* WABA and Phone ID Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    WABA ID
                  </label>
                  <input
                    type="text"
                    value={systemSettings.meta_waba_id}
                    onChange={(e) => setSystemSettings({ ...systemSettings, meta_waba_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm"
                    placeholder="WhatsApp Business Account ID"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={systemSettings.meta_phone_number_id}
                    onChange={(e) => setSystemSettings({ ...systemSettings, meta_phone_number_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm"
                    placeholder="ID do Número"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div className="space-y-1.5 opacity-60">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Fuso Horário (Sistema Global)
                </label>
                <select className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-gray-50 outline-none text-sm cursor-not-allowed" disabled>
                  <option>America/Sao_Paulo (GMT-3)</option>
                </select>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveSystemSettings}
                disabled={saving}
                className="w-full mt-2 py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Salvar Integrações
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: User Management */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-[#F3F4F6] overflow-hidden">
            <div className="p-6 border-b border-[#F3F4F6] bg-[#F9FAFB] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-primary)]" />
                Gerenciamento de Usuários
              </h2>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setIsModalOpen(true);
                }}
                className="px-3 py-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-xs font-bold hover:bg-[var(--color-primary)]/20 transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Novo Usuário
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Grupo</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Nível</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)] font-medium">
                        {u.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {grupos.find(g => g.id === u.grupo_id)?.nome || (
                          <span className="text-gray-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                          }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold ${u.ativo ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {u.ativo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] rounded-lg transition-colors"
                            title="Editar Dados"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {profile?.id !== u.id && (
                            <button
                              onClick={() => toggleUserStatus(u.id, u.ativo)}
                              className={`p-1.5 rounded-lg transition-colors ${u.ativo
                                ? 'text-red-400 hover:bg-red-50 hover:text-red-600'
                                : 'text-green-400 hover:bg-green-50 hover:text-green-600'
                                }`}
                              title={u.ativo ? "Desativar Acesso" : "Ativar Acesso"}
                            >
                              {u.ativo ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── SEÇÃO: Gestão de Cotas Mensais ── */}
        <div className="lg:col-span-12 space-y-6">
          <div className="bg-[#fcfbfd] rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden">
            <div className="p-6 border-b border-[var(--color-border)] bg-white flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[var(--color-primary)]" />
                  Gestão de Cotas de Envios / Módulo Mensal
                </h2>
                <p className="mt-1 text-xs text-gray-500 font-medium">Ciclo de faturamento: <span className="capitalize">{formatterMesAno.format(mesAtual)}</span></p>
              </div>

              <button
                onClick={handleClonarMesAnterior}
                className="px-4 py-2 bg-white text-[var(--color-text-main)] border border-[var(--color-border)] rounded-lg text-xs font-bold hover:bg-gray-50 hover:text-[var(--color-primary)] transition-all flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCotaLoading ? 'animate-spin' : ''}`} />
                Clonar mês anterior
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grupo</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mês Vigente</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Limite em R$</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {grupos.map((grupo) => {
                    const cotaAtual = cotas.find(c => c.grupo_id === grupo.id && c.mes_referencia === dataFormatadaMesAtual);

                    return (
                      <tr key={grupo.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-main)] font-bold">
                          {grupo.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {formatterMesAno.format(mesAtual)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cotaAtual ? (
                            <span className="font-semibold text-[var(--color-text-main)]">
                              {formatterBRL.format(cotaAtual.valor_limite)}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-500">
                              Sem cota
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => {
                              setEditingGrupoCota(grupo);
                              setCotaValor(cotaAtual ? cotaAtual.valor_limite : '');
                              setIsCotaModalOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors inline-flex items-center gap-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            {cotaAtual ? 'Editar' : 'Definir'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
          onSave={fetchData}
          user={editingUser}
          grupos={grupos}
        />
      )}

      {/* Toast Notification global do Settings */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-white font-medium text-sm animate-fadeIn ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Modal - Configurar Cota do Grupo */}
      {isCotaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setIsCotaModalOpen(false)} />
          <div className="relative bg-white w-full max-w-[420px] rounded-2xl shadow-2xl animate-scaleIn">
            <div className="p-6 border-b border-[#F3F4F6] bg-[#fcfbfd] flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-[var(--color-text-main)] flex items-center gap-2">
                <Globe className="w-5 h-5 text-[var(--color-primary)]" />
                Definir Cota - {editingGrupoCota?.nome}
              </h3>
            </div>
            
            <form onSubmit={handleSaveCota} className="p-6 space-y-5">
              <div className="space-y-1.5 opacity-70">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mês de Referência</label>
                <input
                  type="text"
                  disabled
                  value={formatterMesAno.format(mesAtual).toUpperCase()}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-[var(--color-border)] text-sm font-bold text-gray-600 outline-none cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Valor Limite Mensal (R$)</label>
                <input
                  required
                  autoFocus
                  type="number"
                  step="0.01"
                  min="0"
                  value={cotaValor}
                  onChange={(e) => setCotaValor(e.target.value)}
                  placeholder="1500.00"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCotaModalOpen(false)}
                  className="flex-1 py-3 bg-white border border-[var(--color-border)] text-gray-500 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCotaLoading}
                  className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold text-sm shadow-md hover:bg-[var(--color-primary-hover)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                  {isCotaLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal Component
function UserModal({ isOpen, onClose, onSave, user, grupos }) {
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'usuario',
    grupo_id: user?.grupo_id || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user) {
        // Edit Profile
        const { error } = await supabase
          .from('profiles')
          .update({
            nome: formData.nome,
            role: formData.role,
            grupo_id: formData.grupo_id || null,
          })
          .eq('id', user.id);

        if (error) throw error;
      } else {
        // Create User - Chama Edge Function para o bypass seguro da SERVICE_ROLE
        const { data: { session } } = await supabase.auth.getSession();

        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            ...formData,
            grupo_id: formData.grupo_id || null,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl animate-scaleIn">
        <div className="p-6 border-b border-[#F3F4F6] bg-[#F9FAFB] flex items-center justify-between rounded-t-2xl">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            {user ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {user ? 'Editar Equipista' : 'Novo Equipista'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Nome Completo
            </label>
            <input
              required
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[var(--color-primary)] outline-none transition-all text-sm tracking-wide"
              placeholder="Ex: Ana Souza"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              E-mail
            </label>
            <input
              required
              disabled={!!user}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[var(--color-primary)] outline-none transition-all text-sm disabled:bg-gray-50 disabled:text-gray-400"
              placeholder="ana@exemplo.com"
            />
          </div>

          {!user && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Senha Provisória
              </label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[var(--color-primary)] outline-none transition-all text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[var(--color-primary)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Nível de Acesso (Role)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'usuario' })}
                className={`py-2 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${formData.role === 'usuario'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-[#E5E7EB] text-gray-400 hover:bg-gray-50'
                  }`}
              >
                <Users className="w-4 h-4" />
                Usuário
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'admin' })}
                className={`py-2 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${formData.role === 'admin'
                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                  : 'bg-white border-[#E5E7EB] text-gray-400 hover:bg-gray-50'
                  }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            </div>
          </div>

          {/* Grupo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Grupo
            </label>
            <CustomSelect
              value={formData.grupo_id}
              onChange={(val) => setFormData({ ...formData, grupo_id: val })}
              placeholder="Sem grupo"
              options={[
                { value: '', label: 'Sem grupo' },
                ...grupos.map(g => ({ value: g.id, label: g.nome }))
              ]}
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {user ? 'Salvar Alterações' : 'Concluir Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}