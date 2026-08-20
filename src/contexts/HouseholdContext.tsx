import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';

interface HouseholdContextType {
  householdId: string | null;
  joinHousehold: (id: string) => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  logout: () => void;
  user: User | null;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [checkingHousehold, setCheckingHousehold] = useState(true);

  useEffect(() => {
    if (!user) {
      setHouseholdId(null);
      setCheckingHousehold(false);
      return;
    }

    const checkHousehold = async () => {
      setCheckingHousehold(true);
      try {
        const q = query(collection(db, 'households'), where('members', 'array-contains', user.uid));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setHouseholdId(snapshot.docs[0].id);
        }
      } catch (err) {
        console.error("Error checking household", err);
      }
      setCheckingHousehold(false);
    };

    checkHousehold();
  }, [user]);

  const joinHousehold = async (id: string) => {
    if (!user) return;
    const hRef = doc(db, 'households', id);
    await updateDoc(hRef, {
      members: arrayUnion(user.uid)
    });
    setHouseholdId(id);
  };

  const createHousehold = async (name: string) => {
    if (!user) return;
    const docRef = await addDoc(collection(db, 'households'), {
      name,
      members: [user.uid]
    });
    setHouseholdId(docRef.id);
  };

  const logout = () => {
    signOut(auth);
  };

  if (loading || checkingHousehold) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Login Seguro</h1>
          <p className="text-slate-500 mb-6 text-sm">Faça login para salvar e sincronizar seus gastos com sua família.</p>
          <button 
            onClick={async () => {
              try {
                await signInWithPopup(auth, new GoogleAuthProvider());
              } catch (error: any) {
                alert("Erro ao fazer login: " + error.message + "\n\nSe você estiver na Vercel, não esqueça de adicionar o domínio na aba 'Domínios Autorizados' do Firebase Console.");
              }
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  if (!householdId) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-4 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Criar Família / Grupo</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const val = new FormData(e.currentTarget).get('name') as string;
            if(val) createHousehold(val);
          }} className="flex gap-2">
            <input name="name" placeholder="Ex: Casa" className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">Criar</button>
          </form>
        </div>

        <div className="text-slate-400">ou</div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Entrar com Código</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const val = new FormData(e.currentTarget).get('code') as string;
            if(val) joinHousehold(val);
          }} className="flex gap-2">
            <input name="code" placeholder="Código de convite" className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">Entrar</button>
          </form>
        </div>
        
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-700">Sair da conta</button>
      </div>
    );
  }

  return (
    <HouseholdContext.Provider value={{ householdId, joinHousehold, createHousehold, logout, user: user as User | null }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}
