import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, DollarSign, Users } from 'lucide-react';
import { useHousehold } from '../contexts/HouseholdContext';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HouseholdUser } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { householdId, user, logout } = useHousehold();
  
  const [usersData] = useCollectionData(
    query(collection(db, 'participants'), where('householdId', '==', householdId))
  );
  
  const participants = (usersData as HouseholdUser[]) || [];
  const currentUserParticipant = participants.find(p => p.id === user?.uid);
  const otherParticipants = participants.filter(p => p.id !== user?.uid);

  const [income, setIncome] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUserParticipant) {
      setIncome(currentUserParticipant.income.toString());
    }
  }, [currentUserParticipant]);

  const handleSaveProfile = async () => {
    if (!user || !householdId) return;
    setIsSaving(true);
    try {
      const participantRef = doc(db, 'participants', user.uid);
      await setDoc(participantRef, {
        id: user.uid,
        householdId,
        name: user.displayName || user.email || 'Usuário',
        income: Number(income) || 0,
      }, { merge: true });
    } catch (error) {
      console.error("Error saving profile", error);
    }
    setIsSaving(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed inset-y-0 left-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-sky-600 text-white">
          <h2 className="font-bold text-lg">Meu Perfil</h2>
          <button onClick={onClose} className="p-1 hover:bg-sky-700 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Current User Info */}
          <div className="flex flex-col items-center text-center space-y-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-20 h-20 rounded-full border-4 border-sky-100 shadow-sm" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center border-4 border-white shadow-sm">
                <UserIcon className="w-8 h-8" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{user?.displayName || 'Usuário'}</h3>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <label className="block text-sm font-semibold text-slate-700">Sua Renda Mensal</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-400">R$</span>
              </div>
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
            <button 
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Renda'}
            </button>
          </div>

          {/* Household Summary */}
          {otherParticipants.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Família
              </h4>
              <div className="space-y-2">
                {otherParticipants.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                    <span className="font-medium text-slate-700 text-sm">{p.name}</span>
                    <span className="text-sm text-emerald-600 font-semibold">R$ {p.income.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </>
  );
}
