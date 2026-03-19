import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, AlertCircle, Check, MessageSquare } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function TemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [allTags, setAllTags] = useState([]);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    texto: '',
    variaveis: []
  });
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => {
    loadBaseData();
  }, [id]);

  async function loadBaseData() {
    // 1. Carrega todas as tags disponíveis
    const { data: tagsDB } = await supabase.from('tags').select('id, nome, cor').order('nome');
    if (tagsDB) setAllTags(tagsDB);

    // 2. Se for edição, carrega dados do template
    if (isEditing) {
      const { data: template, error } = await supabase
        .from('templates')
        .select(`*, template_tags(tag_id)`)
        .eq('id', id)
        .single();

      if (template) {
        setFormData({
          nome: template.nome,
          descricao: template.descricao || '',
          texto: template.texto || '',
          variaveis: template.variaveis || []
        });
        setSelectedTags(template.template_tags.map(tt => tt.tag_id));
      } else {
        showToast('error', 'Template não encontrado.');
      }
    }
    setLoading(false);
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  function handleTextChange(e) {
    const text = e.target.value;

    // Detect variables in format {{NomeDaVar}} or {{1}}
    const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    const matches = [...text.matchAll(regex)];
    const uniqueVars = [...new Set(matches.map(m => m[1]))];

    setFormData({
      ...formData,
      texto: text,
      variaveis: uniqueVars
    });
  }

  function toggleTag(tagId) {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.texto.trim()) {
      showToast('error', 'Preencha os campos obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      let savedTemplateId = id;

      if (isEditing) {
        // UPDATE Template
        const { error: tError } = await supabase
          .from('templates')
          .update({
            nome: formData.nome,
            descricao: formData.descricao || null,
            texto: formData.texto,
            variaveis: formData.variaveis,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', id);

        if (tError) throw tError;

        // Limpa as tags antigas e insere as novas (N:N)
        await supabase.from('template_tags').delete().eq('template_id', id);
        if (selectedTags.length > 0) {
          const relationInserts = selectedTags.map(tag_id => ({ template_id: id, tag_id }));
          await supabase.from('template_tags').insert(relationInserts);
        }

        showToast('success', 'Template atualizado com sucesso!');
      } else {
        // CREATE Template
        const { data: newTemplate, error: iError } = await supabase
          .from('templates')
          .insert([{
            nome: formData.nome,
            descricao: formData.descricao || null,
            texto: formData.texto,
            variaveis: formData.variaveis
          }])
          .select()
          .single();

        if (iError) throw iError;
        savedTemplateId = newTemplate.id;

        // Insere relaçoes N:N
        if (selectedTags.length > 0) {
          const relationInserts = selectedTags.map(tag_id => ({ template_id: savedTemplateId, tag_id }));
          await supabase.from('template_tags').insert(relationInserts);
        }

        showToast('success', 'Template salvo com sucesso!');
        setTimeout(() => navigate('/templates'), 1500);
      }
    } catch (err) {
      console.error(err);
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  // Renderiza a mensagem destacando as variáveis detectadas para o Preview
  const renderPreview = () => {
    if (!formData.texto) return <span className="text-gray-400 italic">Digite uma mensagem para ver o preview...</span>;

    // Separa o texto pelo padrão das variáveis
    const parts = formData.texto.split(/(\{\{[a-zA-Z0-9_]+\}\})/g);

    return parts.map((part, index) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return (
          <span key={index} className="bg-[var(--color-primary)] bg-opacity-10 text-white font-bold px-1.5 py-0.5 rounded mx-0.5 border border-[var(--color-primary)] border-opacity-20 inline-block">
            {part}
          </span>
        );
      }
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  if (loading) {
    return <div className="p-8 text-[var(--color-text-main)] font-semibold">Carregando dados...</div>;
  }

  return (
    <div className="flex-1 flex flex-col pt-8 pb-10 relative overflow-y-auto h-full animate-fadeIn">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-semibold transition-all ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="px-[26px] mb-8 flex flex-col gap-2 flex-shrink-0">
        <button
          onClick={() => navigate('/templates')}
          className="flex items-center gap-1 text-gray-500 hover:text-[var(--color-primary)] transition-colors w-fit font-semibold text-sm mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex justify-between items-center">
          <h1 className="text-[36px] font-bold text-[var(--color-text-main)]">
            {isEditing ? 'Editar Template' : 'Novo Template'}
          </h1>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 h-[42px] rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Template'}
          </button>
        </div>
      </div>

      {/* Main Content Form */}
      <div className="flex-1 px-[26px] grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Esquerda: Formulário de Cadastro */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-[var(--color-bg-card)] border border-[#EAE2F5] rounded-xl p-6 shadow-sm flex flex-col gap-5">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[16px] font-semibold text-[#240B4B]">Nome do template *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[#54456B] font-medium"
                  placeholder="Ex: Cobrança Mensal"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[16px] font-semibold text-[#240B4B]">Descrição Interna</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[#54456B] font-medium"
                  placeholder="Usado na régua de D-2"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex justify-between items-end">
                <label className="text-[16px] font-semibold text-[#240B4B]">Corpo da Mensagem *</label>
                <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">Use {'{{Variavel}}'}</span>
              </div>
              <textarea
                required
                rows={6}
                value={formData.texto}
                onChange={handleTextChange}
                className="w-full px-4 py-3 border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[#54456B] font-medium resize-y"
                placeholder="Olá {{Nome}}, seu boleto no valor de {{Valor}} vence dia..."
              />
            </div>

            {/* Selector de Tags Opcionais */}
            <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-[#EEF0F4]">
              <label className="text-[16px] font-semibold text-[#240B4B]">Associar Tags (Opcional)</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`text-sm font-semibold px-3 py-1.5 rounded-md flex items-center flex-wrap gap-2 transition-all border ${isSelected ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] shadow-sm' : 'border-[#EAE2F5] hover:border-gray-400 opacity-70'}`}
                      style={{ backgroundColor: isSelected ? '#FCFBFD' : '#F9F9FB', color: '#240B4B' }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.cor }}></span>
                      {tag.nome}
                    </button>
                  );
                })}
                {allTags.length === 0 && <span className="text-sm text-gray-400">Nenhuma tag criada ainda no sistema.</span>}
              </div>
            </div>

          </div>
        </div>

        {/* Direita: Preview Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-primary)] border-opacity-20 rounded-xl p-6 shadow-sm sticky top-0 flex flex-col h-fit">
            <h3 className="font-bold text-[18px] text-[var(--color-primary)] mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Preview Meta / WhatsApp
            </h3>

            <div className="bg-[#EAE2F5] bg-opacity-30 p-4 rounded-lg flex flex-col gap-2 border border-[#EAE2F5]">
              <p className="text-[#240B4B] text-[15px] leading-relaxed break-words font-medium">
                {renderPreview()}
              </p>
            </div>

            {/* Variáveis detectadas */}
            {formData.variaveis.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[#EAE2F5]">
                <h4 className="text-sm font-semibold text-gray-500 mb-3">Variáveis mapeadas ({formData.variaveis.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.variaveis.map((v, idx) => (
                    <span key={idx} className="bg-[var(--color-primary)] text-white text-xs font-bold px-2.5 py-1 rounded">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
