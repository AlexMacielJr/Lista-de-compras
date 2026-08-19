import React, { useState } from 'react';
import { Plus, Trash2, ShoppingBag, ChevronRight, Calendar, ArrowLeft } from 'lucide-react';
import { ShoppingListModel } from '../types';

interface ListManagerProps {
  lists: ShoppingListModel[];
  onCreateList: (name: string) => void;
  onSelectList: (id: string) => void;
  onDeleteList: (id: string) => void;
  onBack: () => void;
}

export default function ListManager({ lists, onCreateList, onSelectList, onDeleteList, onBack }: ListManagerProps) {
  const [newListName, setNewListName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    onCreateList(newListName.trim());
    setNewListName('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between gap-2">
        <button onClick={onBack} className="p-1 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center flex-shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center justify-center -ml-8">
          <ShoppingBag className="w-6 h-6 mr-2" />
          <h1 className="text-xl font-semibold tracking-wide">Minhas Listas</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-lg w-full mx-auto space-y-6">
        <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              placeholder="Nova lista (ex: Compras do Mês)..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
              required
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-3 rounded-lg transition-colors flex items-center justify-center shadow-sm"
              aria-label="Criar Lista"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </section>

        <section>
          <div className="flex justify-between items-end mb-3 px-1">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Listas Salvas</h2>
            <span className="text-xs text-slate-400">{lists.length} {lists.length === 1 ? 'lista' : 'listas'}</span>
          </div>
          
          {lists.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center text-slate-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Você não tem nenhuma lista salva.</p>
              <p className="text-sm mt-1">Crie sua primeira lista acima!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lists.map(list => (
                <div 
                  key={list.id} 
                  onClick={() => onSelectList(list.id)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 text-lg">{list.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                      <span className="flex items-center bg-slate-100 px-2 py-1 rounded">
                        <ShoppingBag className="w-3 h-3 mr-1"/> 
                        {list.items.length} {list.items.length === 1 ? 'item' : 'itens'}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1"/> 
                        {new Date(list.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onDeleteList(list.id); 
                      }} 
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Excluir lista"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
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
