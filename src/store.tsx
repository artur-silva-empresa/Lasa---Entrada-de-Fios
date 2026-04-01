import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { get, set } from 'idb-keyval';

export type RequestItem = {
  id: string;
  requestId: string;
  section: string;
  quantity: number;
  unit?: string;
  description: string;
  coneColor: string;
  observations: string;
};

export type Request = {
  id: string;
  date: string;
  number: string;
  uploadDate: string;
};

export type Delivery = {
  id: string;
  itemId: string;
  quantity: number;
  date: string;
  deliveryNote?: string;
  deliveryDate?: string;
  observations?: string;
};

type AppState = {
  requests: Request[];
  items: RequestItem[];
  deliveries: Delivery[];
};

type AppContextType = {
  state: AppState;
  addRequest: (request: Omit<Request, 'id' | 'uploadDate'>, items: Omit<RequestItem, 'id' | 'requestId'>[]) => void;
  addDelivery: (itemId: string, quantity: number, deliveryNote: string, deliveryDate: string, observations: string) => void;
  updateDelivery: (id: string, updates: Partial<Delivery>) => void;
  updateRequestItem: (itemId: string, updates: Partial<Omit<RequestItem, 'id' | 'requestId'>>) => void;
  deleteRequest: (id: string) => void;
  clearAll: () => void;
  importData: (data: AppState) => void;
  handleOpenFile: () => Promise<void>;
  handleNewFile: () => Promise<void>;
  saveToFile: () => Promise<void>;
  downloadBackup: () => void;
  closeDatabase: () => void;
  memorizeFile: () => Promise<{ success: boolean; message: string }>;
  fileHandle: any;
  storedHandle: any;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'fios_app_data';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({ requests: [], items: [], deliveries: [] });
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [storedHandle, setStoredHandle] = useState<any>(null);

  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      get('lasa_db_handle').then(handle => {
        if (handle) {
          setStoredHandle(handle);
        }
      }).catch(e => console.warn('IndexedDB bloqueado pelo browser', e));
    } catch (e) {
      console.warn('IndexedDB bloqueado pelo browser', e);
    }
  }, []);

  const verifyAndRequestPermission = async (handle: any) => {
    try {
      const options = { mode: 'readwrite' };
      if ((await handle.queryPermission(options)) === 'granted') {
        return true;
      }
      if ((await handle.requestPermission(options)) === 'granted') {
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Erro ao verificar permissões', e);
      return false;
    }
  };

  // When state changes, save to file with Debounce to prevent file locking
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (fileHandle) {
      // Clear previous timeout if state changes rapidly
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout to save after 1.5 seconds of inactivity
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const hasPermission = await fileHandle.queryPermission({ mode: 'readwrite' });
          if (hasPermission === 'granted') {
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(state, null, 2));
            await writable.close();
            console.log('Auto-save concluído com sucesso.');
          }
        } catch (e) {
          console.error('Failed to auto-save to file', e);
        }
      }, 1500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, fileHandle]);

  const saveToFile = async () => {
    if (!fileHandle) {
      alert('Nenhum ficheiro aberto. Use a opção de transferir backup.');
      return;
    }
    try {
      const hasPermission = await verifyAndRequestPermission(fileHandle);
      if (!hasPermission) {
        alert('Permissão de escrita negada pelo browser.');
        return;
      }
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(state, null, 2));
      await writable.close();
      alert('Alterações guardadas com sucesso no ficheiro!');
    } catch (e: any) {
      console.error('Failed to save to file', e);
      alert(`Erro ao guardar: ${e.message || 'Verifique se o ficheiro não está aberto noutro programa.'}`);
    }
  };

  const downloadBackup = async () => {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'LasaBD.json',
        types: [{
          description: 'Ficheiro de Base de Dados JSON',
          accept: { 'application/json': ['.json'] },
        }],
      });
      
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(state, null, 2));
      await writable.close();
      
      alert('Backup transferido com sucesso!');
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Erro ao transferir backup', e);
        alert('Erro ao transferir o ficheiro de backup.');
      }
    }
  };

  const closeDatabase = () => {
    // Force any pending saves to clear
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    // Release the file handle and clear state
    setFileHandle(null);
    setState({ requests: [], items: [], deliveries: [] });
    
    // Attempt to close the browser tab
    try {
      window.open('', '_self', '');
      window.close();
    } catch (e) {
      console.error('Não foi possível fechar a aba automaticamente', e);
    }
  };

  const memorizeFile = async () => {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{
          description: 'Ficheiro de Base de Dados JSON',
          accept: { 'application/json': ['.json'] },
        }],
      });
      
      try {
        await set('lasa_db_handle', handle);
        setStoredHandle(handle);
        return { success: true, message: `Ficheiro "${handle.name}" memorizado com sucesso! Será sugerido ao abrir a aplicação.` };
      } catch (idbError) {
        return { success: false, message: 'O seu browser está a bloquear a memorização de ficheiros (IndexedDB desativado para ficheiros locais). Terá de abrir o ficheiro manualmente sempre que iniciar a aplicação.' };
      }
    } catch (e) {
      return { success: false, message: 'Operação cancelada.' };
    }
  };

  const handleOpenStoredFile = async () => {
    if (!storedHandle) return;
    try {
      const hasPermission = await verifyAndRequestPermission(storedHandle);
      if (!hasPermission) {
        alert('Aviso: Sem permissão de escrita. A gravação automática poderá não funcionar. Tente usar "Abrir Ficheiro Existente".');
      }
      const file = await storedHandle.getFile();
      const contents = await file.text();
      
      let parsed = { requests: [], items: [], deliveries: [] };
      if (contents.trim()) {
        parsed = JSON.parse(contents);
      }
      
      setState({
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
        items: Array.isArray(parsed.items) ? parsed.items : [],
        deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : []
      });
      setFileHandle(storedHandle);
    } catch (e: any) {
      console.error('Erro ao abrir ficheiro guardado', e);
      alert('Erro ao abrir a base de dados recente. O ficheiro pode ter sido movido, apagado, ou o browser bloqueou o acesso. Por favor, abra o ficheiro manualmente.');
      setStoredHandle(null);
      try { await set('lasa_db_handle', null); } catch(err) {}
    }
  };

  const handleOpenFile = async () => {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{
          description: 'Ficheiro de Base de Dados JSON',
          accept: { 'application/json': ['.json'] },
        }],
      });

      // Request write permission immediately so auto-save works
      const hasPermission = await verifyAndRequestPermission(handle);
      if (!hasPermission) {
        alert('Aviso: Como não deu permissão de escrita, as alterações não serão guardadas automaticamente no ficheiro. Terá de usar o botão "Transferir Backup".');
      }

      const file = await handle.getFile();
      const contents = await file.text();
      
      let parsed = { requests: [], items: [], deliveries: [] };
      if (contents.trim()) {
        try {
          parsed = JSON.parse(contents);
        } catch (err) {
          alert('O ficheiro selecionado não é um JSON válido.');
          return;
        }
      }
      
      setState({
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
        items: Array.isArray(parsed.items) ? parsed.items : [],
        deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : []
      });
      setFileHandle(handle);
      setStoredHandle(handle);
      
      try {
        await set('lasa_db_handle', handle);
      } catch (idbError) {
        console.warn('IndexedDB bloqueado, não será possível memorizar o ficheiro', idbError);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Erro ao abrir ficheiro', e);
        alert('Erro ao abrir ficheiro: ' + e.message);
      }
    }
  };

  const handleNewFile = async () => {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'base_de_dados_lasa.json',
        types: [{
          description: 'Ficheiro de Base de Dados JSON',
          accept: { 'application/json': ['.json'] },
        }],
      });
      
      const initialState = { requests: [], items: [], deliveries: [] };
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(initialState, null, 2));
      await writable.close();
      
      setState(initialState);
      setFileHandle(handle);
      setStoredHandle(handle);
      
      try {
        await set('lasa_db_handle', handle);
      } catch (idbError) {
        console.warn('IndexedDB bloqueado', idbError);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Erro ao criar ficheiro', e);
        alert('Erro ao criar ficheiro: ' + e.message);
      }
    }
  };

  const addRequest = async (req: Omit<Request, 'id' | 'uploadDate'>, newItems: Omit<RequestItem, 'id' | 'requestId'>[]) => {
    const requestId = crypto.randomUUID();
    const request: Request = {
      ...req,
      id: requestId,
      uploadDate: new Date().toISOString(),
    };

    const items: RequestItem[] = newItems.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      requestId,
    }));

    setState(prev => ({
      ...prev,
      requests: [request, ...prev.requests],
      items: [...prev.items, ...items],
    }));
  };

  const addDelivery = async (itemId: string, quantity: number, deliveryNote: string, deliveryDate: string, observations: string) => {
    const delivery: Delivery = {
      id: crypto.randomUUID(),
      itemId,
      quantity,
      date: new Date().toISOString(),
      deliveryNote,
      deliveryDate,
      observations,
    };

    setState(prev => ({
      ...prev,
      deliveries: [delivery, ...prev.deliveries],
    }));
  };

  const updateDelivery = (id: string, updates: Partial<Delivery>) => {
    setState(prev => ({
      ...prev,
      deliveries: prev.deliveries.map(d => 
        d.id === id ? { ...d, ...updates } : d
      )
    }));
  };

  const updateRequestItem = (itemId: string, updates: Partial<Omit<RequestItem, 'id' | 'requestId'>>) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    }));
  };

  const deleteRequest = async (id: string) => {
    setState(prev => ({
      ...prev,
      requests: prev.requests.filter(r => r.id !== id),
      items: prev.items.filter(i => i.requestId !== id),
      deliveries: prev.deliveries.filter(d => {
        const item = prev.items.find(i => i.id === d.itemId);
        return item?.requestId !== id;
      }),
    }));
  };

  const clearAll = async () => {
    setState({ requests: [], items: [], deliveries: [] });
  };

  const importData = (data: AppState) => {
    setState(data);
  };

  if (!fileHandle) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-800">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-6 text-slate-900">LASA - Gestão de Fios</h1>
          <p className="text-slate-600 mb-8">
            Para começar, por favor selecione a base de dados (ficheiro .json) ou crie uma nova.
          </p>
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleOpenFile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Abrir Ficheiro Existente (.json)
            </button>
            <button 
              onClick={handleNewFile}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer border border-slate-300 mt-2"
            >
              Criar Nova Base de Dados
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ state, addRequest, addDelivery, updateDelivery, updateRequestItem, deleteRequest, clearAll, importData, handleOpenFile, handleNewFile, saveToFile, downloadBackup, closeDatabase, memorizeFile, fileHandle, storedHandle }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
