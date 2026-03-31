import React, { createContext, useContext, useEffect, useState } from 'react';

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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'fios_app_data';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({ requests: [], items: [], deliveries: [] });
  const [fileHandle, setFileHandle] = useState<any>(null);
  const isFirstRender = React.useRef(true);

  // When state changes, save to file
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (fileHandle) {
      const saveToFile = async () => {
        try {
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(state, null, 2));
          await writable.close();
        } catch (e) {
          console.error('Failed to save to file', e);
        }
      };
      saveToFile();
    }
  }, [state, fileHandle]);

  const handleOpenFile = async () => {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{
          description: 'Ficheiro de Base de Dados JSON',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const file = await handle.getFile();
      const contents = await file.text();
      const parsed = JSON.parse(contents);
      
      setState(parsed);
      setFileHandle(handle);
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
            <button 
              onClick={handleOpenFile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Abrir Base de Dados Existente
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
    <AppContext.Provider value={{ state, addRequest, addDelivery, deleteRequest, clearAll, importData, handleOpenFile, handleNewFile }}>
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
