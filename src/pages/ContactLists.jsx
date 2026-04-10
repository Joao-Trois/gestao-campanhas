import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Users, Search, Trash2, ExternalLink, Calendar, AlertCircle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonBlock } from '../components/Skeleton';

export default function ContactLists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  
  // Modal de Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchLists();
  }, []);

  async function fetchLists() {
    setLoading(true);
    const { data, error } = await supabase
      .from('listas_contatos')
      .select(`
        *,
        contatos:contatos(count)
      `)
      .order('criado_em', { ascending: false });

    if (error) {
      showToast('error', 'Erro ao buscar listas: ' + error.message);
    } else {
      // Normaliza o count que vem do Supabase (dependendo da versão/formato)
      const normalized = data.map(item => ({
        ...item,
        total_contatos: item.contatos?.[0]?.count || 0
      }));
      setLists(normalized);
    }
    setLoading(false);
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  const filteredLists = lists.filter(l => 
    l.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleDeleteList() {
    if (!listToDelete) return;
    setIsDeleting(true);

    try {
      // Regra de Negócio: Verificar se está em uso por alguma campanha
      const { data: campaignCheck, error: checkError } = await supabase
        .from('campanhas')
        .select('id')
        .eq('lista_id', listToDelete.id)
        .limit(1);

      if (checkError) throw checkError;

      if (campaignCheck && campaignCheck.length > 0) {
        showToast('error', 'Esta lista está vinculada a uma ou mais campanhas e não pode ser excluída.');
        setIsDeleteModalOpen(false);
        return;
      }

      // Procede com a exclusão
      const { error: deleteError } = await supabase
        .from('listas_contatos')
        .delete()
        .eq('id', listToDelete.id);

      if (deleteError) throw deleteError;

      setLists(lists.filter(l => l.id !== listToDelete.id));
      showToast('success', 'Lista excluída com sucesso!');
      setIsDeleteModalOpen(false);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsDeleting(false);
      setListToDelete(null);
    }
  }

  return (
    <div className="flex-1 flex flex-col pt-8 pb-10 relative h-full overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-semibold transition-all animate-fadeIn ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="px-[26px] mb-8 flex justify-between items-center flex-shrink-0 animate-fadeIn text-[#240B4B]">
        <h1 className="text-[36px] font-bold">Listas de Contatos</h1>
        <button 
          onClick={() => navigate('/listas/importar')}
          className="flex items-center gap-2 bg-[#8144E2] hover:bg-[#6b35bf] text-white px-4 h-[42px] rounded-lg font-semibold text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Lista
        </button>
      </div>

      {/* Filtros */}
      <div className="px-[26px] mb-6 flex gap-4 animate-scaleIn relative z-10">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar por nome da lista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[#8144E2] transition-colors text-[#54456B] font-medium"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 px-[26px] overflow-y-auto pb-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-[#EAE2F5] rounded-xl p-5 shadow-sm flex flex-col gap-4"
              >
                <div className="flex justify-between items-start">
                  <SkeletonBlock className="w-11 h-11 rounded-lg" />
                  <div className="flex items-center gap-1">
                    <SkeletonBlock className="w-8 h-8 rounded-md" />
                    <SkeletonBlock className="w-8 h-8 rounded-md" />
                  </div>
                </div>
                <div>
                  <SkeletonBlock className="h-5 w-3/4 mb-2" />
                  <div className="flex items-center gap-4">
                    <SkeletonBlock className="h-3 w-20" />
                    <SkeletonBlock className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="bg-white border border-[#EAE2F5] rounded-xl p-12 text-center animate-scaleIn">
            <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#240B4B] mb-2">Nenhuma lista encontrada</h3>
            <p className="text-gray-500 mb-6 max-w-xs mx-auto text-sm">Crie sua primeira lista de contatos importando um arquivo Excel (.xlsx).</p>
            <button 
              onClick={() => navigate('/listas/importar')}
              className="inline-flex items-center gap-2 text-[#8144E2] font-bold hover:underline"
            >
              <Plus className="w-4 h-4" />
              Importar contatos agora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLists.map((list) => (
              <div 
                key={list.id}
                className="group bg-white border border-[#EAE2F5] hover:border-[#8144E2] rounded-xl p-5 shadow-sm transition-all animate-scaleIn flex flex-col gap-4 relative"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-purple-50 rounded-lg">
                    <Users className="w-6 h-6 text-[#8144E2]" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => navigate(`/listas/${list.id}`)}
                      title="Ver contatos"
                      className="p-2 text-gray-400 hover:text-[#8144E2] transition-colors rounded-md hover:bg-purple-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setListToDelete(list);
                        setIsDeleteModalOpen(true);
                      }}
                      title="Excluir lista"
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-[#240B4B] mb-1 truncate" title={list.nome}>
                    {list.nome}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-[#54456B] font-medium">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {list.total_contatos} contatos
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(list.criado_em).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div 
                  className="absolute bottom-0 left-0 h-1 bg-[#8144E2] transition-all rounded-b-xl"
                  style={{ width: '0%', groupHover: { width: '100%' } }} // Apenas visual
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn">
          <div className="bg-[#FCFBFD] border border-[#EAE2F5] rounded-xl w-full max-w-[400px] p-6 shadow-2xl flex flex-col gap-6 animate-scaleIn">
            <h2 className="text-[#240B4B] text-[20px] font-semibold text-center">
              Excluir lista de contatos?
            </h2>
            <p className="text-center text-[#54456B]">
              Esta ação removerá permanentemente a lista <strong className="text-[#240B4B]">{listToDelete?.nome}</strong> e todos os contatos vinculados a ela.
            </p>

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 text-[#54456B] text-[18px] font-semibold border-2 border-[#EAE2F5] rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteList}
                disabled={isDeleting}
                className="flex-1 py-3 text-white text-[18px] font-semibold bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
