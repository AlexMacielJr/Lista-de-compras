import React, { useState } from 'react';
import { Plus, Trash2, ShoppingCart, Loader2, Sparkles, ChevronRight, Calculator, ArrowLeft, Tag, Edit2, Check, X, CheckCircle2, Circle, Settings2, Mail } from 'lucide-react';
import { ShoppingItem, AIAnalysisResult } from '../types';

interface ShoppingListProps {
  listName: string;
  items: ShoppingItem[];
  setItems: (items: ShoppingItem[]) => void;
  onBack: () => void;
  onRename: (newName: string) => void;
  categories: string[];
  setCategories: (cats: string[]) => void;
  onNotify?: () => void;
}

export default function ShoppingList({ listName, items, setItems, onBack, onRename, categories, setCategories, onNotify }: ShoppingListProps) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(categories[0] || 'Outros');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(listName);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editNameValue.trim()) {
      onRename(editNameValue.trim());
    } else {
      setEditNameValue(listName); // Revert to old name if empty
    }
    setIsEditingName(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      quantity: 1,
      unitPrice: 0,
      category: newItemCategory
    };

    setItems([...items, newItem]);
    setNewItemName('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const toggleItemCheck = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const updateItem = (id: string, field: 'quantity' | 'unitPrice', value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: value === '' ? '' : Number(value)
        };
      }
      return item;
    }));
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      setNewCategoryName('');
      return;
    }
    setCategories([...categories, newCategoryName.trim()]);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (catToDelete: string) => {
    setCategories(categories.filter(c => c !== catToDelete));
    if (newItemCategory === catToDelete) {
      setNewItemCategory(categories.find(c => c !== catToDelete) || 'Outros');
    }
  };

  const totalSpent = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  // Sort categories according to our predefined list, followed by any custom ones
  const activeCategories = categories.filter(c => groupedItems[c]);
  Object.keys(groupedItems).forEach(c => {
    if (!categories.includes(c) && !activeCategories.includes(c)) {
      activeCategories.push(c);
    }
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between gap-2">
        <button onClick={onBack} className="p-1 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center flex-shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        {isEditingName ? (
          <form onSubmit={handleRenameSubmit} className="flex-1 flex items-center gap-2">
            <input 
              autoFocus
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full"
            />
            <button type="submit" className="p-1.5 hover:bg-emerald-700 rounded-lg transition-colors flex-shrink-0 text-white">
              <Check className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => setIsEditingName(false)} className="p-1.5 hover:bg-emerald-700 rounded-lg transition-colors flex-shrink-0 text-emerald-200 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </form>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-2 overflow-hidden">
            <h1 className="text-xl font-semibold tracking-wide truncate">{listName}</h1>
            <button 
              onClick={() => {
                setEditNameValue(listName);
                setIsEditingName(true);
              }} 
              className="p-1 hover:bg-emerald-700 rounded-lg transition-colors flex-shrink-0 opacity-80 hover:opacity-100"
              aria-label="Editar nome da lista"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {!isEditingName && (
          <button 
            onClick={onNotify}
            className="p-1 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
            title="Notificar Família"
          >
            <Mail className="w-6 h-6" />
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-lg w-full mx-auto space-y-6">
        
        {/* Formulário de Adição Rápida */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <form onSubmit={handleAddItem} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Adicionar produto à lista..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
                required
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-3 rounded-lg transition-colors flex items-center justify-center shadow-sm"
                aria-label="Adicionar Item"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              <Tag className="w-4 h-4 text-emerald-600" />
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-700 focus:outline-none appearance-none"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button 
                type="button" 
                onClick={() => setShowCategoryModal(true)}
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                title="Editar categorias"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </form>
        </section>

        {/* Lista de Itens (Checklist) */}
        <section>
          <div className="flex justify-between items-end mb-3 px-1">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Produtos</h2>
            <span className="text-xs text-slate-400">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
          </div>
          
          {items.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Sua lista está vazia.</p>
              <p className="text-sm mt-1">Adicione produtos para criar seu catálogo.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeCategories.map(category => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2 px-1 border-b border-emerald-100 pb-1">
                    <h3 className="text-sm font-bold text-emerald-700">{category}</h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                      {groupedItems[category].length}
                    </span>
                  </div>
                  
                  {groupedItems[category].map(item => (
                    <div key={item.id} className={`p-4 rounded-xl shadow-sm border flex flex-col gap-3 transition-all hover:shadow-md ${item.checked ? 'bg-slate-50/50 border-emerald-200/50 opacity-80' : 'bg-white border-slate-100'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleItemCheck(item.id)} 
                            className={`transition-colors ${item.checked ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}
                          >
                            {item.checked ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                          </button>
                          <h3 className={`font-medium text-lg transition-all ${item.checked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {item.name}
                          </h3>
                        </div>
                        <button onClick={() => handleRemoveItem(item.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className={`flex gap-3 items-center p-2 rounded-lg border ${item.checked ? 'bg-transparent border-transparent' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex flex-col w-20">
                          <label className="text-[10px] uppercase font-semibold text-slate-400 mb-1 ml-1">Qtd</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                            className="w-full px-2 py-2 text-center bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                          />
                        </div>
                        <div className="flex flex-col flex-1">
                          <label className="text-[10px] uppercase font-semibold text-slate-400 mb-1 ml-1">Preço (R$)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            value={item.unitPrice === 0 ? '' : item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                          />
                        </div>
                        <div className="flex flex-col w-24 text-right justify-center pt-4 pr-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Subtotal</span>
                          <span className="font-semibold text-slate-700">
                            R$ {((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Resumo */}
        {items.length > 0 && (
          <section className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 sticky bottom-4 shadow-lg shadow-emerald-100/50">
            <div className="flex justify-between items-center text-emerald-900">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <span className="font-medium">Total do Carrinho</span>
              </div>
              <span className="text-2xl font-bold">R$ {totalSpent.toFixed(2)}</span>
            </div>
          </section>
        )}
      </main>

      {/* Modal de Categorias */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-semibold text-slate-800">Gerenciar Categorias</h2>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-700 font-medium">{cat}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">Nenhuma categoria cadastrada.</p>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nova categoria..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Adicionar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
