import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Users, 
  Search, 
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { SkeletonBlock } from '../components/Skeleton';

export default function ContactListDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchListData();
  }, [id]);

  async function fetchListData() {
    setLoading(true);
    try {
      // 1. Busca meta-dados da lista
      const { data: listData, error: listError } = await supabase
        .from('listas_contatos')
        .select('*')
        .eq('id', id)
        .single();

      if (listError) throw listError;
      setList(listData);

      // 2. Busca contatos da lista
      const { data: contactsData, error: contactsError } = await supabase
        .from('contatos')
        .select('*')
        .eq('lista_id', id);

      if (contactsError) throw contactsError;
      setContacts(contactsData);

    } catch (err) {
      console.error(err);
      showToast('error', 'Erro ao carregar lista: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  const filteredContacts = contacts.filter(c => {
    const search = searchTerm.toLowerCase();
    const phone = c.telefone.toLowerCase();
    // Busca dentro do JSON de dados também (valores)
    const extraData = Object.values(c.dados || {}).join(' ').toLowerCase();
    
    return phone.includes(search) || extraData.includes(search);
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col pt-8 pb-10 px-[26px] h-full overflow-hidden animate-fadeIn">
        {/* Back button skeleton */}
        <SkeletonBlock className="h-4 w-36 mb-6" />

        {/* Title area skeleton */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <SkeletonBlock className="h-9 w-64" />
              <SkeletonBlock className="h-7 w-24 rounded-full" />
            </div>
            <SkeletonBlock className="h-3 w-48" />
          </div>
          <SkeletonBlock className="h-[42px] w-36 rounded-lg" />
        </div>

        {/* Table skeleton */}
        <div className="bg-white border border-[#EAE2F5] rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#EAE2F5] bg-gray-50/50 flex gap-4 items-center">
            <SkeletonBlock className="h-9 w-60 rounded-lg" />
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <th key={i} className="px-6 py-4 bg-gray-50/80">
                      <SkeletonBlock className="h-3 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE2F5]">
                {Array.from({ length: 8 }).map((_, row) => (
                  <tr key={row}>
                    {Array.from({ length: 5 }).map((_, col) => (
                      <td key={col} className="px-6 py-4">
                        <SkeletonBlock className={`h-4 ${col === 0 ? 'w-28' : 'w-20'}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-[#EAE2F5] bg-white flex justify-between items-center">
            <SkeletonBlock className="h-3 w-40" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex-1 p-8 text-center text-gray-500 animate-fadeIn">
        Lista não encontrada.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pt-8 pb-10 px-[26px] h-full overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-semibold animate-fadeIn ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header & Title */}
      <button 
        onClick={() => navigate('/listas')}
        className="flex items-center gap-2 text-[#54456B] hover:text-[#8144E2] font-semibold mb-6 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para listas
      </button>

      <div className="flex justify-between items-end mb-8 animate-fadeIn">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-[36px] font-bold text-[#240B4B] leading-none">{list.nome}</h1>
            <span className="bg-purple-50 text-[#8144E2] text-xs font-bold px-3 py-1.5 rounded-full border border-purple-100 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {contacts.length} contatos
            </span>
          </div>
          <p className="text-gray-500 text-sm font-medium">
            Criada em: {new Date(list.criado_em).toLocaleDateString()} às {new Date(list.criado_em).toLocaleTimeString()}
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            disabled
            className="flex items-center gap-2 bg-white border border-[#EAE2F5] text-[#54456B] px-4 h-[42px] rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors opacity-50 cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Exportar XLSX
          </button>
        </div>
      </div>

      {/* Tabela de Contatos */}
      <div className="bg-white border border-[#EAE2F5] rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden animate-scaleIn">
        
        {/* Barra de Busca dentro da Lista */}
        <div className="p-4 border-b border-[#EAE2F5] bg-gray-50/50 flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                    type="text"
                    placeholder="Pesquisar contatos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[#8144E2] transition-colors text-sm text-[#54456B] font-medium"
                />
            </div>
            <div className="flex-1" />
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Dados Dinâmicos
            </div>
        </div>

        {/* Tabela Scrolável */}
        <div className="flex-1 overflow-auto">
          {filteredContacts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
               <Search className="w-12 h-12 mb-3 opacity-20" />
               <p className="font-medium text-sm">Nenhum contato corresponde à busca.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(234,226,245,1)]">
                <tr>
                  <th className="px-6 py-4 text-[#240B4B] text-xs font-bold uppercase tracking-wider bg-gray-50/80">Telefone</th>
                  {list.colunas?.filter(c => !c.toLowerCase().includes('telefone')).map((col) => (
                    <th key={col} className="px-6 py-4 text-[#240B4B] text-xs font-bold uppercase tracking-wider bg-gray-50/80">
                      {col}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-[#240B4B] text-xs font-bold uppercase tracking-wider bg-gray-50/80 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE2F5]">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-[10px] font-bold text-[#8144E2]">
                          WA
                        </div>
                        <span className="text-[#240B4B] font-bold text-sm tracking-tight">
                          {contact.telefone}
                        </span>
                      </div>
                    </td>
                    {list.colunas?.filter(c => !c.toLowerCase().includes('telefone')).map((col) => (
                      <td key={col} className="px-6 py-4 text-[#54456B] text-sm font-medium">
                        {String(contact.dados?.[col] || '-')}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 text-green-700 text-[10px] font-bold uppercase border border-green-100">
                           <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                           Válido
                        </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer da Tabela */}
        <div className="p-4 border-t border-[#EAE2F5] bg-white flex justify-between items-center text-xs text-gray-500 font-medium">
          <div>Exibindo {filteredContacts.length} de {contacts.length} contatos</div>
          <div>Colunas mapeadas: {list.colunas?.length}</div>
        </div>
      </div>
    </div>
  );
}
