import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { makeId, netFlow, today } from '@/lib/finance';
import type { AppState, Profile, Transaction } from '@/types/finance';

type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;

type Actions = {
  createProfile: (name: string, openingBalance: number) => void;
  switchProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  importProfile: (raw: unknown) => boolean;
  setCurrentBalance: (amount: number) => void;
  addTransaction: (entry: NewTransaction) => string;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  settle: (id: string) => void;
  clearActiveData: () => void;
};

const patchActive = (state: AppState, fn: (profile: Profile) => Profile): Partial<AppState> => ({
  profiles: state.profiles.map((profile) => (profile.id === state.activeId ? fn(profile) : profile)),
});

export const useFinanceStore = create<AppState & Actions>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeId: null,

      createProfile: (name, openingBalance) => {
        const profile: Profile = {
          id: makeId(),
          name: name.trim(),
          openingBalance: Math.round(openingBalance * 100) / 100,
          startedOn: today(),
          transactions: [],
        };
        set((state) => ({ profiles: [...state.profiles, profile], activeId: profile.id }));
      },

      switchProfile: (id) => set({ activeId: id }),

      renameProfile: (id, name) =>
        set((state) => ({ profiles: state.profiles.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)) })),

      deleteProfile: (id) =>
        set((state) => {
          const profiles = state.profiles.filter((p) => p.id !== id);
          return { profiles, activeId: state.activeId === id ? profiles[0]?.id ?? null : state.activeId };
        }),

      importProfile: (raw) => {
        try {
          const data = raw as Partial<Profile>;
          if (!data || typeof data.name !== 'string' || typeof data.openingBalance !== 'number' || !Array.isArray(data.transactions)) return false;
          const transactions = data.transactions
            .filter((t) => t && typeof t.amount === 'number' && (t.type === 'credit' || t.type === 'debit') && typeof t.date === 'string')
            .map((t, index) => ({ ...t, id: t.id || makeId(), note: t.note ?? '', createdAt: t.createdAt ?? index }));
          const profile: Profile = {
            id: makeId(),
            name: data.name,
            openingBalance: data.openingBalance,
            startedOn: data.startedOn ?? today(),
            transactions,
          };
          set((state) => ({ profiles: [...state.profiles, profile], activeId: profile.id }));
          return true;
        } catch {
          return false;
        }
      },

      // The user types what they truly have right now; we back-solve the opening balance.
      setCurrentBalance: (amount) =>
        set((state) => patchActive(state, (p) => ({ ...p, openingBalance: Math.round((amount - netFlow(p.transactions)) * 100) / 100 }))),

      addTransaction: (entry) => {
        const id = makeId();
        set((state) => patchActive(state, (p) => ({ ...p, transactions: [{ ...entry, id, createdAt: Date.now() }, ...p.transactions] })));
        return id;
      },

      updateTransaction: (id, updates) =>
        set((state) => patchActive(state, (p) => ({ ...p, transactions: p.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)) }))),

      removeTransaction: (id) =>
        set((state) =>
          patchActive(state, (p) => {
            const target = p.transactions.find((t) => t.id === id);
            if (!target) return p;
            // Deleting a settlement re-opens the original; deleting an original removes its settlement too.
            const isSettlement =
              target.status === 'settled' &&
              ((target.category === 'lending' && target.type === 'credit') || (target.category === 'borrowing' && target.type === 'debit'));
            const next = isSettlement
              ? p.transactions
                  .filter((t) => t.id !== id)
                  .map((t) => (t.id === target.linkedTo ? { ...t, status: 'pending' as const, linkedTo: undefined } : t))
              : p.transactions.filter((t) => t.id !== id && t.id !== target.linkedTo);
            return { ...p, transactions: next };
          })
        ),

      settle: (id) =>
        set((state) =>
          patchActive(state, (p) => {
            const original = p.transactions.find((t) => t.id === id);
            if (!original || !original.person || original.status !== 'pending') return p;
            const isLending = original.category === 'lending';
            const settlement: Transaction = {
              id: makeId(),
              type: isLending ? 'credit' : 'debit',
              amount: original.amount,
              note: isLending ? `${original.person} returned money` : `Repaid ${original.person}`,
              person: original.person,
              category: original.category,
              status: 'settled',
              linkedTo: original.id,
              date: today(),
              createdAt: Date.now(),
            };
            return {
              ...p,
              transactions: [settlement, ...p.transactions.map((t) => (t.id === id ? { ...t, status: 'settled' as const, linkedTo: settlement.id } : t))],
            };
          })
        ),

      clearActiveData: () => {
        if (!get().activeId) return;
        set((state) => patchActive(state, (p) => ({ ...p, transactions: [] })));
      },
    }),
    {
      name: 'expense-tracker-v1',
      version: 1,
      partialize: (state) => ({ profiles: state.profiles, activeId: state.activeId }),
    }
  )
);

export const useActiveProfile = () => useFinanceStore((state) => state.profiles.find((p) => p.id === state.activeId) ?? null);
