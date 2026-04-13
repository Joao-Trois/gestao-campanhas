import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone'; // Nota: Vou precisar instalar ou usar input padrão se não quiser dep
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Save, 
  FileSpreadsheet,
  AlertCircle,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ContactListImport() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [listName, setListName] = useState('');
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [processedContacts, setProcessedContacts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const bstr = event.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (data.length > 0) {
        const detectedColumns = Object.keys(data[0]);
        setColumns(detectedColumns);
        processContactsData(data, detectedColumns);
        setPreviewData(data.slice(0, 5));
      }
    };
    
    reader.readAsBinaryString(uploadedFile);
  };

  const processContactsData = (rawData, cols) => {
    // Procura coluna de telefone (case insensitive)
    const phoneCol = cols.find(c => c.toLowerCase().includes('telefone') || c.toLowerCase().includes('phone') || c.toLowerCase().includes('whatsapp'));
    
    if (!phoneCol) {
      setSummary({ error: 'Coluna de "telefone" não encontrada no arquivo. Certifique-se de que uma das colunas contém os números.' });
      return;
    }

    const seen = new Set();
    const valid = [];
    let ignoredEmpty = 0;
    let ignoredDupes = 0;

    rawData.forEach(row => {
      const rawPhone = String(row[phoneCol] || '').replace(/\D/g, '');
      
      if (!rawPhone) {
        ignoredEmpty++;
        return;
      }
      
      if (seen.has(rawPhone)) {
        ignoredDupes++;
        return;
      }

      seen.add(rawPhone);
      valid.push({
        telefone: rawPhone,
        dados: row
      });
    });

    setProcessedContacts(valid);
    setSummary({
      total: rawData.length,
      valid: valid.length,
      ignoredEmpty,
      ignoredDupes,
      phoneColumn: phoneCol
    });
  };

  const handleSave = async () => {
    if (!listName.trim()) {
      showToast('error', 'Por favor, dê um nome para a lista.');
      return;
    }
    if (processedContacts.length === 0) {
      showToast('error', 'Nenhum contato válido para importar.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Upload do arquivo para Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `listas/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from('listas')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // 2. Criar registro na listas_contatos
      const { data: listData, error: listError } = await supabase
        .from('listas_contatos')
        .insert([{
          nome: listName.trim(),
          arquivo_url: filePath,
          colunas: columns,
          grupo_id: profile.grupo_id
        }])
        .select()
        .single();

      if (listError) throw listError;

      // 3. Salvar contatos em massa (batch)
      const contactsToInsert = processedContacts.map(c => ({
        lista_id: listData.id,
        telefone: c.telefone,
        dados: c.dados
      }));

      // Inserir em lotes de 1000 para evitar limites do Supabase/Postgres
      const batchSize = 1000;
      for (let i = 0; i < contactsToInsert.length; i += batchSize) {
        const batch = contactsToInsert.slice(i, i + batchSize);
        const { error: contactsError } = await supabase
          .from('contatos')
          .insert(batch);
        
        if (contactsError) throw contactsError;
      }

      showToast('success', 'Lista importada com sucesso!');
      setTimeout(() => navigate('/listas'), 1500);

    } catch (err) {
      console.error(err);
      showToast('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-8 pb-10 px-[26px] h-full overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-semibold animate-fadeIn ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      <button 
        onClick={() => navigate('/listas')}
        className="flex items-center gap-2 text-[#54456B] hover:text-[#8144E2] font-semibold mb-6 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para listas
      </button>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-[36px] font-bold text-[#240B4B]">Importar Lista</h1>
        <button
          onClick={handleSave}
          disabled={isSaving || !file || !!summary?.error}
          className="flex items-center gap-2 bg-[#8144E2] hover:bg-[#6b35bf] text-white px-6 h-[46px] rounded-lg font-bold transition-all shadow-sm disabled:opacity-50 disabled:grayscale"
        >
          {isSaving ? 'Salvando...' : (
            <>
              <Save className="w-5 h-5" />
              Confirmar Importação
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lado Esquerdo: Configuração */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white border border-[#EAE2F5] rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <h3 className="text-[#240B4B] font-bold text-lg mb-2">Configurações da Lista</h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-[#240B4B] text-sm font-bold ml-1">Nome da Lista:</label>
              <input 
                type="text" 
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Ex: Leads Campanha Março"
                className="w-full px-4 py-3 border border-[#EAE2F5] rounded-lg focus:outline-none focus:border-[#8144E2] transition-colors text-[#54456B] font-medium"
              />
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <label className="text-[#240B4B] text-sm font-bold ml-1">Upload do Arquivo (.xlsx):</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-all ${file ? 'border-[#8144E2] bg-purple-50' : 'border-[#EAE2F5] group-hover:border-[#8144E2]'}`}>
                  <div className={`p-4 rounded-full ${file ? 'bg-[#8144E2] text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {file ? <FileSpreadsheet className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                  </div>
                  <div className="text-center">
                    <p className={`font-bold text-sm ${file ? 'text-[#8144E2]' : 'text-[#240B4B]'}`}>
                      {file ? file.name : 'Clique ou solte o arquivo Excel aqui'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Suporta .xlsx e .xls</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {summary && !summary.error && (
            <div className="bg-white border border-[#EAE2F5] rounded-xl p-6 shadow-sm animate-scaleIn">
              <h3 className="text-[#240B4B] font-bold text-lg mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                Resumo do Processamento
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm font-medium p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-500">Contatos Válidos:</span>
                  <span className="text-green-600 font-bold">{summary.valid}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium p-2">
                  <span className="text-gray-500">Telefones Vazios:</span>
                  <span className="text-orange-500 font-bold">{summary.ignoredEmpty}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium p-2">
                  <span className="text-gray-500">Duplicatas Removidas:</span>
                  <span className="text-orange-500 font-bold">{summary.ignoredDupes}</span>
                </div>
                <div className="mt-2 text-[11px] text-[#54456B] bg-purple-50 p-2 rounded border border-purple-100 italic">
                  * Coluna de telefone detectada: <strong>"{summary.phoneColumn}"</strong>
                </div>
              </div>
            </div>
          )}

          {summary?.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm animate-scaleIn">
              <div className="flex items-center gap-3 text-red-700 mb-2">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-bold">Erro no Arquivo</h3>
              </div>
              <p className="text-sm text-red-600 font-medium leading-relaxed">
                {summary.error}
              </p>
            </div>
          )}
        </div>

        {/* Lado Direito: Preview */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-[#EAE2F5] rounded-xl p-6 shadow-sm min-h-[400px]">
            <h3 className="text-[#240B4B] font-bold text-lg mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#8144E2]" />
              Visualização dos Dados (Top 5)
            </h3>

            {!file ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-gray-300 gap-4 border-2 border-dashed border-gray-100 rounded-lg">
                <FileSpreadsheet className="w-16 h-16" />
                <p className="font-medium">Carregue um arquivo para ver o preview aqui.</p>
              </div>
            ) : previewData.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-[#EAE2F5]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#EAE2F5]">
                      {columns.map(col => (
                        <th key={col} className="px-4 py-3 text-[#240B4B] text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-b border-[#EAE2F5] hover:bg-gray-50 transition-colors">
                        {columns.map(col => (
                          <td key={`${i}-${col}`} className="px-4 py-3 text-[#54456B] text-sm font-medium whitespace-nowrap">
                            {String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-12">Processando dados...</p>
            )}
            
            {file && previewData.length > 0 && (
              <p className="text-[11px] text-gray-400 mt-4 italic text-right">
                Mostrando as primeiras 5 linhas de um total de {summary?.total || 0} registros.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
