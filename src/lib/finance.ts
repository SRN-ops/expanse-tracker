import { format } from 'date-fns';
import type { Category, Transaction } from '@/types/finance';

export const categoryMeta: Record<Category, { label: string; short: string; color: string; soft: string; icon: string }> = {
  food: { label: 'Food', short: 'FUEL', color: '#FF9F1C', soft: '#fff0c2', icon: '◒' },
  travel: { label: 'Travel', short: 'MOVE', color: '#2B7BFF', soft: '#dbe8ff', icon: '↗' },
  shopping: { label: 'Shopping', short: 'STUFF', color: '#FF4D7E', soft: '#ffe0e9', icon: '□' },
  other: { label: 'Other', short: 'MISC', color: '#9b8cff', soft: '#eeeaff', icon: '✳' },
  lending: { label: 'Lent', short: 'GAVE', color: '#E8103A', soft: '#ffdce4', icon: '→' },
  borrowing: { label: 'Borrowed', short: 'TOOK', color: '#12a889', soft: '#d9f6ee', icon: '←' },
};

export const spendCategories: Category[] = ['food', 'travel', 'shopping', 'other'];
export const debitCategories: Category[] = [...spendCategories, 'lending'];
export const allCategories: Category[] = [...spendCategories, 'lending', 'borrowing'];

export const noteIdeas: Record<string, string[]> = {
  food: ['Chai', 'Lunch', 'Dinner', 'Groceries', 'Snacks'],
  travel: ['Metro', 'Auto', 'Cab', 'Petrol', 'Train'],
  shopping: ['Clothes', 'Online order', 'Essentials', 'Gift'],
  other: ['Bill', 'Recharge', 'Rent', 'Medicine'],
  lending: ['Lent for a day', 'Emergency help'],
  borrowing: ['Emergency float', 'Till salary'],
  income: ['Salary', 'Pocket money', 'Refund', 'Freelance'],
};

export const isSpend = (item: Transaction) => item.type === 'debit' && !!item.category && spendCategories.includes(item.category);
export const isIncome = (item: Transaction) => item.type === 'credit' && !item.category;

export const sumBy = (items: Transaction[], pick: (item: Transaction) => boolean) =>
  items.reduce((sum, item) => (pick(item) ? sum + item.amount : sum), 0);

export const netFlow = (items: Transaction[]) =>
  items.reduce((sum, item) => sum + (item.type === 'credit' ? item.amount : -item.amount), 0);

export const money = (value: number) => {
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(rounded));
  return `${rounded < 0 ? '−' : ''}₹${formatted}`;
};

export const parseAmount = (value: string) => {
  const cleaned = value.replace(/[₹,\s]/g, '');
  if (!cleaned) return NaN;
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : NaN;
};

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const today = () => toDateKey(new Date());
export const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return toDateKey(d); };
export const dateLabel = (value: string) => format(new Date(`${value}T12:00:00`), 'dd MMM yyyy');
export const monthKey = (value: string) => value.slice(0, 7);
export const monthLabel = (key: string) => format(new Date(`${key}-01T12:00:00`), 'MMM');
export const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const sortRecent = (items: Transaction[]) =>
  [...items].sort((a, b) => (a.date === b.date ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : a.date < b.date ? 1 : -1));
