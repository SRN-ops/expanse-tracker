import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Edit3, Search, Trash2 } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { allCategories, categoryMeta, dateLabel, isIncome, isSpend, money, monthKey, monthLabel, sortRecent, spendCategories, sumBy } from '@/lib/finance';
import type { Category, Transaction } from '@/types/finance';

export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="section-heading"><p className="mono">{eyebrow}</p><h2>{title}</h2></div>;
}

/* ---------- Categories ---------- */
export function CategoryGrid({ transactions, onOpen }: { transactions: Transaction[]; onOpen: (c: Category) => void }) {
  const spend = sumBy(transactions, isSpend);
  return (
    <div className="category-grid">
      {allCategories.map((category) => {
        const meta = categoryMeta[category];
        const entries = transactions.filter((t) => t.category === category);
        const isCircle = category === 'lending' || category === 'borrowing';
        const total = isCircle
          ? transactions.filter((t) => t.category === category && t.status === 'pending').reduce((s, t) => s + t.amount, 0)
          : transactions.filter((t) => t.category === category && t.type === 'debit').reduce((s, t) => s + t.amount, 0);
        const pct = !isCircle && spend ? Math.round((total / spend) * 100) : 0;
        return (
          <motion.button className="category-card" key={category} style={{ ['--card-color' as string]: meta.color, ['--card-soft' as string]: meta.soft }} onClick={() => onOpen(category)} whileTap={{ scale: 0.97 }}>
            <div className="category-top"><span className="category-icon">{meta.icon}</span><span className="mono">{meta.short}</span></div>
            <strong>{money(total)}</strong>
            <div className="category-meta mono"><span>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span><span>{isCircle ? 'PENDING' : `${pct}%`}</span></div>
            <div className="category-line"><i style={{ width: `${isCircle ? 0 : Math.max(pct, total ? 4 : 0)}%` }} /></div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ---------- Lena / Dena ---------- */
type Group = { person: string; total: number; items: Transaction[] };

function groupPending(transactions: Transaction[], category: Category): Group[] {
  const map = new Map<string, Group>();
  for (const t of sortRecent(transactions)) {
    if (t.category !== category || t.status !== 'pending' || !t.person) continue;
    const key = t.person.trim().toLowerCase();
    const group = map.get(key) ?? { person: t.person, total: 0, items: [] };
    group.total += t.amount;
    group.items.push(t);
    map.set(key, group);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function Circles({ transactions, onSettle }: { transactions: Transaction[]; onSettle: (id: string) => void }) {
  const owed = groupPending(transactions, 'lending');
  const owe = groupPending(transactions, 'borrowing');
  const sum = (g: Group[]) => g.reduce((s, x) => s + x.total, 0);

  const column = (title: string, sub: string, groups: Group[], kind: 'lending' | 'borrowing') => (
    <div className="circle-column">
      <div className="circle-head"><span className={`circle-mark ${kind}`}>{kind === 'lending' ? '↗' : '↘'}</span><div><small className="mono">{sub}</small><h3>{title}</h3></div></div>
      {groups.map((g) => (
        <div className="person-card" key={g.person}>
          <div className="person-top"><span className={`avatar ${kind}`}>{g.person.slice(0, 1)}</span><strong>{g.person}</strong><b>{money(g.total)}</b></div>
          {g.items.map((item) => (
            <div className="person-entry" key={item.id}>
              <span>{item.note}<small className="mono">{dateLabel(item.date)}</small></span>
              <span className="person-amount">{money(item.amount)}</span>
              <button onClick={() => onSettle(item.id)}><Check size={14} /> Settled</button>
            </div>
          ))}
        </div>
      ))}
      {!groups.length && <div className="empty-small">Nothing pending. Peace.</div>}
    </div>
  );

  return (
    <>
      <div className="ledger-summary">
        <div className="summary-card owed"><small className="mono">YOU ARE OWED</small><strong>{money(sum(owed))}</strong><p className="mono">Money on its way back to you.</p></div>
        <div className="summary-card owe"><small className="mono">YOU OWE</small><strong>{money(sum(owe))}</strong><p className="mono">Close the loop, keep the peace.</p></div>
      </div>
      <div className="circle-grid">
        {column('To receive', 'LENA', owed, 'lending')}
        {column('To give', 'DENA', owe, 'borrowing')}
      </div>
    </>
  );
}

/* ---------- Analytics ---------- */
type TipProps = { active?: boolean; payload?: Array<{ value?: number | string; name?: string | number }> };
function ChartTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tip">{payload.map((item) => <div key={String(item.name)}><span>{item.name}</span><b>{money(Number(item.value ?? 0))}</b></div>)}</div>;
}

export function Analytics({ transactions }: { transactions: Transaction[] }) {
  const spend = sumBy(transactions, isSpend);
  const pie = spendCategories
    .map((c) => ({ name: categoryMeta[c].label, value: sumBy(transactions, (t) => t.category === c && isSpend(t)), color: categoryMeta[c].color }))
    .filter((x) => x.value > 0);

  const bars = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const items = transactions.filter((t) => monthKey(t.date) === key);
      return { month: monthLabel(key), Income: sumBy(items, isIncome), Spent: sumBy(items, isSpend) };
    });
  }, [transactions]);
  const hasBars = bars.some((b) => b.Income || b.Spent);

  return (
    <div className="analytics-grid">
      <div className="chart-card">
        <div className="chart-title"><span className="mono">WHERE IT WENT</span><b>{money(spend)}</b></div>
        {pie.length ? (
          <>
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={72} outerRadius={104} paddingAngle={3} stroke="none">
                    {pie.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center"><small className="mono">TOTAL SPENT</small><strong>{money(spend)}</strong></div>
            </div>
            <div className="legend mono">{pie.map((p) => <span key={p.name}><i style={{ background: p.color }} />{p.name} {Math.round((p.value / spend) * 100)}%</span>)}</div>
          </>
        ) : <div className="empty-small">Record a few expenses and your spending mix appears here.</div>}
      </div>

      <div className="chart-card">
        <div className="chart-title"><span className="mono">LAST 6 MONTHS</span><b className="key"><i className="dot income" /> Income <i className="dot spent" /> Spent</b></div>
        {hasBars ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bars} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#0B0B0B', fontSize: 11 }} />
              <YAxis hide />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(0,0,0,.05)' }} />
              <Bar dataKey="Income" fill="#12a889" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spent" fill="#E8103A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="empty-small">Income and spending by month will show up as you add entries.</div>}
      </div>
    </div>
  );
}

/* ---------- History ---------- */
export function History({ transactions, onEdit, onDelete }: { transactions: Transaction[]; onEdit: (t: Transaction) => void; onDelete: (t: Transaction) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const q = query.trim().toLowerCase();
  const shown = sortRecent(transactions).filter((t) => (filter === 'all' || t.type === filter) && `${t.note} ${t.person ?? ''} ${t.category ? categoryMeta[t.category].label : 'income'}`.toLowerCase().includes(q));

  return (
    <div className="history">
      <div className="history-tools">
        <label className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes, people, categories" aria-label="Search entries" /></label>
        <div className="filter-buttons" role="group" aria-label="Filter">
          {(['all', 'credit', 'debit'] as const).map((f) => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'credit' ? 'In' : 'Out'}</button>)}
        </div>
      </div>
      <div className="history-list">
        {shown.map((t) => {
          const color = t.category ? categoryMeta[t.category].color : '#12a889';
          return (
            <div className="history-row" key={t.id} style={{ ['--row-color' as string]: color }}>
              <div className="history-icon">{t.category ? categoryMeta[t.category].icon : '₹'}</div>
              <div className="history-main">
                <strong>{t.note}</strong>
                <span className="mono">{dateLabel(t.date)} · {t.person ? `${t.person} · ` : ''}{t.category ? categoryMeta[t.category].label : 'Income'}{t.status === 'settled' ? ' · Settled' : ''}</span>
              </div>
              <b className={`history-amount ${t.type}`}>{t.type === 'credit' ? '+' : '−'}{money(t.amount)}</b>
              <div className="row-actions">
                <button aria-label="Edit entry" onClick={() => onEdit(t)}><Edit3 size={16} /></button>
                <button aria-label="Delete entry" onClick={() => onDelete(t)}><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
        {!shown.length && <div className="empty-small">{transactions.length ? 'No entries match that search.' : 'No entries yet. Add your first one above.'}</div>}
      </div>
    </div>
  );
}
