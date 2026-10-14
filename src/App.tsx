import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowDownRight, ArrowUpRight, LayoutGrid, List, PieChart, Plus, Sparkles, Users } from 'lucide-react';
import { useActiveProfile, useFinanceStore } from '@/store/useFinanceStore';
import { isSpend, money, netFlow, sumBy } from '@/lib/finance';
import type { Category, Profile, Transaction } from '@/types/finance';
import { Onboarding } from '@/components/Onboarding';
import { BalanceCard, QuickAdd } from '@/components/Ritual';
import { Analytics, CategoryGrid, Circles, History, SectionHeading } from '@/components/Sections';
import { ConfirmModal, Drawer, EditModal, ProfileSheet, useScrollLock } from '@/components/Overlays';

type Toast = { message: string; undo?: () => void };
type Confirm = { title: string; body?: string; label: string; action: () => void };

const links = [
  { href: '#quick-add', label: 'Add', icon: Plus },
  { href: '#categories', label: 'Types', icon: LayoutGrid },
  { href: '#circles', label: 'Lena Dena', icon: Users },
  { href: '#analytics', label: 'Stats', icon: PieChart },
  { href: '#history', label: 'History', icon: List },
];

function App() {
  const store = useFinanceStore();
  const profile = useActiveProfile();
  const [preloading, setPreloading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState<'credit' | 'debit'>('debit');
  const [drawer, setDrawer] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => { const t = window.setTimeout(() => setPreloading(false), 1350); return () => window.clearTimeout(t); }, []);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), toast.undo ? 5000 : 2800); return () => window.clearTimeout(t); }, [toast]);
  useScrollLock(!!(drawer || editing || confirm || sheet || adding));

  const transactions = useMemo(() => profile?.transactions ?? [], [profile]);
  const balance = profile ? profile.openingBalance + netFlow(transactions) : 0;
  const spent = useMemo(() => sumBy(transactions, isSpend), [transactions]);

  const notify = (message: string, undo?: () => void) => setToast({ message, undo });
  const goTo = (id: string, type?: 'credit' | 'debit') => {
    if (type) setForm(type);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const exportData = (p: Profile) => {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-tracker-${p.name.toLowerCase().replace(/\W+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Backup downloaded.');
  };

  const importData = async (file: File) => {
    try {
      const ok = store.importProfile(JSON.parse(await file.text()));
      notify(ok ? 'Backup imported as a new profile.' : 'That file is not a valid backup.');
      if (ok) setSheet(false);
    } catch {
      notify('That file is not a valid backup.');
    }
  };

  const finishOnboarding = (name: string, amount: number) => {
    store.createProfile(name, amount);
    setAdding(false);
    navigator.storage?.persist?.().catch(() => undefined);
    notify(`Welcome, ${name}. Your ledger is ready.`);
  };

  if (preloading) return <Preloader />;
  if (!profile) return <Onboarding firstTime onDone={finishOnboarding} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">ॐ</span><span>EXPENSE<br /><b>TRACKER</b></span></a>
        <nav aria-label="Sections">{links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}</nav>
        <div className="top-actions">
          <button className="profile-chip" onClick={() => setSheet(true)} aria-label="Open profiles"><span className="avatar sm">{profile.name.slice(0, 1)}</span><span className="chip-name">{profile.name}</span></button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="om-rail left" aria-hidden="true">ॐ<br />ॐ<br />ॐ<br />ॐ</div>
          <div className="om-rail right" aria-hidden="true">ॐ<br />ॐ<br />ॐ<br />ॐ</div>
          <div className="hero-copy">
            <p className="eyebrow yellow mono">ॐ / MONEY IS ENERGY / ॐ</p>
            <h1>HAR HAR<br /><span>MAHADEV.</span></h1>
            <p className="hero-sub">Your expense tracker.<br /><i>Track every rupee. Move with intention.</i></p>
            <div className="hero-balance">
              <small className="mono">NAMASTE, {profile.name.toUpperCase()}. YOU HAVE</small>
              <strong>{money(balance)}</strong>
              <span className="mono">{money(spent)} spent so far</span>
            </div>
            <div className="hero-actions">
              <button className="sticker-button yellow-button" onClick={() => goTo('quick-add', 'credit')}><ArrowUpRight size={20} /> Credit</button>
              <button className="sticker-button ink-button" onClick={() => goTo('quick-add', 'debit')}><ArrowDownRight size={20} /> Debit</button>
            </div>
          </div>
        </section>

        <div className="marquee-wrap" aria-hidden="true">
          <div className="marquee yellow-marquee">ॐ NAMAH SHIVAYA <b>•</b> FOOD <b>•</b> TRAVEL <b>•</b> SHOPPING <b>•</b> LENDING <b>•</b> BORROWING <b>•</b> ॐ NAMAH SHIVAYA <b>•</b> FOOD <b>•</b> TRAVEL <b>•</b> SHOPPING <b>•</b></div>
          <div className="marquee blue-marquee">MONEY COMES <b>•</b> MONEY GOES <b>•</b> MAHADEV STAYS <b>•</b> TRACK IT ALL <b>•</b> MONEY COMES <b>•</b> MONEY GOES <b>•</b> MAHADEV STAYS <b>•</b></div>
        </div>

        <section className="section s-cream" id="quick-add">
          <div className="container">
            <SectionHeading eyebrow="01 / DAILY RITUAL" title="Log it in seconds." />
            <div className="quick-layout">
              <BalanceCard profile={profile} balance={balance} onSave={(amount) => { store.setCurrentBalance(amount); notify('Balance corrected.'); }} />
              <QuickAdd
                profile={profile}
                balance={balance}
                active={form}
                setActive={setForm}
                onAdd={(entry) => {
                  const id = store.addTransaction(entry);
                  confetti({ particleCount: 45, spread: 60, origin: { y: 0.8 }, colors: ['#FFF01F', '#FF9F1C', '#E8103A'] });
                  notify(entry.type === 'credit' ? `${money(entry.amount)} added.` : `${money(entry.amount)} logged.`, () => { store.removeTransaction(id); setToast(null); });
                }}
              />
            </div>
          </div>
        </section>

        <section className="section s-blue" id="categories">
          <div className="container">
            <SectionHeading eyebrow="02 / THE SIX FORCES" title="Every rupee has a direction." />
            <CategoryGrid transactions={transactions} onOpen={setDrawer} />
          </div>
        </section>

        <section className="section s-orange" id="circles">
          <div className="container">
            <SectionHeading eyebrow="03 / LENA DENA" title="Keep the circle clean." />
            <Circles transactions={transactions} onSettle={(id) => { store.settle(id); confetti({ particleCount: 80, spread: 75, origin: { y: 0.7 }, colors: ['#FFF01F', '#12a889', '#E8103A'] }); notify('Marked as settled.'); }} />
          </div>
        </section>

        <section className="section s-cream" id="analytics">
          <div className="container">
            <SectionHeading eyebrow="04 / THIRD EYE VIEW" title="See where the energy goes." />
            <Analytics transactions={transactions} />
          </div>
        </section>

        <section className="section s-pink" id="history">
          <div className="container">
            <SectionHeading eyebrow="05 / THE LEDGER" title="Nothing escapes the record." />
            <History
              transactions={transactions}
              onEdit={setEditing}
              onDelete={(t) => setConfirm({ title: 'Delete this entry?', body: t.status === 'settled' || t.linkedTo ? 'This lend or borrow is linked to a settlement. Deleting one side adjusts the other.' : undefined, label: 'Delete', action: () => { store.removeTransaction(t.id); setConfirm(null); notify('Entry deleted.'); } })}
            />
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-om" aria-hidden="true">ॐ</div>
        <div className="container footer-copy">
          <p className="eyebrow yellow mono">ॐ / THE PRACTICE CONTINUES / ॐ</p>
          <h2>Money comes.<br />Money goes.<br /><span>Mahadev stays.</span></h2>
          <button className="footer-button mono" onClick={() => exportData(profile)}>Download backup</button>
          <p className="footer-end mono">EXPENSE TRACKER · SAVED ON THIS DEVICE ONLY</p>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Sections">
        {links.map((l) => <a key={l.href} href={l.href}><l.icon size={20} /><span>{l.label}</span></a>)}
      </nav>

      <AnimatePresence>{drawer && <Drawer category={drawer} transactions={transactions} onClose={() => setDrawer(null)} />}</AnimatePresence>
      <AnimatePresence>{editing && <EditModal item={editing} onClose={() => setEditing(null)} onSave={(u) => { store.updateTransaction(editing.id, u); setEditing(null); notify('Entry updated.'); }} />}</AnimatePresence>
      <AnimatePresence>{confirm && <ConfirmModal title={confirm.title} body={confirm.body} confirmLabel={confirm.label} onClose={() => setConfirm(null)} onConfirm={confirm.action} />}</AnimatePresence>
      <AnimatePresence>
        {sheet && (
          <ProfileSheet
            profiles={store.profiles}
            activeId={profile.id}
            onClose={() => setSheet(false)}
            onSwitch={(id) => { store.switchProfile(id); notify('Profile switched.'); }}
            onAdd={() => { setSheet(false); setAdding(true); }}
            onRename={(id, name) => { store.renameProfile(id, name); notify('Name updated.'); }}
            onDelete={(p) => setConfirm({ title: `Delete ${p.name}'s profile?`, body: 'All entries in this profile will be removed from this device.', label: 'Delete profile', action: () => { store.deleteProfile(p.id); setConfirm(null); notify('Profile deleted.'); } })}
            onExport={() => exportData(profile)}
            onImport={importData}
            onClear={() => setConfirm({ title: 'Clear this ledger?', body: 'Every entry will be removed. Your starting balance stays.', label: 'Clear entries', action: () => { store.clearActiveData(); setConfirm(null); setSheet(false); notify('Ledger cleared.'); } })}
          />
        )}
      </AnimatePresence>
      {adding && <Onboarding firstTime={false} onDone={finishOnboarding} onCancel={() => setAdding(false)} />}
      <AnimatePresence>
        {toast && (
          <motion.div className="toast" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} role="status">
            <Sparkles size={16} /><span>{toast.message}</span>
            {toast.undo && <button onClick={toast.undo}>Undo</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Preloader() {
  return (
    <div className="preloader" role="status" aria-label="Loading">
      <div className="preloader-om">ॐ</div>
      <div className="preloader-word mono">EXPENSE TRACKER <span>∞</span></div>
      <div className="preloader-line"><span /></div>
      <small className="mono">OPENING THE LEDGER</small>
    </div>
  );
}

export default App;
