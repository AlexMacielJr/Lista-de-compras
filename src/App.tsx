/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Wallet, ChevronRight, Users } from 'lucide-react';
import ShoppingList from './components/ShoppingList';
import ListManager from './components/ListManager';
import MonthlyExpenses from './components/MonthlyExpenses';
import HouseholdUsers from './components/HouseholdUsers';
import { ShoppingItem, ShoppingListModel } from './types';

const DEFAULT_CATEGORIES = [
  'Alimentos Básicos',
  'Açougue & Peixaria',
  'Frios & Laticínios',
  'Hortifruti',
  'Bebidas',
  'Limpeza',
  'Higiene Pessoal',
  'Outros'
];

export default function App() {
  const [lists, setLists] = useState<ShoppingListModel[]>(() => {
    const saved = localStorage.getItem('shopping-lists-v2');
    if (saved) return JSON.parse(saved);
    
    // Migrate old list if exists
    const oldSaved = localStorage.getItem('shopping-list');
    if (oldSaved) {
      const oldItems = JSON.parse(oldSaved);
      if (oldItems && oldItems.length > 0) {
        return [{
          id: crypto.randomUUID(),
          name: 'Lista Antiga',
          items: oldItems,
          createdAt: Date.now()
        }];
      }
    }
    return [];
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('shopping-categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<'home' | 'shopping' | 'expenses' | 'users'>('home');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash || hash === 'home') {
        setCurrentRoute('home');
        setActiveListId(null);
      } else if (hash.startsWith('shopping/')) {
        setCurrentRoute('shopping');
        setActiveListId(hash.split('/')[1]);
      } else if (hash === 'shopping') {
        setCurrentRoute('shopping');
        setActiveListId(null);
      } else if (hash === 'expenses') {
        setCurrentRoute('expenses');
        setActiveListId(null);
      } else if (hash === 'users') {
        setCurrentRoute('users');
        setActiveListId(null);
      }
    };

    if (!window.location.hash) {
      window.location.hash = 'home';
    } else {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (route: string) => {
    window.location.hash = route;
  };

  useEffect(() => {
    localStorage.setItem('shopping-lists-v2', JSON.stringify(lists));
  }, [lists]);

  useEffect(() => {
    localStorage.setItem('shopping-categories', JSON.stringify(categories));
  }, [categories]);

  const handleCreateList = (name: string) => {
    const newList: ShoppingListModel = {
      id: crypto.randomUUID(),
      name,
      items: [],
      createdAt: Date.now()
    };
    setLists([newList, ...lists]);
    navigate(`shopping/${newList.id}`);
  };

  const handleDeleteList = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta lista?')) {
      setLists(lists.filter(l => l.id !== id));
      if (activeListId === id) navigate('shopping');
    }
  };

  const handleSelectList = (id: string) => {
    navigate(`shopping/${id}`);
  };

  const activeList = lists.find(l => l.id === activeListId);

  const handleUpdateItems = (newItems: ShoppingItem[]) => {
    setLists(lists.map(l => l.id === activeListId ? { ...l, items: newItems } : l));
  };

  const handleRenameList = (newName: string) => {
    setLists(lists.map(l => l.id === activeListId ? { ...l, name: newName } : l));
  };

  const renderContent = () => {
    if (currentRoute === 'home') {
      return (
        <div className="flex flex-col h-full bg-slate-50 items-center justify-center p-6 space-y-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-slate-800">Bem-vindo</h1>
            <p className="text-slate-500 mt-2">O que você deseja gerenciar hoje?</p>
          </div>

          <button 
            onClick={() => navigate('shopping')}
            className="w-full max-w-sm bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md hover:border-emerald-300 transition-all flex items-center gap-5 group"
          >
            <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <div className="text-left flex-1">
              <h2 className="text-xl font-bold text-slate-800">Compras</h2>
              <p className="text-sm text-slate-500 mt-1">Listas e supermercado</p>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-emerald-500" />
          </button>

          <button 
            onClick={() => navigate('expenses')}
            className="w-full max-w-sm bg-white p-5 rounded-2xl shadow-sm border border-indigo-100 hover:shadow-md hover:border-indigo-300 transition-all flex items-center gap-5 group"
          >
            <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Wallet className="w-7 h-7" />
            </div>
            <div className="text-left flex-1">
              <h2 className="text-xl font-bold text-slate-800">Gastos Mensais</h2>
              <p className="text-sm text-slate-500 mt-1">Contas e despesas</p>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-500" />
          </button>

          <button 
            onClick={() => navigate('users')}
            className="w-full max-w-sm bg-white p-5 rounded-2xl shadow-sm border border-sky-100 hover:shadow-md hover:border-sky-300 transition-all flex items-center gap-5 group"
          >
            <div className="bg-sky-100 p-4 rounded-full text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <Users className="w-7 h-7" />
            </div>
            <div className="text-left flex-1">
              <h2 className="text-xl font-bold text-slate-800">Participantes</h2>
              <p className="text-sm text-slate-500 mt-1">Pessoas e rendas</p>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-sky-500" />
          </button>
        </div>
      );
    }

    if (currentRoute === 'expenses') {
      return <MonthlyExpenses onBack={() => navigate('home')} />;
    }

    if (currentRoute === 'users') {
      return <HouseholdUsers onBack={() => navigate('home')} />;
    }

    if (!activeListId || !activeList) {
      return (
        <ListManager 
          lists={lists} 
          onCreateList={handleCreateList} 
          onSelectList={handleSelectList} 
          onDeleteList={handleDeleteList} 
          onBack={() => navigate('home')}
        />
      );
    }

    return (
      <ShoppingList 
        listName={activeList.name}
        items={activeList.items} 
        setItems={handleUpdateItems} 
        onBack={() => navigate('shopping')}
        onRename={handleRenameList}
        categories={categories}
        setCategories={setCategories}
      />
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

