import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Tag as TagIcon, Trash2, Edit2, X, Check, AlertCircle } from 'lucide-react';
import { SkeletonBlock } from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';

const PREDEFINED_COLORS = [
  '#6C3FC8', '#FF4B4B', '#FF9F1C', '#F4E23C',
  '#00D26A', '#00B8D9', '#2D9CDB', '#E83E8C'
];

export default function Tags() {
  const { profile } = useAuth();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // General States
  const [toast, setToast] = useState(null);

  // Modal States - Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentTag, setCurrentTag] = useState({ id: null, nome: '', cor: PREDEFINED_COLORS[0] });
  const [isSaving, setIsSaving] = useState(false);

  // Modal States - Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      showToast('error', 'Erro ao buscar tags: ' + error.message);
    } else if (data) {
      setTags(data);
    }
    setLoading(false);
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  function openCreateModal() {
    setModalMode('create');
    setCurrentTag({ id: null, nome: '', cor: PREDEFINED_COLORS[0] });
    setIsModalOpen(true);
  }

  function openEditModal(tag) {
    setModalMode('edit');
    setCurrentTag({ id: tag.id, nome: tag.nome, cor: tag.cor });
    setIsModalOpen(true);
  }

  function openDeleteModal(tag) {
    setTagToDelete(tag);
    setIsDeleteModalOpen(true);
  }

  async function handleSaveTag(e) {
    e.preventDefault();
    if (!currentTag.nome.trim()) return;

    setIsSaving(true);

    try {
      if (modalMode === 'create') {
        const { data, error } = await supabase
          .from('tags')
          .insert([{ nome: currentTag.nome.trim(), cor: currentTag.cor, grupo_id: profile.grupo_id }])
          .select();

        if (error) throw error;
        setTags([data[0], ...tags]);
        showToast('success', 'Tag criada com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('tags')
          .update({ nome: currentTag.nome.trim(), cor: currentTag.cor })
          .eq('id', currentTag.id)
          .select();

        if (error) throw error;
        setTags(tags.map(t => t.id === currentTag.id ? data[0] : t));
        showToast('success', 'Tag atualizada com sucesso!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err.message.includes('row-level security')) {
        showToast('error', 'Permissão negada. Apenas administradores podem gerenciar tags.');
      } else if (err.code === '23505') {
        showToast('error', 'Já existe uma tag com este nome.');
      } else {
        showToast('error', err.message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTag() {
    if (!tagToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagToDelete.id);

      if (error) throw error;

      setTags(tags.filter(t => t.id !== tagToDelete.id));
      showToast('success', 'Tag excluída com sucesso!');
      setIsDeleteModalOpen(false);
      setTagToDelete(null);
    } catch (err) {
      console.error(err);
      if (err.message.includes('row-level security')) {
        showToast('error', 'Permissão negada. Apenas administradores podem excluir tags.');
      } else {
        showToast('error', err.message);
      }
    } finally {
      setIsDeleting(false);
    }
  }

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
      <div className="px-[26px] mb-8 flex justify-between items-center flex-shrink-0">
        <h1 className="text-[36px] font-bold text-[var(--color-text-main)]">Tags</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 h-[42px] rounded-lg font-semibold text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Tag
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-[26px] overflow-y-auto pb-8">
        {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="w-4 h-4 rounded-full" />
                  <SkeletonBlock className="h-4 w-28" />
                </div>
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="w-8 h-8 rounded-md" />
                  <SkeletonBlock className="w-8 h-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : tags.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-8 text-center shadow-sm">
            <TagIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma tag cadastrada ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tags.map((tag, index) => (
              <div
                key={tag.id}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 flex items-center justify-between shadow-sm hover:border-[var(--color-primary)] transition-colors animate-slideInUp"
                style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.cor }}
                  />
                  <span className="font-semibold text-[var(--color-text-main)] text-base">{tag.nome}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(tag)}
                    className="p-2 text-gray-400 hover:text-[var(--color-primary)] transition-colors rounded-md hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(tag)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal (Figma Ref: 124:1168 Popup Creation Structure) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 animate-fadeIn">
          <div className="bg-[#FCFBFD] border border-[#EAE2F5] rounded-xl w-full max-w-[420px] p-6 shadow-2xl flex flex-col gap-6 relative animate-scaleIn">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col gap-2">
              <h2 className="text-[#240B4B] text-[20px] font-semibold leading-none">
                {modalMode === 'create' ? 'Nova Tag' : 'Editar Tag'}
              </h2>
            </div>

            <form onSubmit={handleSaveTag} className="flex flex-col gap-6">

              <div className="flex flex-col gap-2">
                <label htmlFor="tagName" className="text-[#240B4B] text-[16px] font-semibold">
                  Nome da tag:
                </label>
                <div className="border border-[#EAE2F5] focus-within:border-[#8144E2] bg-white rounded-lg p-3 transition-colors">
                  <input
                    autoComplete="off"
                    id="tagName"
                    type="text"
                    required
                    value={currentTag.nome}
                    onChange={(e) => setCurrentTag({ ...currentTag, nome: e.target.value })}
                    className="w-full outline-none text-[#54456B] font-medium text-[16px] placeholder-gray-400"
                    placeholder="Ex: Turma de Natação"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[#240B4B] text-[16px] font-semibold">
                  Cor:
                </label>
                <div className="flex flex-wrap gap-3">
                  {PREDEFINED_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCurrentTag({ ...currentTag, cor: color })}
                      className={`w-8 h-8 rounded-full transition-transform ${currentTag.cor === color ? 'scale-125 ring-2 ring-offset-2 ring-[#8144E2]' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="mt-2 w-full flex justify-center items-center py-3 bg-[#894BEA] hover:bg-[#723bc5] text-white rounded-lg text-lg font-semibold transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : (modalMode === 'create' ? 'Criar tag' : 'Salvar alterações')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Figma Ref: 206:1062) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn">
          <div className="bg-[#FCFBFD] border border-[#EAE2F5] rounded-xl w-full max-w-[400px] p-6 shadow-2xl flex flex-col gap-6 animate-scaleIn">

            <h2 className="text-[#240B4B] text-[20px] font-semibold text-center">
              Você tem certeza?
            </h2>
            <p className="text-center text-[#54456B]">
              Deseja remover a tag <strong className="text-[#240B4B]">{tagToDelete?.nome}</strong> permanentemente?
            </p>

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 text-[#54456B] text-[18px] font-semibold border-2 border-[#EAE2F5] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTag}
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
