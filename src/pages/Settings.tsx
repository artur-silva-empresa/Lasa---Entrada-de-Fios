import React, { useState } from 'react';
import { Database, Download, Upload, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store';

export function Settings() {
  const { handleOpenFile, handleNewFile, fileHandle, storedHandle, memorizeFile } = useAppStore();
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleSetDefaultFile = async () => {
    const result = await memorizeFile();
    if (result.message !== 'Operação cancelada.') {
      setSaveStatus({
        type: result.success ? 'success' : 'error',
        message: result.message
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-slate-500 mt-2">Gira a base de dados da aplicação.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Base de Dados Local</h2>
          </div>
          
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Estado Atual</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Ficheiro aberto:</span>
              {fileHandle ? (
                <span className="font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {fileHandle.name}
                </span>
              ) : (
                <span className="font-medium text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Nenhum ficheiro aberto
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm mt-2">
              <span className="text-slate-500">Ficheiro memorizado (Padrão):</span>
              {storedHandle ? (
                <span className="font-medium text-blue-600">
                  {storedHandle.name}
                </span>
              ) : (
                <span className="font-medium text-slate-400">
                  Nenhum
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            A aplicação está a funcionar 100% offline no seu browser. Os dados são guardados e lidos diretamente do ficheiro JSON que selecionou.
            <br />
            <span className="text-amber-600 font-medium">Atenção:</span> Por motivos de segurança, os browsers não permitem escrever o caminho do ficheiro (ex: C:\pasta\base.json). Tem sempre de selecionar o ficheiro manualmente ou usar o botão abaixo para tentar memorizá-lo.
          </p>

          {saveStatus && (
            <div className={`p-4 rounded-lg mb-6 text-sm flex items-start gap-3 ${
              saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {saveStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <p>{saveStatus.message}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={handleSetDefaultFile}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              Apontar / Memorizar Ficheiro Padrão
            </button>

            <button
              onClick={handleOpenFile}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Abrir Outra Base de Dados
            </button>

            <button
              onClick={handleNewFile}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Criar Nova Base de Dados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
