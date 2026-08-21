import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ExpenseItem } from '../types';

interface TrendsChartProps {
  expenses: ExpenseItem[];
}

export default function TrendsChart({ expenses }: TrendsChartProps) {
  // Calculate totals per month for the last 6 months
  const today = new Date();
  const data = [];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
    
    const monthTotal = expenses
      .filter(exp => exp.date.startsWith(prefix) && !exp.id.startsWith('virtual-'))
      .reduce((sum, exp) => sum + exp.amount, 0);
      
    data.push({
      name: monthName,
      total: monthTotal,
      prefix
    });
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mt-4">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Tendência (Últimos 6 Meses)</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `R$ ${value}`} width={60} />
            <Tooltip 
              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Total']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
