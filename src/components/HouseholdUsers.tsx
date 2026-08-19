import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Users, DollarSign, UserPlus } from 'lucide-react';
import { HouseholdUser } from '../types';

interface HouseholdUsersProps {
  onBack: () => void;
}

export default function HouseholdUsers({ onBack }: HouseholdUsersProps) {
  const [users, setUsers] = useState<HouseholdUser[]>(() => {
    const saved = localStorage.getItem('household-users');
    return saved ? JSON.parse(saved) : [];
  });

  const [newName, setNewName] = useState('');
  const [newIncome, setNewIncome] = useState('');

  useEffect(() => {
    localStorage.setItem('household-users', JSON.stringify(users));
  }, [users]);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newIncome) return;

    const newUser: HouseholdUser = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      income: Number(newIncome)
    };

    setUsers([...users, newUser]);
    setNewName('');
    setNewIncome('');
  };

  const handleRemoveUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const totalIncome = users.reduce((sum, u) => sum + u.income, 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <header className="bg-sky-600 text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between gap-2">
        <button onClick={onBack} className="p-1 hover:bg-sky-700 rounded-lg transition-colors flex items-center justify-center flex-shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center justify-center -ml-8">
          <Users className="w-6 h-6 mr-2" />
          <h1 className="text-xl font-semibold tracking-wide">Participantes</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-lg w-full mx-auto space-y-6">
        
        {/* Total Summary */}
        <section className="bg-sky-50 p-6 rounded-2xl border border-sky-100 shadow-sm flex flex-col items-center justify-center">
          <span className="text-sm font-semibold text-sky-500 uppercase tracking-widest mb-1">Renda Total (Mês)</span>
          <span className="text-4xl font-bold text-sky-700">R$ {totalIncome.toFixed(2)}</span>
        </section>

        {/* Form */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4 text-slate-700">
            <UserPlus className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold">Adicionar Pessoa</h2>
          </div>
          <form onSubmit={handleAddUser} className="space-y-3">
            <input
              type="text"
              placeholder="Nome da pessoa"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
              required
            />
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400">R$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Renda Mensal"
                  value={newIncome}
                  onChange={(e) => setNewIncome(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-sky-600 hover:bg-sky-700 text-white font-medium px-4 py-3 rounded-lg transition-colors flex items-center justify-center shadow-sm w-32"
              >
                Incluir
              </button>
            </div>
          </form>
        </section>

        {/* Users List */}
        <section>
          <div className="flex justify-between items-end mb-3 px-1">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Membros Adicionados</h2>
            <span className="text-xs text-slate-400">{users.length} {users.length === 1 ? 'pessoa' : 'pessoas'}</span>
          </div>
          
          {users.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20 text-sky-400" />
              <p>Nenhuma pessoa adicionada ainda.</p>
              <p className="text-sm mt-1">Adicione os membros para compor a renda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 text-lg">{user.name}</span>
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Renda: R$ {user.income.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveUser(user.id)} 
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remover pessoa"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
