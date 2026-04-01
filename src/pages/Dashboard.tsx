import React from 'react';
import { useAppStore } from '../store';
import { Package, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const { state } = useAppStore();

  const totalsByUnit = state.items.reduce((acc, item) => {
    const unit = item.unit || 'Kg';
    if (!acc[unit]) acc[unit] = { requested: 0, delivered: 0, pending: 0 };
    acc[unit].requested += Number(item.quantity || 0);
    return acc;
  }, {} as Record<string, { requested: number, delivered: number, pending: number }>);

  state.deliveries.forEach(d => {
    const item = state.items.find(i => i.id === d.itemId);
    if (item) {
      const unit = item.unit || 'Kg';
      if (!totalsByUnit[unit]) totalsByUnit[unit] = { requested: 0, delivered: 0, pending: 0 };
      totalsByUnit[unit].delivered += Number(d.quantity || 0);
    }
  });

  Object.keys(totalsByUnit).forEach(unit => {
    totalsByUnit[unit].pending = Math.max(0, totalsByUnit[unit].requested - totalsByUnit[unit].delivered);
  });

  const pendingItemsCount = state.items.filter(item => {
    const delivered = state.deliveries.filter(d => d.itemId === item.id).reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    return delivered < Number(item.quantity || 0);
  }).length;

  const renderTotals = (type: 'requested' | 'delivered' | 'pending') => {
    const entries = Object.entries(totalsByUnit).filter(([_, data]) => data[type] > 0);
    if (entries.length === 0) return <p className="text-2xl font-bold text-slate-900">0</p>;
    
    return (
      <div className="space-y-1">
        {entries.map(([unit, data]) => (
          <div key={unit} className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{data[type].toLocaleString('pt-PT')}</span>
            <span className="text-sm font-medium text-slate-500">{unit}</span>
          </div>
        ))}
      </div>
    );
  };

  // Prepare data for the bar chart
  const chartDataMap = new Map<string, any>();
  
  state.items.forEach(item => {
    const key = `${item.description} (${item.unit || 'Kg'})`;
    if (!chartDataMap.has(key)) {
      chartDataMap.set(key, {
        name: item.description,
        unit: item.unit || 'Kg',
        'Quantidade Pedida': 0,
        'Quantidade em Falta': 0,
        delivered: 0
      });
    }
    const data = chartDataMap.get(key);
    data['Quantidade Pedida'] += Number(item.quantity || 0);
  });

  state.deliveries.forEach(d => {
    const item = state.items.find(i => i.id === d.itemId);
    if (item) {
      const key = `${item.description} (${item.unit || 'Kg'})`;
      if (chartDataMap.has(key)) {
        chartDataMap.get(key).delivered += Number(d.quantity || 0);
      }
    }
  });

  const chartData = Array.from(chartDataMap.values()).map(data => {
    data['Quantidade em Falta'] = Math.max(0, data['Quantidade Pedida'] - data.delivered);
    return data;
  }).sort((a, b) => b['Quantidade Pedida'] - a['Quantidade Pedida']).slice(0, 15); // Top 15 to keep chart readable

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-2">Visão geral do estado dos pedidos e entregas de fio.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Solicitado" 
          value={renderTotals('requested')} 
          icon={Package} 
          color="text-blue-600" 
          bgColor="bg-blue-100" 
        />
        <StatCard 
          title="Total Entregue" 
          value={renderTotals('delivered')} 
          icon={CheckCircle2} 
          color="text-emerald-600" 
          bgColor="bg-emerald-100" 
        />
        <StatCard 
          title="Total em Falta" 
          value={renderTotals('pending')} 
          icon={AlertCircle} 
          color="text-amber-600" 
          bgColor="bg-amber-100" 
        />
        <StatCard 
          title="Linhas Pendentes" 
          value={<p className="text-2xl font-bold text-slate-900">{pendingItemsCount}</p>} 
          icon={TrendingUp} 
          color="text-indigo-600" 
          bgColor="bg-indigo-100" 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Visão Geral por Fio (Top 15)</h2>
        {chartData.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Nenhum dado disponível para o gráfico.</p>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  interval={0} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [`${value.toLocaleString('pt-PT')} ${props.payload.unit}`, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Quantidade Pedida" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Quantidade em Falta" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimos Pedidos</h2>
          {state.requests.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhum pedido registado.</p>
          ) : (
            <div className="space-y-4">
              {state.requests.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Pedido #{req.number}</p>
                    <p className="text-xs text-slate-500">Data: {req.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {state.items.filter(i => i.requestId === req.id).length} itens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimas Entradas</h2>
          {state.deliveries.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhuma entrada registada.</p>
          ) : (
            <div className="space-y-4">
              {state.deliveries.slice(0, 5).map(delivery => {
                const item = state.items.find(i => i.id === delivery.itemId);
                return (
                  <div key={delivery.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-medium text-slate-900 truncate" title={item?.description}>
                        {item?.description || 'Item desconhecido'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Guia: {delivery.deliveryNote || 'N/A'} • Data: {delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('pt-PT') : new Date(delivery.date).toLocaleDateString('pt-PT')}
                      </p>
                      {delivery.observations && (
                        <p className="text-xs text-slate-400 mt-1 italic truncate" title={delivery.observations}>
                          Obs: {delivery.observations}
                        </p>
                      )}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="text-sm font-bold text-emerald-600">
                        +{delivery.quantity} {item?.unit || 'Kg'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bgColor }: any) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-start gap-4">
      <div className={`p-4 rounded-full ${bgColor} shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        {value}
      </div>
    </div>
  );
}
