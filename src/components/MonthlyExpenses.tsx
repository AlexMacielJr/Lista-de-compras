import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Wallet, Tag, Calculator, Calendar, ArrowLeft, User, TrendingUp, TrendingDown, Edit2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ExpenseItem, HouseholdUser } from '../types';
import { useHousehold } from '../contexts/HouseholdContext';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const DEFAULT_EXPENSE_CATEGORIES = [
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
  const { householdId } = useHousehold();

  const [expensesData] = useCollectionData(
    query(collection(db, 'expenses'), where('householdId', '==', householdId))
  );
  const expenses = (expensesData as ExpenseItem[]) || [];

  const [usersData] = useCollectionData(
    query(collection(db, 'participants'), where('householdId', '==', householdId))
  );
  const users = (usersData as HouseholdUser[]) || [];

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('gestor_expense_categories');
    return saved ? JSON.parse(saved) : DEFAULT_EXPENSE_CATEGORIES;
  });

  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState(categories[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newPaidBy, setNewPaidBy] = useState(users.length > 0 ? users[0].name : '');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [paymentType, setPaymentType] = useState<'vista' | 'parcelado'>('vista');
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [installmentAmountType, setInstallmentAmountType] = useState<'total' | 'parcela'>('total');

  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    localStorage.setItem('gestor_expense_categories', JSON.stringify(categories));
  }, [categories]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setNewCategory(trimmed);
      setNewCategoryName('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    const newCats = categories.filter(c => c !== cat);
    setCategories(newCats);
    if (newCategory === cat) {
      setNewCategory(newCats[0] || '');
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim() || !newAmount) return;

    if (editingId) {
      await updateDoc(doc(db, 'expenses', editingId), {
        description: newDesc.trim(),
        amount: Number(newAmount),
        category: newCategory,
        tags: selectedTags,
        paidBy: newPaidBy || null
      });
      setEditingId(null);
    } else {
      if (selectedTags.includes('Cartão de Crédito') && paymentType === 'parcelado') {
        const numInst = Math.max(2, installmentsCount);
        const instAmount = installmentAmountType === 'total' ? Number(newAmount) / numInst : Number(newAmount);
        const totalPurchAmount = installmentAmountType === 'total' ? Number(newAmount) : Number(newAmount) * numInst;
        
        const today = new Date();
        
        for (let i = 0; i < numInst; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() + i, today.getDate());
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          const newExpId = crypto.randomUUID();
          await setDoc(doc(db, 'expenses', newExpId), {
            id: newExpId,
            householdId: householdId!,
            description: newDesc.trim(),
            amount: instAmount,
            date: dateStr,
            category: newCategory,
            tags: selectedTags,
            paidBy: newPaidBy || null,
            totalAmount: totalPurchAmount,
            installmentIndex: i + 1,
            installmentsCount: numInst
          });
        }
      } else {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const newExpId = crypto.randomUUID();
        await setDoc(doc(db, 'expenses', newExpId), {
          id: newExpId,
          householdId: householdId!,
          description: newDesc.trim(),
          amount: Number(newAmount),
          date: dateStr,
          category: newCategory,
          tags: selectedTags,
          paidBy: newPaidBy || null
        });
      }
    }

    setNewDesc('');
    setNewAmount('');
    setSelectedTags([]);
    setPaymentType('vista');
    setInstallmentsCount(2);
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

  const handleRemoveExpense = async (id: string) => {
    if(id.startsWith('virtual-')) return; // Can't remove projected averages this way
    await deleteDoc(doc(db, 'expenses', id));
  };

  const currentMonthPrefix = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Calculate projected recurring expenses (Fixo / Variável)
  const physicalExpensesThisMonth = expenses.filter(exp => exp.date.startsWith(currentMonthPrefix));
  const pastExpenses = expenses.filter(exp => exp.date.substring(0, 7) < currentMonthPrefix);
  
  const virtualExpenses: ExpenseItem[] = [];
  
  // Fixo
  const pastFixaExpenses = pastExpenses.filter(exp => exp.tags?.includes('Fixo'));
  const fixaByDesc = new Map<string, ExpenseItem>();
  [...pastFixaExpenses].sort((a, b) => a.date.localeCompare(b.date)).forEach(exp => {
    fixaByDesc.set(exp.description, exp);
  });
  
  // Variável (Average)
  const pastVarExpenses = pastExpenses.filter(exp => exp.tags?.includes('Variável'));
  const varAmountsByDesc = new Map<string, number[]>();
  const varLatestByDesc = new Map<string, ExpenseItem>();
  [...pastVarExpenses].sort((a, b) => a.date.localeCompare(b.date)).forEach(exp => {
    if (!varAmountsByDesc.has(exp.description)) varAmountsByDesc.set(exp.description, []);
    varAmountsByDesc.get(exp.description)!.push(exp.amount);
    varLatestByDesc.set(exp.description, exp);
  });

  const existsThisMonth = (desc: string) => physicalExpensesThisMonth.some(e => e.description === desc);

  for (const [desc, latestExp] of fixaByDesc.entries()) {
    if (!existsThisMonth(desc)) {
      virtualExpenses.push({
        ...latestExp,
        id: `virtual-fixa-${desc}`,
        date: `${currentMonthPrefix}-01`,
        tags: [...(latestExp.tags || []), 'Projetado (Fixo)'].filter(t => t !== 'Fixo')
      });
    }
  }

  for (const [desc, amounts] of varAmountsByDesc.entries()) {
    if (!existsThisMonth(desc)) {
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const latestExp = varLatestByDesc.get(desc)!;
      virtualExpenses.push({
        ...latestExp,
        id: `virtual-var-${desc}`,
        amount: avg,
        date: `${currentMonthPrefix}-01`,
        tags: [...(latestExp.tags || []), 'Projetado (Média)'].filter(t => t !== 'Variável')
      });
    }
  }

  const filteredExpenses = [...physicalExpensesThisMonth, ...virtualExpenses];
  
  // Exclude virtual ones from future installments calculation as they are not fixed installments
  const futureInstallmentsTotal = expenses
    .filter(exp => exp.date.substring(0, 7) > currentMonthPrefix)
    .reduce((sum, exp) => sum + exp.amount, 0);

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncome = users.reduce((sum, u) => sum + u.income, 0);
  const balance = totalIncome - totalExpenses;
  const progressPercent = totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0;

  // Group by category for summary
  const summaryByCategory = filteredExpenses.reduce((acc, exp) => {
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
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-indigo-500/50">
            <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))} className="p-1 hover:bg-indigo-500 rounded-lg transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="font-semibold text-lg tracking-wide capitalize">
              {currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))} className="p-1 hover:bg-indigo-500 rounded-lg transition-colors">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="flex justify-between items-center mb-5">
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
          
          <div className="flex gap-4 mb-4">
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
          
          {totalIncome > 0 && (
            <div className="mt-2 bg-indigo-700/30 p-3 rounded-xl border border-indigo-500/30">
              <div className="flex justify-between text-xs text-indigo-100 mb-2 font-medium">
                <span>Renda Comprometida</span>
                <span>{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-indigo-900/50 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${progressPercent > 90 ? 'bg-red-400' : progressPercent > 75 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {futureInstallmentsTotal > 0 && (
            <div className="mt-3 bg-indigo-800/40 p-3 rounded-xl border border-indigo-500/30 flex justify-between items-center text-sm">
              <span className="text-indigo-200 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> A Pagar (Faturas Seguintes)
              </span>
              <span className="font-semibold text-indigo-100">R$ {futureInstallmentsTotal.toFixed(2)}</span>
            </div>
          )}

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
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Valor (R$)"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="flex-1 min-w-0 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                  required
                />
                <div className="flex-1 min-w-0 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  <Tag className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-slate-700 focus:outline-none appearance-none min-w-0 truncate"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setIsManagingCategories(true)} className="text-[10px] text-indigo-600 font-medium hover:underline px-1">
                  Gerenciar Categorias
                </button>
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

            {!editingId && selectedTags.includes('Cartão de Crédito') && (
              <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 mb-3 space-y-3">
                <span className="text-xs font-bold text-indigo-800 uppercase block tracking-wide">Pagamento Cartão</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="paymentType" 
                      value="vista" 
                      checked={paymentType === 'vista'} 
                      onChange={() => setPaymentType('vista')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    À Vista
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="paymentType" 
                      value="parcelado" 
                      checked={paymentType === 'parcelado'} 
                      onChange={() => setPaymentType('parcelado')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Parcelado
                  </label>
                </div>
                
                {paymentType === 'parcelado' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input 
                          type="radio" 
                          name="installmentAmountType" 
                          value="total" 
                          checked={installmentAmountType === 'total'} 
                          onChange={() => setInstallmentAmountType('total')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        O valor acima é o Total
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input 
                          type="radio" 
                          name="installmentAmountType" 
                          value="parcela" 
                          checked={installmentAmountType === 'parcela'} 
                          onChange={() => setInstallmentAmountType('parcela')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        O valor acima é da Parcela
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">Parcelas:</span>
                      <input 
                        type="number" 
                        min="2" 
                        max="72"
                        value={installmentsCount}
                        onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                        className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {installmentsCount}x de R$ {newAmount ? (installmentAmountType === 'total' ? (Number(newAmount) / (installmentsCount || 1)) : Number(newAmount)).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

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
            <span className="text-xs text-slate-400">{filteredExpenses.length} {filteredExpenses.length === 1 ? 'registro' : 'registros'}</span>
          </div>
          
          {filteredExpenses.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center text-slate-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20 text-indigo-400" />
              <p>Nenhuma despesa registrada.</p>
              <p className="text-sm mt-1">Os gastos deste mês aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map(exp => (
                <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col group hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{exp.description}</span>
                        {exp.installmentsCount && exp.installmentIndex && (
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            {exp.installmentIndex}/{exp.installmentsCount}
                          </span>
                        )}
                      </div>
                      
                      {exp.totalAmount && (
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          Total da compra: R$ {exp.totalAmount.toFixed(2)}
                        </span>
                      )}

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
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold text-slate-700 text-lg">R$ {exp.amount.toFixed(2)}</span>
                      <div className="flex items-center gap-1 mt-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditExpense(exp)} 
                          className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                          aria-label="Editar despesa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleRemoveExpense(exp.id)} 
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Remover despesa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Category Manager Modal */}
      {isManagingCategories && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-slate-800 text-lg">Gerenciar Categorias</h2>
              <button onClick={() => setIsManagingCategories(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nova categoria..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors text-sm"
                />
                <button
                  onClick={handleAddCategory}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Adicionar
                </button>
              </div>

              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">{cat}</span>
                    <button 
                      onClick={() => handleRemoveCategory(cat)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
