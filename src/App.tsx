/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import ShoppingList from './components/ShoppingList';
import ListManager from './components/ListManager';
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
    setActiveListId(newList.id);
  };

  const handleDeleteList = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta lista?')) {
      setLists(lists.filter(l => l.id !== id));
      if (activeListId === id) setActiveListId(null);
    }
  };

  const handleSelectList = (id: string) => {
    setActiveListId(id);
  };

  const activeList = lists.find(l => l.id === activeListId);

  const handleUpdateItems = (newItems: ShoppingItem[]) => {
    setLists(lists.map(l => l.id === activeListId ? { ...l, items: newItems } : l));
  };

  const handleRenameList = (newName: string) => {
    setLists(lists.map(l => l.id === activeListId ? { ...l, name: newName } : l));
  };

  if (!activeListId || !activeList) {
    return (
      <ListManager 
        lists={lists} 
        onCreateList={handleCreateList} 
        onSelectList={handleSelectList} 
        onDeleteList={handleDeleteList} 
      />
    );
  }

  return (
    <ShoppingList 
      listName={activeList.name}
      items={activeList.items} 
      setItems={handleUpdateItems} 
      onBack={() => setActiveListId(null)}
      onRename={handleRenameList}
      categories={categories}
      setCategories={setCategories}
    />
  );
}

