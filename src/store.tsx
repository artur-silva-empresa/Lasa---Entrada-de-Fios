import React, { createContext, useContext, useEffect, useState } from 'react';
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
  deleteRequest: (id: string) => void;
  clearAll: () => void;
  importData: (data: AppState) => void;
  handleOpenFile: () => Promise<void>;
  handleNewFile: () => Promise<void>;
  saveToFile: () => Promise<void>;
  downloadBackup: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'fios_app_data';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({ requests: [], items: [], deliveries: [] });
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [storedHandle, setStoredHandle] = useState<any>(null);

  const isFirstRender = React.useRef(true);

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
    const options = { mode: 'readwrite' };
    if ((await handle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await handle.requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
  };

  // When state changes, save to file
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (fileHandle) {
      const autoSave = async () => {
        try {
          const hasPermission = await fileHandle.queryPermission({ mode: 'readwrite' });
          if (hasPermission === 'granted') {
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(state, null, 2));
            await writable.close();
          }
        } catch (e) {
          console.error('Failed to auto-save to file', e);
        }
      };
      autoSave();
    }
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

  const downloadBackup = () => {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lasa_backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao transferir backup', e);
      alert('Erro ao transferir o ficheiro de backup.');
    }
  };

  const handleOpenStoredFile = async () => {
    if (!storedHandle) return;
    try {
      const hasPermission = await verifyAndRequestPermission(storedHandle);
      if (!hasPermission) {
        alert('Permissão negada. Por favor, selecione o ficheiro manualmente.');
        return;
      }
      const file = await storedHandle.getFile();
      const contents = await file.text();
      const parsed = JSON.parse(contents);
      
      setState(parsed);
      setFileHandle(storedHandle);
    } catch (e) {
      console.error('Erro ao abrir ficheiro guardado', e);
      alert('Erro ao abrir a base de dados recente. O ficheiro pode ter sido movido ou apagado.');
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
      const parsed = JSON.parse(contents);
      
      setState(parsed);
      setFileHandle(handle);
      
      try {
        await set('lasa_db_handle', handle);
      } catch (idbError) {
        console.warn('IndexedDB bloqueado, não será possível memorizar o ficheiro', idbError);
      }
    } catch (e) {
      console.error('Erro ao abrir ficheiro', e);
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
      
      try {
        await set('lasa_db_handle', handle);
      } catch (idbError) {
        console.warn('IndexedDB bloqueado', idbError);
      }
    } catch (e) {
      console.error('Erro ao criar ficheiro', e);
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
            {storedHandle && (
              <button 
                onClick={handleOpenStoredFile}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer mb-4"
              >
                Abrir Base de Dados Recente
              </button>
            )}
            <button 
              onClick={handleOpenFile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Abrir Outra Base de Dados
            </button>
            <button 
              onClick={handleNewFile}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Criar Nova Base de Dados
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ state, addRequest, addDelivery, deleteRequest, clearAll, importData, handleOpenFile, handleNewFile, saveToFile, downloadBackup }}>
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
