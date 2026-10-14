export type Category = 'food' | 'travel' | 'shopping' | 'other' | 'lending' | 'borrowing';
export type TransactionType = 'credit' | 'debit';
export type SettlementStatus = 'pending' | 'settled';

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category?: Category;
  note: string;
  person?: string;
  status?: SettlementStatus;
  linkedTo?: string;
  date: string; // YYYY-MM-DD (local)
  createdAt: number;
};

export type Profile = {
  id: string;
  name: string;
  openingBalance: number;
  startedOn: string;
  transactions: Transaction[];
};

export type AppState = {
  profiles: Profile[];
  activeId: string | null;
};
