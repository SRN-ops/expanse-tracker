import { useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Settings2 } from 'lucide-react';
import { categoryMeta, dateLabel, debitCategories, isIncome, isSpend, money, monthKey, noteIdeas, parseAmount, sortRecent, sumBy, today, yesterday } from '@/lib/finance';
import type { Category, Profile, Transaction } from '@/types/finance';

type Entry = Omit<Transaction, 'id' | 'createdAt'>;

export function BalanceCard({ profile, balance, onSave }: { profile: Profile; balance: number; onSave: (amount: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const month = monthKey(today());
  const monthItems = profile.transactions.filter((t) => monthKey(t.date) === month);
  const income = sumBy(monthItems, isIncome);
  const spent = sumBy(monthItems, isSpend);

  const save = () => {
    const amount = parseAmount(value);
    if (Number.isNaN(amount)) return setError('Enter a valid amount.');
    onSave(amount);
    setEditing(false);
    setError('');
  };

  return (
    <div className="balance-card">
      <div className="card-head"><small className="mono">YOUR BALANCE</small><span className="card-stamp mono">LIVE</span></div>
      <p className="balance-number">{money(balance)}</p>
      <div className="month-stats">
        <div><small className="mono">IN THIS MONTH</small><b>{money(income)}</b></div>
        <div><small className="mono">SPENT THIS MONTH</small><b>{money(spent)}</b></div>
      </div>
      <div className="balance-rule" />
      {editing ? (
        <div className="balance-edit">
          <label className="mono" htmlFor="current-balance">What do you have right now?</label>
          <div className="inline-edit">
            <input id="current-balance" autoFocus inputMode="decimal" value={value} placeholder={String(Math.round(balance))} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
            <button onClick={save}>Save</button>
            <button className="plain" onClick={() => { setEditing(false); setError(''); }}>Cancel</button>
          </div>
          {error && <p className="form-error dark" role="alert">{error}</p>}
        </div>
      ) : (
        <div className="balance-bottom">
          <span className="mono">Started with<br /><b>{money(profile.openingBalance)}</b> on {dateLabel(profile.startedOn)}</span>
          <button className="text-button" onClick={() => { setEditing(true); setValue(''); }}><Settings2 size={16} /> Correct balance</button>
        </div>
      )}
    </div>
  );
}

export function QuickAdd({ profile, balance, active, setActive, onAdd }: { profile: Profile; balance: number; active: 'credit' | 'debit'; setActive: (t: 'credit' | 'debit') => void; onAdd: (entry: Entry) => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category | 'income'>('food');
  const [person, setPerson] = useState('');
  const [date, setDate] = useState(today());
  const [error, setError] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  const type = active;
  const cat: Category | 'income' = type === 'debit' ? (category === 'income' || category === 'borrowing' ? 'food' : category) : category === 'borrowing' ? 'borrowing' : 'income';
  const needsPerson = cat === 'lending' || cat === 'borrowing';
  const numeric = parseAmount(amount);
  const people = useMemo(() => Array.from(new Set(profile.transactions.filter((t) => t.person).map((t) => t.person as string))).slice(0, 5), [profile.transactions]);
  const recent = useMemo(() => sortRecent(profile.transactions).slice(0, 3), [profile.transactions]);
  const overspend = type === 'debit' && !Number.isNaN(numeric) && numeric > balance;
  const dateMode = date === today() ? 'today' : date === yesterday() ? 'yesterday' : 'pick';

  const switchType = (next: 'credit' | 'debit') => {
    setActive(next);
    setCategory(next === 'debit' ? 'food' : 'income');
    setError('');
    setPerson('');
    window.setTimeout(() => amountRef.current?.focus(), 0);
  };

  const addChip = (n: number) => setAmount(String((Number.isNaN(numeric) ? 0 : numeric) + n));

  const submit = () => {
    if (Number.isNaN(numeric) || numeric <= 0) return setError('Enter an amount greater than zero.');
    if (needsPerson && !person.trim()) return setError('Add the name of the person.');
    const fallback = cat === 'income' ? 'Income' : categoryMeta[cat].label;
    onAdd({
      type,
      amount: numeric,
      note: note.trim() || fallback,
      date,
      ...(cat !== 'income' ? { category: cat } : {}),
      ...(needsPerson ? { person: person.trim(), status: 'pending' as const } : {}),
    });
    setAmount(''); setNote(''); setPerson(''); setError('');
    amountRef.current?.focus();
  };

  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit(); };
  const pickCategories: (Category | 'income')[] = type === 'debit' ? debitCategories : ['income', 'borrowing'];
  const ideas = noteIdeas[cat] ?? [];

  return (
    <div className="form-card">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={type === 'debit'} className={type === 'debit' ? 'active' : ''} onClick={() => switchType('debit')}><ArrowDownRight size={16} /> SPEND</button>
        <button role="tab" aria-selected={type === 'credit'} className={type === 'credit' ? 'active' : ''} onClick={() => switchType('credit')}><ArrowUpRight size={16} /> RECEIVE</button>
      </div>
      <div className="transaction-form">
        <div className="amount-block">
          <label htmlFor="amount" className="mono">Amount</label>
          <div className="amount-wrap light"><b>₹</b><input id="amount" ref={amountRef} inputMode="decimal" enterKeyHint="done" autoComplete="off" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} onKeyDown={onEnter} /></div>
          <div className="chips">
            {[100, 500, 1000, 5000].map((n) => <button key={n} onClick={() => addChip(n)}>+{money(n)}</button>)}
            {amount && <button className="clear" onClick={() => setAmount('')}>Clear</button>}
          </div>
          {overspend && <p className="hint warn">This is more than your balance of {money(balance)}. It will take you below zero.</p>}
        </div>

        <div className="field-group">
          <span className="mono">{type === 'debit' ? 'Classify it' : 'What kind?'}</span>
          <div className="category-picker">
            {pickCategories.map((item) => {
              const color = item === 'income' ? '#FFF01F' : categoryMeta[item].color;
              return (
                <button key={item} className={cat === item ? 'selected' : ''} style={{ ['--chip-color' as string]: color }} onClick={() => { setCategory(item); setPerson(''); }}>
                  {item === 'income' ? '₹ Income' : `${categoryMeta[item].icon} ${categoryMeta[item].label}`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="note" className="mono">{type === 'credit' ? 'Where from?' : 'What for?'} <i>(optional)</i></label>
          <input id="note" autoComplete="off" autoCapitalize="sentences" enterKeyHint="done" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={onEnter} placeholder={type === 'credit' ? 'Salary, refund, side quest' : 'Dinner, cab, recharge'} />
          {ideas.length > 0 && <div className="chips">{ideas.map((idea) => <button key={idea} onClick={() => setNote(idea)}>{idea}</button>)}</div>}
        </div>

        {needsPerson && (
          <div className="field-group">
            <label htmlFor="person" className="mono">{cat === 'lending' ? 'Who did you lend to?' : 'Who did you borrow from?'}</label>
            <input id="person" autoComplete="off" autoCapitalize="words" enterKeyHint="done" value={person} onChange={(e) => setPerson(e.target.value)} onKeyDown={onEnter} placeholder="Their name" />
            {people.length > 0 && <div className="chips">{people.map((p) => <button key={p} onClick={() => setPerson(p)}>{p}</button>)}</div>}
          </div>
        )}

        <div className="field-group">
          <span className="mono">Date</span>
          <div className="segment">
            <button className={dateMode === 'today' ? 'on' : ''} onClick={() => setDate(today())}>Today</button>
            <button className={dateMode === 'yesterday' ? 'on' : ''} onClick={() => setDate(yesterday())}>Yesterday</button>
            <input type="date" aria-label="Pick a date" max={today()} className={dateMode === 'pick' ? 'on' : ''} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        <button className={`submit-button ${type}`} onClick={submit}>{type === 'credit' ? <ArrowUpRight size={19} /> : <ArrowDownRight size={19} />} Record {type === 'credit' ? 'money in' : 'spend'}</button>

        {recent.length > 0 && (
          <div className="recent">
            <span className="mono">LAST ENTRIES</span>
            {recent.map((t) => (
              <div key={t.id} className="recent-row"><span>{t.note}</span><b className={t.type}>{t.type === 'credit' ? '+' : '−'}{money(t.amount)}</b></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
