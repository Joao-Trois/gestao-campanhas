import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, AlertCircle,
  Settings2, GitMerge, Clock, ClipboardList,
  Users, MessageSquare, Calendar, Zap, ChevronDown
} from 'lucide-react';

// ─── Stepper ──────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Configuração', icon: Settings2 },
  { id: 2, label: 'Variáveis', icon: GitMerge },
  { id: 3, label: 'Agendamento', icon: Clock },
  { id: 4, label: 'Revisão', icon: ClipboardList },
];

function Stepper({ current }) {
  return (
    <div className="flex justify-center items-center gap-8 mt-6 mb-8 w-full">
      {STEPS.map((step, idx) => {
        const isDone = step.id < current;
        const isActive = step.id === current;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center gap-8">
            <div className={`flex flex-col items-center gap-2 ${isActive ? 'opacity-100' : isDone ? 'opacity-100' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${isDone ? 'bg-green-500 border-green-500 text-white shadow-sm' :
                isActive ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md scale-110' :
                  'bg-white border-gray-200 text-gray-400'
                }`}>
                {isDone ? <Check className="w-5 h-5" strokeWidth={3} /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-sm font-bold whitespace-nowrap transition-colors ${isActive ? 'text-[var(--color-primary)]' : isDone ? 'text-green-600' : 'text-gray-400'
                }`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="w-16 h-[2px] mb-7 relative bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-0 bg-[var(--color-primary)] transition-all duration-500 ease-in-out"
                  style={{ width: isDone ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CustomSelect({ value, onChange, options, placeholder, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = search
    ? options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
    : options;

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
        <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-[#EAE2F5] rounded-xl shadow-lg z-50 overflow-hidden animate-fadeIn">
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="Buscar…"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              borderBottom: '1px solid #EAE2F5',
              outline: 'none',
              fontSize: '14px',
              fontFamily: 'inherit',
              color: '#54456B',
              background: 'white',
            }}
          />
          <div className="max-h-60 overflow-y-auto py-2">
            {filteredOptions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum resultado encontrado.</p>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${value === opt.value
                    ? 'bg-purple-50 text-[var(--color-primary)]'
                    : 'text-[#54456B] hover:bg-gray-50'
                    }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Formatting message preview ─────────────────────────────────────────────
function previewMessage(msgTemplate, mapping, contactData) {
  let result = msgTemplate;
  Object.entries(mapping).forEach(([varName, colOrValue]) => {
    const resolved = contactData?.[colOrValue] ?? colOrValue;
    result = result.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), `【${resolved}】`);
  });
  return result;
}

// ─── Scheduling helpers ───────────────────────────────────────────────────────
const PT_MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const PT_DAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function formatScheduleSummary(isoString) {
  const d = new Date(isoString);
  return `${PT_DAYS[d.getDay()]}, ${d.getDate()} de ${PT_MONTHS[d.getMonth()]} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function localNowString() {
  const now = new Date();
  const offset = -3 * 60; // America/Sao_Paulo simple offset (UTC-3)
  const local = new Date(now.getTime() + (offset - now.getTimezoneOffset()) * 60000);
  return local.toISOString().slice(0, 16);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CampaignWizard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { id } = useParams();
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [originalListaId, setOriginalListaId] = useState(null);

  // Data sources
  const [templates, setTemplates] = useState([]);
  const [lists, setLists] = useState([]);
  const [firstContact, setFirstContact] = useState(null);

  // Step 1
  const [nome, setNome] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  const [tagFilter, setTagFilter] = useState('');
  const [allTags, setAllTags] = useState([]);

  // Step 2  –  { VarName: colOrFixedValue }
  const [mapping, setMapping] = useState({});
  const [fixedValues, setFixedValues] = useState({}); // used when mode is 'fixed'
  const [mappingMode, setMappingMode] = useState({}); // 'column' | 'fixed'

  // Step 3
  const [dispatchMode, setDispatchMode] = useState('now'); // 'now' | 'schedule'
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  // ─── Load initial data ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data: tData }, { data: lData }, { data: tagData }] = await Promise.all([
        supabase
          .from('templates')
          .select('id, nome, texto, variaveis, meta_status, ativo, template_tags(tags(id,nome,cor))')
          .eq('meta_status', 'aprovado')
          .eq('ativo', true)
          .order('nome'),
        supabase.from('listas_contatos').select('*').order('nome'),
        supabase.from('tags').select('*').order('nome'),
      ]);

      if (tData) {
        const normalized = tData.map(t => ({
          ...t,
          tags: t.template_tags?.map(tt => tt.tags).filter(Boolean) || [],
        }));
        setTemplates(normalized);

        // Se estiver editando, carregar os dados da campanha AGORA
        if (id) {
          const { data: camp, error } = await supabase
            .from('campanhas')
            .select('*')
            .eq('id', id)
            .single();

          if (error || !camp) {
            showToast('error', 'Campanha não encontrada.');
            navigate('/campanhas');
            return;
          }

          if (camp.status !== 'rascunho') {
            showToast('error', 'Apenas rascunhos podem ser editados.');
            navigate('/campanhas');
            return;
          }

          // Preencher estados
          setNome(camp.nome);
          const tpl = normalized.find(t => t.id === camp.template_id);
          setSelectedTemplate(tpl);

          const lst = lData?.find(l => l.id === camp.lista_id);
          setSelectedList(lst);
          setOriginalListaId(camp.lista_id);

          // Mapeamento
          if (camp.mapeamento) {
            setMapping(camp.mapeamento);
            // Reconstruir mappingMode
            const modes = {};
            const fixeds = {};
            Object.entries(camp.mapeamento).forEach(([key, val]) => {
              const isColumn = lst?.colunas?.includes(val);
              modes[key] = isColumn ? 'column' : 'fixed';
              if (!isColumn) fixeds[key] = val;
            });
            setMappingMode(modes);
            setFixedValues(fixeds);
          }

          // Agendamento
          if (camp.agendado_para) {
            setDispatchMode('schedule');
            setScheduledAt(new Date(camp.agendado_para).toISOString().slice(0, 16));
          } else {
            setDispatchMode('now');
          }

          setLoading(false);
        }
      }
      if (lData) setLists(lData);
      if (tagData) setAllTags(tagData);
    }
    load();
  }, []);

  // ─── Load first contact when list changes ─────────────────────────────────
  useEffect(() => {
    if (!selectedList) { setFirstContact(null); return; }
    supabase
      .from('contatos')
      .select('dados')
      .eq('lista_id', selectedList.id)
      .limit(1)
      .single()
      .then(({ data }) => setFirstContact(data?.dados || null));
  }, [selectedList]);

  // ─── When template changes: reset mapping (only if NOT loading edit) ───────
  useEffect(() => {
    if (!selectedTemplate || loading) return;
    const vars = selectedTemplate.variaveis || [];
    const initMode = {};
    const initMapping = {};
    vars.forEach(v => { initMode[v] = 'column'; initMapping[v] = ''; });
    setMappingMode(initMode);
    setMapping(initMapping);
    setFixedValues({});
  }, [selectedTemplate]);

  // ─── Step 1 validation ────────────────────────────────────────────────────
  const step1Valid = nome.trim() && selectedTemplate && selectedList;

  // ─── Step 2 validation ────────────────────────────────────────────────────
  const templateVars = selectedTemplate?.variaveis || [];
  const step2Valid = templateVars.length === 0 ||
    templateVars.every(v => {
      if (mappingMode[v] === 'fixed') return (fixedValues[v] || '').trim() !== '';
      return (mapping[v] || '').trim() !== '';
    });

  // ─── Build final mapping object ───────────────────────────────────────────
  function buildFinalMapping() {
    const result = {};
    templateVars.forEach(v => {
      result[v] = mappingMode[v] === 'fixed' ? (fixedValues[v] || '') : (mapping[v] || '');
    });
    return result;
  }

  // ─── Schedule validation ──────────────────────────────────────────────────
  function validateSchedule() {
    if (dispatchMode === 'now') { setScheduleError(''); return true; }
    if (!scheduledAt) { setScheduleError('Selecione uma data e hora.'); return false; }
    const selected = new Date(scheduledAt);
    if (selected <= new Date()) { setScheduleError('A data deve ser no futuro.'); return false; }
    setScheduleError('');
    return true;
  }

  // ─── Step navigation ──────────────────────────────────────────────────────
  function advanceStep() {
    if (step === 3 && !validateSchedule()) return;
    setStep(s => s + 1);
  }

  // ─── Filtered templates ───────────────────────────────────────────────────
  const filteredTemplates = tagFilter
    ? templates.filter(t => t.tags?.some(tag => tag.id === tagFilter))
    : templates;

  // ─── Save ─────────────────────────────────────────────────────────────────
  async function handleSave(mode) {
    // mode: 'rascunho' | 'confirmar'
    if (!step1Valid) return;
    const finalMapping = buildFinalMapping();

    setIsSaving(true);
    try {
      let status, agendado_para;

      if (mode === 'rascunho') {
        status = 'rascunho';
        agendado_para = null;
      } else if (dispatchMode === 'now') {
        status = 'em_andamento';
        agendado_para = null;
      } else {
        status = 'agendada';
        agendado_para = new Date(scheduledAt).toISOString();
      }

      let campanhaId = id;

      if (id) {
        // 1. Update campanha
        const { error: campError } = await supabase
          .from('campanhas')
          .update({
            nome: nome.trim(),
            template_id: selectedTemplate.id,
            lista_id: selectedList.id,
            mapeamento: finalMapping,
            status,
            agendado_para,
            criado_por: user?.id,
            grupo_id: profile?.grupo_id,
          })
          .eq('id', id);

        if (campError) throw campError;

        // 2. Se a lista mudou, recriar entregas
        if (selectedList.id !== originalListaId) {
          // Deletar existentes
          await supabase.from('entregas').delete().eq('campanha_id', id);

          // Buscar novos contatos
          const { data: contacts } = await supabase
            .from('contatos')
            .select('id, telefone, dados')
            .eq('lista_id', selectedList.id);

          if (contacts && contacts.length > 0) {
            const batchSize = 500;
            for (let i = 0; i < contacts.length; i += batchSize) {
              const batch = contacts.slice(i, i + batchSize).map(c => ({
                campanha_id: id,
                contato_id: c.id,
                telefone: c.telefone || c.dados?.telefone,
                status: 'pendente',
              }));
              await supabase.from('entregas').insert(batch);
            }
          }
        }
      } else {
        // 1. Insert campanha
        const { data: campanha, error: campError } = await supabase
          .from('campanhas')
          .insert([{
            nome: nome.trim(),
            template_id: selectedTemplate.id,
            lista_id: selectedList.id,
            mapeamento: finalMapping,
            status,
            agendado_para,
            criado_por: user?.id,
            grupo_id: profile?.grupo_id,
          }])
          .select()
          .single();

        if (campError) throw campError;
        campanhaId = campanha.id;

        // 2. Buscar contatos da lista
        const { data: contacts } = await supabase
          .from('contatos')
          .select('id, telefone, dados')
          .eq('lista_id', selectedList.id);

        // 3. Insert entregas em lote
        if (contacts && contacts.length > 0) {
          const batchSize = 500;
          for (let i = 0; i < contacts.length; i += batchSize) {
            const batch = contacts.slice(i, i + batchSize).map(c => ({
              campanha_id: campanhaId,
              contato_id: c.id,
              telefone: c.telefone || c.dados?.telefone,
              status: 'pendente',
            }));
            await supabase.from('entregas').insert(batch);
          }
        }
      }

      // 4. Se não é rascunho, chamar webhook
      if (mode !== 'rascunho') {
        try {
          const { data: cfgData } = await supabase
            .from('configuracoes')
            .select('valor')
            .eq('chave', 'n8n_webhook_base_url')
            .single();

          const baseUrl = cfgData?.valor;
          if (baseUrl) {
            const agendadoParaDt = new Date(agendado_para);
            const agora = new Date();

            // Só dispara imediatamente se NÃO for agendamento futuro
            if (!agendado_para || agendadoParaDt <= agora) {
              await fetch(`${baseUrl}/disparosMETA`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campanha_id: campanhaId }),
              });
            }
          }
        } catch (webhookErr) {
          console.warn('Webhook call failed (non-fatal):', webhookErr);
        }
      }

      const outcomeMsg = id
        ? 'Alterações salvas com sucesso!'
        : mode === 'rascunho'
          ? 'Rascunho salvo com sucesso!'
          : dispatchMode === 'now' ? 'Campanha iniciada com sucesso!' : 'Campanha agendada com sucesso!';
      showToast('success', outcomeMsg);
      setTimeout(() => navigate('/campanhas'), 1500);

    } catch (err) {
      console.error(err);
      showToast('error', err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Preview message ──────────────────────────────────────────────────────
  const finalMapping = buildFinalMapping();
  const previewText = selectedTemplate
    ? previewMessage(selectedTemplate.texto || '', finalMapping, firstContact)
    : '';

  const PT_MONTHS_OBJ = PT_MONTHS; // alias
  const scheduleDisplay = scheduledAt && dispatchMode === 'schedule'
    ? formatScheduleSummary(scheduledAt)
    : null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-[var(--color-primary)] rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Carregando dados da campanha...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col pt-8 pb-10 px-[26px] h-full overflow-y-auto relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-semibold animate-fadeIn ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => navigate('/campanhas')}
        className="flex items-center gap-2 text-[#54456B] hover:text-[var(--color-primary)] font-semibold mb-6 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        {id ? 'Voltar para Campanhas' : 'Cancelar a Campanha'}
      </button>

      <h1 className="text-xl text-[30px] font-bold text-[var(--color-text-main)] mb-8">
        {id ? 'Editar Campanha' : 'Nova Campanha'}
      </h1>

      <Stepper current={step} />

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* STEP 1 — Configuração */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 pb-10 mb-6 shadow-sm animate-scaleIn max-w-2xl w-full mx-auto">
            <h2 className="text-[20px] font-bold text-[#240B4B] mb-6">Configuração da Campanha</h2>

            {/* Nome */}
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-[#240B4B] text-sm font-bold">Nome da campanha *</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Turma Natação — Março 2025"
                className="w-full px-4 py-3 border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-[#54456B] font-medium"
              />
            </div>

            {/* Template */}
            <div className="flex flex-col gap-2 mb-4">
              <label className="text-[#240B4B] text-sm font-bold">Template (apenas aprovados) *</label>
              {/* Tag filter */}
              <div className="flex gap-2 flex-wrap mb-2">
                <button
                  onClick={() => setTagFilter('')}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${!tagFilter ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white text-gray-500 border-gray-200 hover:border-[var(--color-primary)]'}`}
                >
                  Todos
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setTagFilter(tag.id === tagFilter ? '' : tag.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${tagFilter === tag.id ? 'ring-2 ring-offset-1' : 'hover:border-[var(--color-primary)]'}`}
                    style={tagFilter === tag.id
                      ? { backgroundColor: tag.cor, color: '#fff', borderColor: tag.cor }
                      : { borderColor: `${tag.cor}60`, backgroundColor: `${tag.cor}10`, color: tag.cor }
                    }
                  >
                    {tag.nome}
                  </button>
                ))}
              </div>
              <CustomSelect
                value={selectedTemplate?.id || ''}
                onChange={val => {
                  const found = templates.find(t => t.id === val);
                  setSelectedTemplate(found || null);
                }}
                placeholder="Selecione um template..."
                options={filteredTemplates.map(t => ({ value: t.id, label: t.nome }))}
              />
            </div>

            {/* Lista */}
            <div className="flex flex-col gap-2 mb-8">
              <label className="text-[#240B4B] text-sm font-bold">Lista de contatos *</label>
              <CustomSelect
                value={selectedList?.id || ''}
                onChange={val => {
                  const found = lists.find(l => l.id === val);
                  setSelectedList(found || null);
                }}
                placeholder="Selecione uma lista..."
                options={lists.map(l => ({ value: l.id, label: l.nome }))}
              />
            </div>

          </div>
          {/* Rodapé FORA do card */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200 max-w-2xl mx-auto w-full">
            <button
              onClick={() => navigate('/campanhas')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#EAE2F5] text-[#54456B] font-bold hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Cancelar a Campanha
            </button>
            <button
              disabled={!step1Valid}
              onClick={advanceStep}
              className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 text-white px-6 py-2 h-[46px] rounded-lg font-bold transition-all"
            >
              Avançar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* STEP 2 — Variáveis */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <>
          <div className="animate-scaleIn max-w-5xl w-full mx-auto mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Left: Mapping */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
                <h2 className="text-[18px] font-bold text-[#240B4B] mb-1">Mapeamento de Variáveis</h2>
                <p className="text-sm text-gray-500 mb-6">Para cada variável do template, escolha a coluna da lista ou informe um valor fixo.</p>

                {templateVars.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Check className="w-10 h-10 mx-auto mb-2 text-green-400" />
                    <p className="font-semibold">Este template não tem variáveis!</p>
                    <p className="text-sm">Nenhum mapeamento necessário.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {templateVars.map(varName => {
                      const mode = mappingMode[varName] || 'column';
                      const cols = selectedList?.colunas || [];
                      return (
                        <div key={varName} className="flex flex-col gap-2">
                          <label className="text-[#240B4B] text-sm font-bold flex items-center gap-2">
                            <span className="bg-purple-100 text-[var(--color-primary)] px-2 py-0.5 rounded font-mono text-s">{`{{${varName}}}`}</span>
                          </label>

                          {/* Mode toggle */}
                          <div className="flex rounded-lg border border-[#EAE2F5] overflow-hidden text-s font-bold">
                            <button
                              onClick={() => setMappingMode(prev => ({ ...prev, [varName]: 'column' }))}
                              className={`flex-1 py-2 transition-colors ${mode === 'column' ? 'bg-[var(--color-primary)] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                              Coluna da lista
                            </button>
                            <button
                              onClick={() => setMappingMode(prev => ({ ...prev, [varName]: 'fixed' }))}
                              className={`flex-1 py-2 transition-colors ${mode === 'fixed' ? 'bg-[var(--color-primary)] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                              Valor fixo
                            </button>
                          </div>

                          {mode === 'column' ? (
                            <CustomSelect
                              value={mapping[varName] || ''}
                              onChange={val => setMapping(prev => ({ ...prev, [varName]: val }))}
                              placeholder="Selecione a coluna..."
                              options={cols.map(col => ({ value: col, label: col }))}
                              className="text-sm"
                            />
                          ) : (
                            <input
                              type="text"
                              value={fixedValues[varName] || ''}
                              onChange={e => setFixedValues(prev => ({ ...prev, [varName]: e.target.value }))}
                              placeholder="Digite o valor fixo..."
                              className="w-full px-3 py-2.5 border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-[#54456B] font-medium text-sm"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Preview */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm flex flex-col">
                <h2 className="text-[18px] font-bold text-[#240B4B] mb-1">Preview em Tempo Real</h2>
                <p className="text-sm text-gray-500 mb-4">Substituindo com dados do 1º contato da lista</p>

                <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-6 h-6 text-[var(--color-primary)]" />
                    <span className="text-sm font-bold text-[#240B4B]">{selectedTemplate?.nome}</span>
                  </div>
                  <hr className="border-gray-200 mb-3" />
                  <div className="text-md text-[#54456B] whitespace-pre-wrap leading-relaxed font-medium p-2">
                    {previewText || selectedTemplate?.texto || '—'}
                  </div>
                </div>

                {!firstContact && selectedList && (
                  <p className="text-xs text-gray-400 mt-3 italic text-center">
                    Nenhum contato encontrado na lista para o preview.
                  </p>
                )}
              </div>
            </div>

          </div>
          {/* Rodapé FORA do card */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200 max-w-5xl mx-auto w-full">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 h-[46px] rounded-lg border-2 border-[#EAE2F5] text-[#54456B] font-bold hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button
              disabled={!step2Valid}
              onClick={advanceStep}
              className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 text-white px-6 py-2 h-[46px] rounded-lg font-bold transition-all"
            >
              Avançar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* STEP 3 — Agendamento */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 pb-10 mb-6 shadow-sm animate-scaleIn max-w-2xl w-full mx-auto">
            <h2 className="text-[20px] font-bold text-[#240B4B] mb-6">Agendamento</h2>

            <div className="flex flex-col gap-4 mb-6">
              {/* Disparar agora */}
              <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${dispatchMode === 'now' ? 'border-[var(--color-primary)] bg-purple-50' : 'border-[#EAE2F5] hover:border-gray-300'
                }`}>
                <input
                  type="radio"
                  name="dispatchMode"
                  value="now"
                  checked={dispatchMode === 'now'}
                  onChange={() => { setDispatchMode('now'); setScheduleError(''); }}
                  className="mt-1 accent-[var(--color-primary)]"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-[#240B4B]">Disparar agora</span>
                  </div>
                  <p className="text-sm text-gray-500">A campanha será iniciada imediatamente após a confirmação.</p>
                </div>
              </label>

              {/* Agendar */}
              <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${dispatchMode === 'schedule' ? 'border-[var(--color-primary)] bg-purple-50' : 'border-[#EAE2F5] hover:border-gray-300'
                }`}>
                <input
                  type="radio"
                  name="dispatchMode"
                  value="schedule"
                  checked={dispatchMode === 'schedule'}
                  onChange={() => setDispatchMode('schedule')}
                  className="mt-1 accent-[var(--color-primary)]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-[#240B4B]">Agendar para uma data específica</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Fuso horário: America/Sao_Paulo (UTC-3)</p>

                  {dispatchMode === 'schedule' && (
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={localNowString()}
                      onChange={e => { setScheduledAt(e.target.value); setScheduleError(''); }}
                      className="w-full px-4 py-2.5 border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-[#54456B] font-medium"
                    />
                  )}
                </div>
              </label>
            </div>

            {/* Schedule error */}
            {scheduleError && (
              <div className="flex items-center gap-2 text-red-600 text-sm font-semibold mb-4 bg-red-50 px-4 py-2.5 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {scheduleError}
              </div>
            )}

            {/* Summary */}
            {dispatchMode === 'schedule' && scheduleDisplay && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 font-semibold mb-6">
                📅 Esta campanha será disparada em: <strong>{scheduleDisplay}</strong>
              </div>
            )}

          </div>
          {/* Rodapé FORA do card */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200 max-w-2xl mx-auto w-full">
            <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2 h-[46px] rounded-lg border-2 border-[#EAE2F5] text-[#54456B] font-bold hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button
              onClick={advanceStep}
              className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-2 h-[46px] rounded-lg font-bold transition-all"
            >
              Avançar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* STEP 4 — Revisão */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {step === 4 && (
        <>
          <div className="animate-scaleIn max-w-4xl w-full mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

              {/* Summary */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
                <h2 className="text-[18px] font-bold text-[#240B4B] mb-4">Resumo</h2>
                <div className="flex flex-col gap-4 mb-4">
                  <SummaryRow icon={ClipboardList} label="Campanha" value={nome} />
                  <SummaryRow icon={MessageSquare} label="Template" value={selectedTemplate?.nome} />
                  <SummaryRow icon={Users} label="Lista" value={selectedList?.nome} />
                  <SummaryRow
                    icon={Calendar}
                    label="Disparo"
                    value={dispatchMode === 'now' ? 'Imediato' : (scheduleDisplay ? `Agendado: ${scheduleDisplay}` : '—')}
                  />
                </div>

                {/* Mapping summary */}
                {templateVars.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#EAE2F5]">
                    <p className="text-md font-semibold text-[#240B4B] mb-2">Mapeamento de variáveis:</p>
                    <div className="flex flex-col">
                      {Object.entries(finalMapping).map(([variavel, valor], idx) => (
                        <div key={variavel}
                          className="flex items-center gap-3 py-2"
                          style={idx !== Object.entries(finalMapping).length - 1 ? { borderBottom: '1px solid #F3F4F6' } : {}}
                        >
                          <span
                            className="text-sm font-mono px-2 py-0.5 rounded"
                            style={{ color: '#7C3AED', backgroundColor: '#F3EEFF' }}
                          >
                            {`{{${variavel}}}`}
                          </span>
                          <span className="text-gray-300 text-sm shrink-0">→</span>
                          <span className="text-sm font-semibold text-gray-800">{valor || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Message Preview */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm flex flex-col">
                <h2 className="text-[18px] font-bold text-[#240B4B] mb-1">Preview da Mensagem</h2>
                <p className="text-xs text-gray-500 mb-4">Com dados do 1º contato da lista</p>
                <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-6 h-6 text-[var(--color-primary)]" />
                    <span className="text-sm font-bold text-[#240B4B]">{selectedTemplate?.nome}</span>
                  </div>
                  <hr className="border-gray-200 mb-3" />
                  <div className="text-sm text-[#54456B] whitespace-pre-wrap leading-relaxed font-medium p-2">
                    {previewText || selectedTemplate?.texto || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
          </div>
          {/* Rodapé FORA dos cards */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200 max-w-4xl mx-auto w-full">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-4 py-2 h-[46px] rounded-lg border-2 border-[#EAE2F5] text-[#54456B] font-bold hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => handleSave('rascunho')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 h-[46px] rounded-lg border-2 border-[#EAE2F5] text-[#54456B] font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Salvar Rascunho
              </button>
              <button
                onClick={() => handleSave('confirmar')}
                disabled={isSaving}
                className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-2 h-[46px] rounded-lg font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : (
                  id ? 'Confirmar e Disparar' : (
                    dispatchMode === 'now' ? (
                      <><Zap className="w-4 h-4" /> Confirmar e Disparar</>
                    ) : (
                      <><Calendar className="w-4 h-4" /> Confirmar e Agendar</>
                    )
                  )
                )}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

// ─── Helper Component ─────────────────────────────────────────────────────────
function SummaryRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-1.5 bg-purple-50 rounded-md flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
      </div>
      <div>
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-[#240B4B]">{value || '—'}</p>
      </div>
    </div>
  );
}
