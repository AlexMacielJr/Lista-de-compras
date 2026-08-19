import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Wallet, Tag, Calculator, Calendar, ArrowLeft, User, TrendingUp, TrendingDown, Edit2, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ExpenseItem, HouseholdUser } from '../types';

const EXPENSE_CATEGORIES = [
  'Moradia',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Lazer',
  'Educação',
  'Outros'
];

const PREDEFINED_TAGS = [
  'Cartão de Crédito',
  'Débito',
  'Pix',
  'Recorrente',
  'Fixo',
  'Variável'
];

interface MonthlyExpensesProps {
  onBack: () => void;
}

export default function MonthlyExpenses({ onBack }: MonthlyExpensesProps) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem('monthly-expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [users] = useState<HouseholdUser[]>(() => {
    const saved = localStorage.getItem('household-users');
    return saved ? JSON.parse(saved) : [];
  });

  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newPaidBy, setNewPaidBy] = useState(users.length > 0 ? users[0].name : '');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('monthly-expenses', JSON.stringify(expenses));
  }, [expenses]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim() || !newAmount) return;

    if (editingId) {
      setExpenses(expenses.map(exp => 
        exp.id === editingId 
          ? { ...exp, description: newDesc.trim(), amount: Number(newAmount), category: newCategory, tags: selectedTags, paidBy: newPaidBy || undefined }
          : exp
      ));
      setEditingId(null);
    } else {
      const newExpense: ExpenseItem = {
        id: crypto.randomUUID(),
        description: newDesc.trim(),
        amount: Number(newAmount),
        date: new Date().toISOString().split('T')[0],
        category: newCategory,
        tags: selectedTags,
        paidBy: newPaidBy || undefined
      };
      setExpenses([newExpense, ...expenses]);
    }

    setNewDesc('');
    setNewAmount('');
    setSelectedTags([]);
  };

  const handleEditExpense = (exp: ExpenseItem) => {
    setEditingId(exp.id);
    setNewDesc(exp.description);
    setNewAmount(exp.amount.toString());
    setNewCategory(exp.category);
    setSelectedTags(exp.tags || []);
    setNewPaidBy(exp.paidBy || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewDesc('');
    setNewAmount('');
    setSelectedTags([]);
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncome = users.reduce((sum, u) => sum + u.income, 0);
  const balance = totalIncome - totalExpenses;

  // Group by category for summary
  const summaryByCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(summaryByCategory).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => (b.value as number) - (a.value as number));

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899', '#64748b'];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between gap-2">
        <button onClick={onBack} className="p-1 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center flex-shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center justify-center -ml-8">
          <Wallet className="w-6 h-6 mr-2" />
          <h1 className="text-xl font-semibold tracking-wide">Gastos Mensais</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-lg w-full mx-auto space-y-6">
        
        {/* Total Summary */}
        <section className="bg-indigo-600 p-6 rounded-2xl shadow-md text-white">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <span className="text-indigo-200 text-sm font-medium">Saldo Restante</span>
              <span className={`text-3xl font-bold ${balance < 0 ? 'text-red-300' : 'text-white'}`}>
                R$ {balance.toFixed(2)}
              </span>
            </div>
            <div className="bg-indigo-500/50 p-3 rounded-full flex-shrink-0">
              <Wallet className="w-8 h-8 text-indigo-100" />
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1 bg-indigo-500/30 rounded-xl p-3 border border-indigo-400/30">
              <div className="flex items-center gap-1 text-indigo-200 mb-1 text-xs">
                <TrendingUp className="w-3 h-3" /> Renda
              </div>
              <div className="font-semibold text-sm truncate">R$ {totalIncome.toFixed(2)}</div>
            </div>
            <div className="flex-1 bg-indigo-500/30 rounded-xl p-3 border border-indigo-400/30">
              <div className="flex items-center gap-1 text-indigo-200 mb-1 text-xs">
                <TrendingDown className="w-3 h-3" /> Gastos
              </div>
              <div className="font-semibold text-sm truncate">R$ {totalExpenses.toFixed(2)}</div>
            </div>
          </div>
          
          {users.length === 0 && (
             <p className="text-xs text-indigo-200 mt-4 text-center bg-indigo-700/50 p-2 rounded-lg border border-indigo-500/50">
               Adicione participantes na aba "Participantes" para compor a renda.
             </p>
          )}
        </section>

        {/* Chart */}
        {chartData.length > 0 && (
          <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-72 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">Distribuição por Categoria</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Form */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-3 text-slate-700">
            {editingId ? <Edit2 className="w-5 h-5 text-emerald-500" /> : <Plus className="w-5 h-5 text-indigo-500" />}
            <h2 className="font-semibold">{editingId ? 'Editar Despesa' : 'Nova Despesa'}</h2>
          </div>
          <form onSubmit={handleSaveExpense} className="space-y-3">
            <input
              type="text"
              placeholder="Descrição (ex: Conta de Luz)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              required
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor (R$)"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                required
              />
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 w-1/2">
                <Tag className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-700 focus:outline-none appearance-none"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {users.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                <User className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <select
                  value={newPaidBy}
                  onChange={(e) => setNewPaidBy(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-700 focus:outline-none appearance-none"
                >
                  <option value="">Quem pagou? (Opcional)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="pt-2 pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Tags Opcionais</span>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border ${
                      selectedTags.includes(tag)
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" /> Cancelar
                </button>
              )}
              <button
                type="submit"
                className={`flex-[2] text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm ${
                  editingId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />} 
                {editingId ? 'Salvar Alterações' : 'Adicionar'}
              </button>
            </div>
          </form>
        </section>

        {/* Expenses List */}
        <section>
          <div className="flex justify-between items-end mb-3 px-1">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Histórico</h2>
            <span className="text-xs text-slate-400">{expenses.length} {expenses.length === 1 ? 'registro' : 'registros'}</span>
          </div>
          
          {expenses.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center text-slate-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20 text-indigo-400" />
              <p>Nenhuma despesa registrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map(exp => (
                <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800">{exp.description}</span>
                    <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 mt-1">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-indigo-700 font-medium">{exp.category}</span>
                      <span>{new Date(exp.date).toLocaleDateString()}</span>
                      {exp.paidBy && (
                        <span className="flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100 font-medium">
                          <User className="w-3 h-3" /> {exp.paidBy}
                        </span>
                      )}
                    </div>
                    {exp.tags && exp.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {exp.tags.map(tag => (
                          <span key={tag} className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-medium border border-slate-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700 mr-2">R$ {exp.amount.toFixed(2)}</span>
                    <button 
                      onClick={() => handleEditExpense(exp)} 
                      className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                      aria-label="Editar despesa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleRemoveExpense(exp.id)} 
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Remover despesa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
