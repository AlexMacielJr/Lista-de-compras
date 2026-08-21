/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Wallet, ChevronRight, Users, LogOut, Lightbulb, RefreshCw, Menu } from 'lucide-react';
import ShoppingList from './components/ShoppingList';
import ListManager from './components/ListManager';
import MonthlyExpenses from './components/MonthlyExpenses';
import HouseholdUsers from './components/HouseholdUsers';
import Sidebar from './components/Sidebar';
import { ShoppingItem, ShoppingListModel } from './types';
import { useHousehold } from './contexts/HouseholdContext';

import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

import { Toaster } from 'react-hot-toast';
import { notifyUsers } from './lib/notify';
import toast from 'react-hot-toast';

function WeeklyTip() {
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTip = async () => {
      try {
        const cachedTip = localStorage.getItem('weeklyTip');
        const cachedDate = localStorage.getItem('weeklyTipDate');
        
        // Refresh tip if it's older than 7 days
        const isFresh = cachedDate && (Date.now() - parseInt(cachedDate) < 7 * 24 * 60 * 60 * 1000);
        
        if (cachedTip && isFresh) {
          setTip(cachedTip);
          setLoading(false);
          return;
        }

        const res = await fetch('/api/tips/weekly');
        const data = await res.json();
        
        if (data.tip) {
          setTip(data.tip);
          localStorage.setItem('weeklyTip', data.tip);
          localStorage.setItem('weeklyTipDate', Date.now().toString());
        }
      } catch (error) {
        console.error('Error fetching weekly tip:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTip();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-sm mt-4 bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl shadow-sm border border-amber-100 flex items-start gap-3">
        <RefreshCw className="w-6 h-6 text-amber-500 animate-spin flex-shrink-0" />
        <div className="text-sm text-amber-800 animate-pulse">Gerando dica inteligente de economia...</div>
      </div>
    );
  }

  if (!tip) return null;

  return (
    <div className="w-full max-w-sm mt-4 bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl shadow-sm border border-amber-100 flex items-start gap-3">
      <div className="bg-white p-2 rounded-full shadow-sm">
        <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0" />
      </div>
      <div>
        <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Dica Inteligente</h3>
        <p className="text-sm text-amber-900 leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}

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
  const { householdId, logout, user } = useHousehold();
  
  const [listsData, listsLoading] = useCollectionData(
    query(collection(db, 'shoppingLists'), where('householdId', '==', householdId))
  );
  const lists = (listsData as ShoppingListModel[]) || [];

  const [usersData] = useCollectionData(
    query(collection(db, 'participants'), where('householdId', '==', householdId))
  );
  const participants = (usersData as any[]) || [];

  const handleNotifyListUpdate = async (listName: string) => {
    try {
      const name = user?.displayName || user?.email || 'Usuário';
      await notifyUsers('list_updated', participants as any, { userName: name, listName }, user?.uid);
      toast.success('Notificação enviada para a casa!');
    } catch (e) {
      toast.error('Erro ao notificar a casa.');
    }
  };

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('shopping-categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<'home' | 'shopping' | 'expenses' | 'users'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (user && householdId) {
      const checkProfile = async () => {
        try {
          const docRef = doc(db, 'participants', user.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists() || !docSnap.data().income) {
            setIsSidebarOpen(true);
          }
        } catch (error) {
          console.error("Error checking user profile:", error);
        }
      };
      checkProfile();
    }
  }, [user, householdId]);

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
    localStorage.setItem('shopping-categories', JSON.stringify(categories));
  }, [categories]);

  const handleCreateList = async (name: string) => {
    const id = crypto.randomUUID();
    const newList: ShoppingListModel & { householdId: string } = {
      id,
      householdId: householdId!,
      name,
      items: [],
      createdAt: Date.now()
    };
    await setDoc(doc(db, 'shoppingLists', id), newList);
    navigate(`shopping/${id}`);
  };

  const handleImportList = async (name: string, items: ShoppingItem[]) => {
    const id = crypto.randomUUID();
    const newList: ShoppingListModel & { householdId: string } = {
      id,
      householdId: householdId!,
      name,
      items,
      createdAt: Date.now()
    };
    await setDoc(doc(db, 'shoppingLists', id), newList);
    navigate(`shopping/${id}`);
  };

  const handleDeleteList = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta lista?')) {
      await deleteDoc(doc(db, 'shoppingLists', id));
      if (activeListId === id) navigate('shopping');
    }
  };

  const handleSelectList = (id: string) => {
    navigate(`shopping/${id}`);
  };

  const activeList = lists.find(l => l.id === activeListId);

  const handleUpdateItems = async (newItems: ShoppingItem[]) => {
    if (!activeListId) return;
    await updateDoc(doc(db, 'shoppingLists', activeListId), { items: newItems });
  };

  const handleRenameList = async (newName: string) => {
    if (!activeListId) return;
    await updateDoc(doc(db, 'shoppingLists', activeListId), { name: newName });
  };

  const renderContent = () => {
    if (currentRoute === 'home') {
      return (
        <div className="flex flex-col h-full bg-slate-50 items-center justify-center p-6 space-y-4 relative">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-6 left-6 p-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-slate-800">Bem-vindo</h1>
            <p className="text-slate-500 mt-2">O que você deseja gerenciar hoje?</p>
            {householdId && (
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg max-w-sm mx-auto text-sm">
                <span className="text-indigo-600 block mb-1 font-medium">Seu Código de Compartilhamento (Família):</span>
                <span className="font-mono bg-white px-2 py-1 rounded border border-indigo-200 select-all font-bold tracking-wide">{householdId}</span>
              </div>
            )}
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

          <WeeklyTip />
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
          onImportList={handleImportList}
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
        onNotify={() => handleNotifyListUpdate(activeList.name)}
      />
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <Toaster position="top-center" />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

