import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch System Settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('configuracoes')
        .select('*')
        .in('chave', SETTINGS_KEYS);

      if (settingsError) throw settingsError;

      const settingsMap = {};
      settingsData.forEach(s => {
        settingsMap[s.chave] = s.valor || '';
      });

      // Merge with initial keys to ensure all inputs receive at least an empty string
      setSystemSettings(prev => ({ ...prev, ...settingsMap }));

      // 2. Fetch Users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');

      if (usersError) throw usersError;
      setUsers(usersData);

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

      // Update local state without re-fetching everything
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

                          {/* Impede que o próprio usuário logado desative a si mesmo */}
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
        />
      )}
    </div>
  );
}

// Modal Component
function UserModal({ isOpen, onClose, onSave, user }) {
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'usuario',
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
            role: formData.role
          })
          .eq('id', user.id);

        if (error) throw error;
      } else {
        // Create User - Chama Edge Function para o bypass seguro da SERVICE_ROLE
        const { data: { session } } = await supabase.auth.getSession();
        
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: formData,
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) throw error;
      }

      onSave(); // Refresh data
      onClose(); // Close Modal
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

      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
        <div className="p-6 border-b border-[#F3F4F6] bg-[#F9FAFB] flex items-center justify-between">
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
              disabled={!!user} // Não é possível mudar email via profile UI facilmente sem confirmação auth
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
