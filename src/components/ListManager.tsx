import React, { useState } from 'react';
import { Plus, Trash2, ShoppingBag, ChevronRight, Calendar, ArrowLeft, Upload, X, FileText } from 'lucide-react';
import { ShoppingListModel, ShoppingItem } from '../types';
import toast from 'react-hot-toast';

interface ListManagerProps {
  lists: ShoppingListModel[];
  onCreateList: (name: string) => void;
  onImportList: (name: string, items: ShoppingItem[]) => void;
  onSelectList: (id: string) => void;
  onDeleteList: (id: string) => void;
  onBack: () => void;
}

export default function ListManager({ lists, onCreateList, onImportList, onSelectList, onDeleteList, onBack }: ListManagerProps) {
  const [newListName, setNewListName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importName, setImportName] = useState('Lista Importada');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    onCreateList(newListName.trim());
    setNewListName('');
  };

  const handleImportText = () => {
    if (!importText.trim()) {
      toast.error('Cole os itens da lista primeiro.');
      return;
    }
    
    // Parse text by line, ignoring empty lines
    const lines = importText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      toast.error('Nenhum item válido encontrado.');
      return;
    }

    const items: ShoppingItem[] = lines.map(line => {
      // Basic attempt to parse quantity from the beginning (e.g. "2x Maçã", "3 Bananas")
      let name = line;
      let quantity = 1;
      
      const qtyMatch = line.match(/^(\d+)[xX\s-]+\s*(.*)$/);
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1], 10);
        name = qtyMatch[2].trim();
      }

      return {
        id: crypto.randomUUID(),
        name: name,
        quantity: quantity,
        unitPrice: 0,
        checked: false
      };
    });

    onImportList(importName.trim() || 'Lista Importada', items);
    setShowImportModal(false);
    setImportText('');
    setImportName('Lista Importada');
    toast.success(`${items.length} itens importados com sucesso!`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between gap-2">
        <button onClick={onBack} className="p-1 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center flex-shrink-0">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <ShoppingBag className="w-6 h-6 mr-2" />
          <h1 className="text-xl font-semibold tracking-wide">Minhas Listas</h1>
        </div>
        <button 
          onClick={() => setShowImportModal(true)} 
          className="p-1 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
          title="Importar Lista"
        >
          <Upload className="w-6 h-6" />
        </button>
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Importar Lista
              </h2>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-sm text-slate-500">
                Cole abaixo os itens da sua lista (como uma mensagem do WhatsApp). Cada linha será um novo item na sua lista de compras.
              </p>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Lista</label>
                <input
                  type="text"
                  value={importName}
                  onChange={e => setImportName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: Compras do Mês"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Itens (um por linha)</label>
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[150px]"
                  placeholder="2x Maçã&#10;Leite desnatado&#10;Café"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-3 font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleImportText}
                className="flex-1 py-3 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
