import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Archive, ArchiveRestore, Edit2, MessageSquare, AlertCircle, ChevronRight, Trash2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const navigate = useNavigate();

  // General States
  const [toast, setToast] = useState(null);

  // Modal States - Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  function openDeleteModal(template) {
    setTemplateToDelete(template);
    setIsDeleteModalOpen(true);
  }

  async function handleDeleteTemplate() {
    if (!templateToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateToDelete.id);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== templateToDelete.id));
      showToast('success', 'Template excluído permanentemente!');
      setIsDeleteModalOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      console.error(err);
      if (err.message.includes('row-level security')) {
        showToast('error', 'Permissão negada. Apenas administradores podem excluir templates.');
      } else {
        showToast('error', err.message);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    fetchData();

    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchData() {
    setLoading(true);

    // Busca todas as tags para o filtro
    const { data: tagsData } = await supabase.from('tags').select('*').order('nome');
    if (tagsData) setAllTags(tagsData);

    // Busca templates com suas tags usando a tabela associativa template_tags
    const { data: templatesData, error } = await supabase
      .from('templates')
      .select(`
        *,
        template_tags (
          tags (id, nome, cor)
        )
      `)
      .order('criado_em', { ascending: false });

    if (!error && templatesData) {
      // Normalizar a estrutura para facilitar o map nas views
      const normalized = templatesData.map(t => ({
        ...t,
        tags: t.template_tags.map(tt => tt.tags).filter(Boolean)
      }));
      setTemplates(normalized);
    }
    setLoading(false);
  }

  async function toggleArchive(template) {
    const novoStatus = !template.ativo;
    const { error } = await supabase
      .from('templates')
      .update({ ativo: novoStatus })
      .eq('id', template.id);

    if (!error) {
      setTemplates(templates.map(t => t.id === template.id ? { ...t, ativo: novoStatus } : t));
    }
  }

  const filteredTemplates = templates.filter(t => {
    // Filtro Arquivados
    if (!showArchived && !t.ativo) return false;
    if (showArchived && t.ativo) return false;

    // Filtro Nome
    if (searchTerm && !t.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;

    // Filtro Tag
    if (selectedTagFilter) {
      const hasTag = t.tags.some(tag => tag.id === selectedTagFilter);
      if (!hasTag) return false;
    }

    return true;
  });

  return (
    <div className="flex-1 flex flex-col pt-8 pb-10 relative h-full overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-semibold transition-all ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="px-[26px] mb-8 flex justify-between items-center flex-shrink-0 animate-fadeIn">
        <h1 className="text-[36px] font-bold text-[var(--color-text-main)]">Templates</h1>
        <button
          onClick={() => navigate('/templates/novo')}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 h-[42px] rounded-lg font-semibold text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      {/* Filtros */}
      <div className="px-[26px] mb-6 flex gap-4 animate-scaleIn relative z-50">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-[#54456B] font-medium"
          />
        </div>

        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center justify-between gap-3 min-w-[200px] px-4 py-2.5 bg-white border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-[#54456B] font-medium"
          >
            <div className="flex items-center gap-2.5">
              {selectedTagFilter ? (
                <>
                  <span
                    className="w-2.5 h-2.5 rounded-full block flex-shrink-0"
                    style={{ backgroundColor: allTags.find(t => t.id === selectedTagFilter)?.cor || 'transparent' }}
                  />
                  <span className="truncate max-w-[120px]">{allTags.find(t => t.id === selectedTagFilter)?.nome}</span>
                </>
              ) : (
                <span>Todas as Tags</span>
              )}
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isFilterOpen ? 'rotate-90' : ''}`} />
          </button>

          {isFilterOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-[#EAE2F5] rounded-xl shadow-lg z-50 py-2 overflow-hidden animate-fadeIn">
              <button
                onClick={() => {
                  setSelectedTagFilter('');
                  setIsFilterOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${!selectedTagFilter
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-[#54456B] hover:bg-gray-100'
                  }`}
              >
                Todas as Tags
              </button>
              <div className="max-h-[280px] overflow-y-auto">
                {allTags.map(tag => {
                  const isSelected = selectedTagFilter === tag.id;
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setSelectedTagFilter(tag.id);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm font-medium transition-colors ${isSelected
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-[#54456B] hover:bg-gray-100'
                        }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full block flex-shrink-0"
                        style={{ backgroundColor: tag.cor }}
                      />
                      <span className="truncate">{tag.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-4 py-2.5 border rounded-lg font-semibold transition-colors flex items-center gap-2 ${showArchived ? 'bg-[#F8F3FC] border-[var(--color-primary)] text-[var(--color-primary)]' : 'bg-white border-[#EAE2F5] text-gray-500 hover:bg-gray-50'}`}
        >
          <Archive className="w-4 h-4" />
          Ver Arquivados
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-[26px] overflow-y-auto pb-8">
        {loading ? (
          <p className="text-[var(--color-text-main)] font-medium">Carregando...</p>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-8 text-center shadow-sm animate-scaleIn">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum template encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`bg-[var(--color-bg-card)] border ${template.ativo ? 'border-[var(--color-border)] hover:border-[var(--color-primary)]' : 'border-gray-200 opacity-60'} rounded-lg p-5 flex flex-col gap-4 shadow-sm transition-all animate-scaleIn`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-[18px] text-[var(--color-text-main)]">
                        {template.nome}
                      </h3>
                      {template.meta_status === 'aprovado' ? (
                        <span className="bg-green-100 text-green-700 text-[11px] py-1 px-2 font-bold rounded-full">✓ Aprovado</span>
                      ) : template.meta_status === 'recusado' ? (
                        <span className="bg-red-100 text-red-700 text-[11px] py-1 px-2 font-bold rounded-full">✗ Recusado</span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[11px] py-1 px-2 font-bold rounded-full">⏳ Pendente</span>
                      )}
                    </div>
                    {template.meta_template_id && (
                      <p className="text-xs text-gray-500 font-mono">Meta ID: {template.meta_template_id}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/templates/${template.id}`)}
                      title="Editar"
                      className="p-2 text-gray-400 hover:text-[var(--color-primary)] transition-colors rounded-md hover:bg-gray-50"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!template.ativo ? (
                      <>
                        <button
                          onClick={() => toggleArchive(template)}
                          title="Reativar"
                          className="p-2 text-gray-400 hover:text-green-500 transition-colors rounded-md hover:bg-green-50"
                        >
                          <ArchiveRestore className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(template)}
                          title="Excluir"
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleArchive(template)}
                        title="Arquivar"
                        className="p-2 text-gray-400 hover:text-orange-500 transition-colors rounded-md hover:bg-orange-50"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-[#54456B] line-clamp-2 min-h-[40px]">
                  {template.descricao || 'Nenhuma descrição fornecida.'}
                </p>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {template.tags?.length > 0 ? (
                    template.tags.map(tag => (
                      <span key={tag.id} className="text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1.5 border" style={{ borderColor: `${tag.cor}40`, backgroundColor: `${tag.cor}10`, color: tag.cor }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.cor }}></span>
                        {tag.nome}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">Nenhuma tag</span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn">
          <div className="bg-[#FCFBFD] border border-[#EAE2F5] rounded-xl w-full max-w-[400px] p-6 shadow-2xl flex flex-col gap-6 animate-scaleIn">

            <h2 className="text-[#240B4B] text-[20px] font-semibold text-center">
              Excluir template permanentemente?
            </h2>
            <p className="text-center text-[#54456B]">
              Esta ação não pode ser desfeita. O template será removido do banco de dados.
            </p>

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 text-[#54456B] text-[18px] font-semibold border-2 border-[#EAE2F5] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTemplate}
                disabled={isDeleting}
                className="flex-1 py-3 text-white text-[18px] font-semibold bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Removendo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
