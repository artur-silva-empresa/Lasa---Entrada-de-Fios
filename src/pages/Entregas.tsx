import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Package, Search, Download, Edit2 } from 'lucide-react';
import { exportDeliveriesToExcel } from '../lib/excel';

export function Entregas() {
  const { state, updateDelivery } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedDeliveryForEdit, setSelectedDeliveryForEdit] = useState<any>(null);
  const [editDeliveryQuantity, setEditDeliveryQuantity] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editDeliveryNote, setEditDeliveryNote] = useState('');
  const [editDeliveryObservations, setEditDeliveryObservations] = useState('');

  // Combine deliveries with item and request details
  const deliveriesWithDetails = state.deliveries.map(delivery => {
    const item = state.items.find(i => i.id === delivery.itemId);
    const request = item ? state.requests.find(r => r.id === item.requestId) : null;
    
    return {
      ...delivery,
      itemDescription: item?.description || 'Item Desconhecido',
      itemSection: item?.section || '',
      itemUnit: item?.unit || 'Kg',
      coneColor: item?.coneColor || '',
      requestNumber: request?.number || 'Desconhecido',
      displayDate: delivery.deliveryDate || delivery.date.split('T')[0]
    };
  }).sort((a, b) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime());

  const filteredDeliveries = deliveriesWithDetails.filter(d => 
    d.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.deliveryNote && d.deliveryNote.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExportExcel = () => {
    const dataToExport = filteredDeliveries.map(d => ({
      'Data de Entrega': new Date(d.displayDate).toLocaleDateString('pt-PT'),
      'Pedido': d.requestNumber,
      'Fio': d.itemDescription,
      'Secção': d.itemSection,
      'Quantidade': d.quantity,
      'Unidade': d.itemUnit,
      'Guia de Remessa': d.deliveryNote || '',
      'Observações': d.observations || ''
    }));
    
    exportDeliveriesToExcel(dataToExport, 'Historico_Entregas');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Histórico de Entregas</h1>
          <p className="text-slate-500 mt-2">Consulte e edite todas as entregas registadas.</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por fio, pedido ou guia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Pedido</th>
                <th className="px-4 py-3 font-semibold">Fio</th>
                <th className="px-4 py-3 font-semibold text-right">Quantidade</th>
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Guia</th>
                <th className="px-4 py-3 font-semibold">Observações</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma entrega encontrada.
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                      {delivery.requestNumber}
                    </td>
                    <td className="px-4 py-3 min-w-[200px]">
                      <div className="font-medium text-slate-900">{delivery.itemDescription}</div>
                      <div className="text-xs text-slate-500 flex gap-2 mt-1">
                        <span>{delivery.itemSection}</span>
                        {delivery.coneColor && (
                          <>
                            <span>•</span>
                            <span>Cor: {delivery.coneColor}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-emerald-600">
                      {delivery.quantity} {delivery.itemUnit}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {new Date(delivery.displayDate).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {delivery.deliveryNote || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate" title={delivery.observations}>
                      {delivery.observations || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          setSelectedDeliveryForEdit(delivery);
                          setEditDeliveryQuantity(delivery.quantity.toString());
                          setEditDeliveryDate(delivery.displayDate);
                          setEditDeliveryNote(delivery.deliveryNote || '');
                          setEditDeliveryObservations(delivery.observations || '');
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                        title="Editar Entrega"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDeliveryForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Editar Entrega</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quantidade Entregue
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editDeliveryQuantity}
                  onChange={(e) => setEditDeliveryQuantity(e.target.value)}
                  className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data de Entrega
                </label>
                <input
                  type="date"
                  value={editDeliveryDate}
                  onChange={(e) => setEditDeliveryDate(e.target.value)}
                  className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Guia de Remessa
                </label>
                <input
                  type="text"
                  value={editDeliveryNote}
                  onChange={(e) => setEditDeliveryNote(e.target.value)}
                  className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  rows={3}
                  value={editDeliveryObservations}
                  onChange={(e) => setEditDeliveryObservations(e.target.value)}
                  className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedDeliveryForEdit(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (selectedDeliveryForEdit && editDeliveryQuantity) {
                    updateDelivery(selectedDeliveryForEdit.id, {
                      quantity: Number(editDeliveryQuantity),
                      deliveryDate: editDeliveryDate,
                      deliveryNote: editDeliveryNote,
                      observations: editDeliveryObservations
                    });
                    setSelectedDeliveryForEdit(null);
                  }
                }}
                disabled={!editDeliveryQuantity || Number(editDeliveryQuantity) < 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
