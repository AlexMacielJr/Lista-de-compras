import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Wallet, Tag, Calculator, Calendar, ArrowLeft, User, TrendingUp, TrendingDown, Edit2, X, ChevronLeft, ChevronRight, Check, Download, Share2, Link as LinkIcon, Camera } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { ExpenseItem, HouseholdUser } from '../types';
import { useHousehold } from '../contexts/HouseholdContext';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notifyUsers } from '../lib/notify';
import TrendsChart from './TrendsChart';

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
  'Variável'
];

interface MonthlyExpensesProps {
  onBack: () => void;
}

export default function MonthlyExpenses({ onBack }: MonthlyExpensesProps) {
  const { householdId, user } = useHousehold();

  const [expensesData] = useCollectionData(
    query(collection(db, 'expenses'), where('householdId', '==', householdId))
  );
  const expenses = (expensesData as ExpenseItem[]) || [];

  const [usersData] = useCollectionData(
    query(collection(db, 'participants'), where('householdId', '==', householdId))
  );
  const users = (usersData as HouseholdUser[]) || [];
  
  const currentUserParticipant = users.find(p => p.id === user?.uid);
  const prefs = currentUserParticipant?.notificationPreferences || {
    enabled: true,
    onAdd: true,
    onUpdate: true,
    onDelete: true
  };

  // Auto-migrate "Fixo" to "Variável"
  useEffect(() => {
    const expensesToMigrate = expenses.filter(exp => exp.tags?.includes('Fixo') || (exp.tags && new Set(exp.tags).size !== exp.tags.length));
    if (expensesToMigrate.length > 0) {
      expensesToMigrate.forEach(async (exp) => {
        try {
          const newTags = Array.from(new Set(exp.tags!.map(t => t === 'Fixo' ? 'Variável' : t)));
          // Only update if there's an actual change in the tags
          if (JSON.stringify(newTags) !== JSON.stringify(exp.tags)) {
             await updateDoc(doc(db, 'expenses', exp.id), { tags: newTags });
          }
        } catch (error) {
          console.error('Error migrating Fixo to Variável:', error);
        }
      });
    }
  }, [expenses]);

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('gestor_expense_categories');
    return saved ? JSON.parse(saved) : DEFAULT_EXPENSE_CATEGORIES;
  });

  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState(categories[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newPaidBy, setNewPaidBy] = useState(users.length > 0 ? users[0].name : '');
  const [isJointPayment, setIsJointPayment] = useState(true);
  const [newReceiptUrl, setNewReceiptUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const summaryRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [paymentType, setPaymentType] = useState<'vista' | 'parcelado'>('vista');
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [installmentAmountType, setInstallmentAmountType] = useState<'total' | 'parcela'>('total');

  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryInputValue, setEditCategoryInputValue] = useState('');

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

  const handleEditCategorySubmit = async (oldCat: string) => {
    const trimmed = editCategoryInputValue.trim();
    if (!trimmed || trimmed === oldCat) {
      setEditingCategory(null);
      return;
    }

    if (categories.includes(trimmed)) {
      toast.error('Categoria já existe!');
      return;
    }

    const newCats = categories.map(c => c === oldCat ? trimmed : c);
    setCategories(newCats);

    if (newCategory === oldCat) {
      setNewCategory(trimmed);
    }
    
    if (filterCategory === oldCat) {
      setFilterCategory(trimmed);
    }

    setEditingCategory(null);

    try {
      const expensesToUpdate = expenses.filter(e => e.category === oldCat);
      const updatePromises = expensesToUpdate.map(exp => 
        updateDoc(doc(db, 'expenses', exp.id), { category: trimmed })
      );
      await Promise.all(updatePromises);
      if (expensesToUpdate.length > 0) {
        toast.success(`Categoria atualizada em ${expensesToUpdate.length} ${expensesToUpdate.length === 1 ? 'gasto' : 'gastos'}.`);
      }
    } catch (error) {
      toast.error('Erro ao atualizar gastos antigos.');
      console.error(error);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim() || !newAmount) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, 'expenses', editingId), {
          description: newDesc.trim(),
          amount: Number(newAmount),
          category: newCategory,
          tags: selectedTags,
          paidBy: newPaidBy || null,
          jointPayment: isJointPayment,
          receiptUrl: newReceiptUrl.trim() || null
        });
        setEditingId(null);
        if (prefs.enabled && prefs.onUpdate) {
          toast.success('Gasto atualizado com sucesso!');
        }
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
              jointPayment: isJointPayment,
              totalAmount: totalPurchAmount,
              installmentIndex: i + 1,
              installmentsCount: numInst,
              receiptUrl: newReceiptUrl.trim() || null
            });
          }
          if (prefs.enabled && prefs.onAdd) {
            toast.success(`Compra parcelada em ${numInst}x salva!`);
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
            paidBy: newPaidBy || null,
            jointPayment: isJointPayment,
            receiptUrl: newReceiptUrl.trim() || null
          });
          if (prefs.enabled && prefs.onAdd) {
            toast.success('Gasto salvo com sucesso!');
          }
        }

        // Notify others about the new expense
        const name = currentUserParticipant?.name || user?.displayName || user?.email || 'Usuário';
        await notifyUsers('expense_added', users, {
          userName: name,
          description: newDesc.trim(),
          amount: Number(newAmount),
          date: new Date().toLocaleDateString()
        }, user?.uid);
      }

      setNewDesc('');
      setNewAmount('');
      setSelectedTags([]);
      setPaymentType('vista');
      setInstallmentsCount(2);
      setIsJointPayment(true);
      setNewReceiptUrl('');
    } catch (error) {
      toast.error('Erro ao salvar gasto. Tente novamente.');
      console.error(error);
    }
  };

  const handleEditExpense = (exp: ExpenseItem) => {
    if(exp.id.startsWith('virtual-')) return;
    setEditingId(exp.id);
    setNewDesc(exp.description);
    setNewAmount(exp.amount.toString());
    setNewCategory(exp.category);
    setSelectedTags(exp.tags || []);
    setNewPaidBy(exp.paidBy || '');
    setIsJointPayment(exp.jointPayment !== false); // Default true if undefined
    setNewReceiptUrl(exp.receiptUrl || '');
    document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewDesc('');
    setNewAmount('');
    setSelectedTags([]);
    setIsJointPayment(true);
    setNewReceiptUrl('');
  };

  const handleRemoveExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
      if (prefs.enabled && prefs.onDelete) {
        toast.success('Gasto removido!');
      }
    } catch (error) {
      toast.error('Erro ao remover gasto.');
    }
  };

  const currentMonthPrefix = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Filter expenses by the current month
  const physicalExpensesThisMonth = expenses.filter(exp => exp.date.startsWith(currentMonthPrefix));
  
  // Calculate projected recurring expenses ('Recorrente' / 'Variável')
  const pastExpenses = expenses.filter(exp => exp.date.substring(0, 7) < currentMonthPrefix);
  
  const virtualExpenses: ExpenseItem[] = [];
  const pastRecurringOrVariable = pastExpenses.filter(exp => exp.tags?.includes('Recorrente') || exp.tags?.includes('Variável'));
  const groupsByDesc = new Map<string, { amounts: number[], latestExp: ExpenseItem }>();
  
  // Group by description (case-insensitive) to prevent duplication if both tags exist
  [...pastRecurringOrVariable].sort((a, b) => a.date.localeCompare(b.date)).forEach(exp => {
    const desc = exp.description.toLowerCase().trim();
    if (!groupsByDesc.has(desc)) {
      groupsByDesc.set(desc, { amounts: [], latestExp: exp });
    }
    groupsByDesc.get(desc)!.amounts.push(exp.amount);
    groupsByDesc.get(desc)!.latestExp = exp;
  });

  const existsThisMonth = (desc: string) => physicalExpensesThisMonth.some(e => e.description.toLowerCase().trim() === desc);

  for (const [descKey, group] of groupsByDesc.entries()) {
    if (!existsThisMonth(descKey)) {
      const { amounts, latestExp } = group;
      const isVariable = latestExp.tags?.includes('Variável');
      
      let projectedAmount = latestExp.amount;
      // If it's variable, we take the average of all past occurrences
      if (isVariable && amounts.length > 0) {
        projectedAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      }
      
      // Ensure 'Projetado' tag exists and prevent tag duplicates
      const finalTags = Array.from(new Set([...(latestExp.tags || []), 'Projetado']));

      virtualExpenses.push({
        ...latestExp,
        id: `virtual-${latestExp.id}`,
        amount: projectedAmount,
        date: `${currentMonthPrefix}-01`,
        tags: finalTags
      });
    }
  }

  const filteredExpenses = [...physicalExpensesThisMonth, ...virtualExpenses];
  
  const displayedExpenses = filteredExpenses.filter(exp => {
    const matchSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = filterCategory ? exp.category === filterCategory : true;
    return matchSearch && matchCategory;
  });

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

  const numUsers = users.length || 1;
  const userBalances = users.map(user => {
    let totalPaid = 0;
    let totalCost = 0;

    filteredExpenses.forEach(exp => {
      if (exp.paidBy === user.name) {
        totalPaid += exp.amount;
      }

      if (exp.jointPayment !== false) {
        totalCost += exp.amount / numUsers;
      } else {
        if (exp.paidBy === user.name) {
          totalCost += exp.amount;
        }
      }
    });

    return {
      name: user.name,
      totalPaid,
      totalCost,
      balance: totalPaid - totalCost
    };
  });

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

        {/* Resumo por Pessoa */}
        {users.length > 0 && filteredExpenses.length > 0 && (
          <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Resumo por Pessoa</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const monthName = currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    let text = `📊 *Fechamento: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}*\n\n`;
                    text += `Total Gasto: R$ ${totalExpenses.toFixed(2)}\n`;
                    text += `Total Entradas: R$ ${totalIncome.toFixed(2)}\n\n`;
                    userBalances.forEach(ub => {
                      text += `👤 *${ub.name}*\n`;
                      text += `Pagou: R$ ${ub.totalPaid.toFixed(2)} | Sua Parte: R$ ${ub.totalCost.toFixed(2)}\n`;
                      if (ub.balance > 0) text += `👉 *Recebe: R$ ${ub.balance.toFixed(2)}*\n\n`;
                      else if (ub.balance < 0) text += `👉 *Deve: R$ ${Math.abs(ub.balance).toFixed(2)}*\n\n`;
                      else text += `👉 *Tudo certo!*\n\n`;
                    });
                    text += `_Gerado por Gestor_`;
                    navigator.clipboard.writeText(text);
                    toast.success('Resumo copiado para a área de transferência!');
                  }}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                  title="Copiar Relatório WhatsApp"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    if (summaryRef.current) {
                      try {
                        const canvas = await html2canvas(summaryRef.current, { backgroundColor: '#ffffff', scale: 2 });
                        const image = canvas.toDataURL("image/png");
                        const link = document.createElement('a');
                        link.href = image;
                        link.download = `fechamento_${currentMonthPrefix}.png`;
                        link.click();
                        toast.success('Imagem baixada!');
                      } catch (e) {
                        toast.error('Erro ao gerar imagem.');
                      }
                    }
                  }}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                  title="Baixar Imagem"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3" ref={summaryRef}>
              <div className="hidden print:block text-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Fechamento do Mês</h2>
                <p className="text-slate-500">{currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                <div className="flex justify-center gap-4 mt-2">
                  <span className="text-sm">Total: R$ {totalExpenses.toFixed(2)}</span>
                </div>
              </div>
              {userBalances.map(ub => (
                <div key={ub.name} className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-800">{ub.name}</span>
                    <span className={`font-bold ${ub.balance > 0 ? 'text-emerald-600' : ub.balance < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                      {ub.balance > 0 ? `Recebe R$ ${ub.balance.toFixed(2)}` : ub.balance < 0 ? `Deve R$ ${Math.abs(ub.balance).toFixed(2)}` : 'R$ 0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Pagou: R$ {ub.totalPaid.toFixed(2)}</span>
                    <span>Sua Parte: R$ {ub.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <TrendsChart expenses={expenses} />

        {/* Form */}
        <section id="expense-form" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
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
              <div className="space-y-3">
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
                
                {newPaidBy && (
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <input
                      type="checkbox"
                      checked={isJointPayment}
                      onChange={(e) => setIsJointPayment(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">Pagamento em conjunto (dividir custo)</span>
                  </label>
                )}
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

            <div className="pt-2 pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase mb-2 block flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Link do Comprovante (Opcional)
              </span>
              <input
                type="url"
                placeholder="https://..."
                value={newReceiptUrl}
                onChange={(e) => setNewReceiptUrl(e.target.value)}
                className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              />
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
            <span className="text-xs text-slate-400">{displayedExpenses.length} {displayedExpenses.length === 1 ? 'registro' : 'registros'}</span>
          </div>
          
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
            >
              <option value="">Todas as Categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {displayedExpenses.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center text-slate-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20 text-indigo-400" />
              <p>Nenhuma despesa encontrada.</p>
              <p className="text-sm mt-1">Tente ajustar seus filtros ou adicione um gasto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedExpenses.map(exp => (
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
                            <User className="w-3 h-3" /> {exp.paidBy} {exp.jointPayment !== false ? '(Conjunto)' : '(Individual)'}
                          </span>
                        )}
                      </div>
                      {exp.tags && exp.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {exp.tags.map((tag, i) => (
                            <span key={`${tag}-${i}`} className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-medium border border-slate-200">
                              {tag}
                            </span>
                          ))}
                          {exp.receiptUrl && (
                            <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="bg-indigo-50 px-2 py-0.5 rounded text-[10px] text-indigo-600 font-medium border border-indigo-200 flex items-center gap-1 hover:bg-indigo-100">
                              <LinkIcon className="w-3 h-3" /> Comprovante
                            </a>
                          )}
                        </div>
                      )}
                      {(!exp.tags || exp.tags.length === 0) && exp.receiptUrl && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="bg-indigo-50 px-2 py-0.5 rounded text-[10px] text-indigo-600 font-medium border border-indigo-200 flex items-center gap-1 hover:bg-indigo-100">
                            <LinkIcon className="w-3 h-3" /> Comprovante
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold text-slate-700 text-lg">R$ {exp.amount.toFixed(2)}</span>
                      <div className="flex items-center gap-1 mt-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        {exp.id.startsWith('virtual-') ? (
                          <button
                            onClick={() => {
                              setNewDesc(exp.description);
                              setNewAmount(exp.amount.toString());
                              setNewCategory(exp.category);
                              setSelectedTags(exp.tags?.filter(t => t !== 'Projetado') || []);
                              setNewPaidBy(exp.paidBy || (users.length > 0 ? users[0].name : ''));
                              setIsJointPayment(exp.jointPayment !== false);
                              setEditingId(null);
                              document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth' });
                              toast('Confirme os dados e clique em Salvar.', { icon: '📝' });
                            }}
                            className="px-2 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                            aria-label="Confirmar projeção"
                          >
                            <Check className="w-4 h-4" /> Efetivar
                          </button>
                        ) : (
                          <>
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
                          </>
                        )}
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
                    {editingCategory === cat ? (
                      <div className="flex-1 flex items-center gap-2 mr-2">
                        <input
                          autoFocus
                          type="text"
                          value={editCategoryInputValue}
                          onChange={(e) => setEditCategoryInputValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleEditCategorySubmit(cat)}
                          className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleEditCategorySubmit(cat)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="p-1 text-slate-400 hover:bg-slate-200 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-slate-700">{cat}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setEditCategoryInputValue(cat);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleRemoveCategory(cat)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
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
