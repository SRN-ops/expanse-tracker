import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Download, Plus, Trash2, Upload, X, Check, Pencil } from 'lucide-react';
import { categoryMeta, dateLabel, money, parseAmount } from '@/lib/finance';
import type { Category, Profile, Transaction } from '@/types/finance';

function useEscape(onClose: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [active]);
}

function Modal({ onClose, children, label, className = '' }: { onClose: () => void; children: ReactNode; label: string; className?: string }) {
  useEscape(onClose);
  return (
    <motion.div className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={label} initial={{ y: 24 }} animate={{ y: 0 }} exit={{ y: 24 }} onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Drawer({ category, transactions, onClose }: { category: Category; transactions: Transaction[]; onClose: () => void }) {
  useEscape(onClose);
  const meta = categoryMeta[category];
  const items = transactions.filter((item) => item.category === category);
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside className="drawer" role="dialog" aria-modal="true" aria-label={meta.label} style={{ ['--drawer-color' as string]: meta.color }} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30 }} onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <span className="drawer-icon">{meta.icon}</span>
        <small className="mono">{meta.short} / CATEGORY</small>
        <h2>{meta.label}</h2>
        <p className="mono">{items.length} {items.length === 1 ? 'entry' : 'entries'}</p>
        <div className="drawer-list">
          {items.map((item) => (
            <div className="drawer-entry" key={item.id}>
              <span>{dateLabel(item.date)}</span>
              <strong>{item.person ? `${item.person} · ` : ''}{item.note}</strong>
              <b>{item.type === 'credit' ? '+' : '−'}{money(item.amount)}</b>
            </div>
          ))}
          {!items.length && <div className="empty-small">Nothing here yet.</div>}
        </div>
      </motion.aside>
    </motion.div>
  );
}

export function EditModal({ item, onClose, onSave }: { item: Transaction; onClose: () => void; onSave: (updates: Partial<Transaction>) => void }) {
  const [note, setNote] = useState(item.note);
  const [amount, setAmount] = useState(String(item.amount));
  const [date, setDate] = useState(item.date);
  const [person, setPerson] = useState(item.person ?? '');
  const [error, setError] = useState('');
  const locked = !!item.linkedTo;
  const save = () => {
    const value = parseAmount(amount);
    if (Number.isNaN(value) || value <= 0) return setError('Amount must be greater than zero.');
    if (!note.trim()) return setError('Add a short note.');
    onSave({ amount: locked ? item.amount : value, note: note.trim(), date, ...(item.person ? { person: person.trim() || item.person } : {}) });
  };
  return (
    <Modal onClose={onClose} label="Edit entry" className="paper-modal">
      <small className="mono">EDIT ENTRY</small>
      <h3>Fix the record.</h3>
      <label>Amount<input value={amount} disabled={locked} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} /></label>
      {locked && <p className="hint">Amount is locked because this entry is part of a settled lend or borrow.</p>}
      <label>Note<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
      {item.person !== undefined && <label>Person<input value={person} onChange={(e) => setPerson(e.target.value)} /></label>}
      <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="submit-button credit" onClick={save}><Check size={18} /> Save changes</button>
    </Modal>
  );
}

export function ConfirmModal({ title, body, confirmLabel, onClose, onConfirm }: { title: string; body?: string; confirmLabel: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal onClose={onClose} label={title} className="confirm-modal">
      <span className="modal-om">ॐ</span>
      <h3>{title}</h3>
      <p className="hint">{body ?? 'This cannot be undone.'}</p>
      <div className="modal-actions">
        <button className="ghost-button" onClick={onClose}>Keep it</button>
        <button className="danger-button" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

type SheetProps = {
  profiles: Profile[];
  activeId: string;
  onClose: () => void;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (profile: Profile) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
};

export function ProfileSheet({ profiles, activeId, onClose, onSwitch, onAdd, onRename, onDelete, onExport, onImport, onClear }: SheetProps) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <Modal onClose={onClose} label="Profiles" className="sheet">
      <small className="mono">PROFILES ON THIS DEVICE</small>
      <h3>Who is tracking?</h3>
      <div className="profile-list">
        {profiles.map((profile) => (
          <div key={profile.id} className={`profile-row ${profile.id === activeId ? 'active' : ''}`}>
            <button className="profile-pick" onClick={() => { onSwitch(profile.id); onClose(); }}>
              <span className="avatar">{profile.name.slice(0, 1)}</span>
              {renaming === profile.id ? null : <span className="profile-name"><strong>{profile.name}</strong><small>{profile.transactions.length} entries{profile.id === activeId ? ' · Active' : ''}</small></span>}
            </button>
            {renaming === profile.id ? (
              <form className="rename-form" onSubmit={(e) => { e.preventDefault(); onRename(profile.id, draft); setRenaming(null); }}>
                <input autoFocus value={draft} maxLength={24} onChange={(e) => setDraft(e.target.value)} aria-label="New name" />
                <button type="submit" aria-label="Save name"><Check size={16} /></button>
              </form>
            ) : (
              <div className="profile-actions">
                <button aria-label={`Rename ${profile.name}`} onClick={() => { setRenaming(profile.id); setDraft(profile.name); }}><Pencil size={16} /></button>
                <button aria-label={`Delete ${profile.name}`} onClick={() => onDelete(profile)}><Trash2 size={16} /></button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="sticker-button yellow-button full" onClick={onAdd}><Plus size={18} /> Add a profile</button>
      <div className="sheet-tools">
        <button onClick={onExport}><Download size={16} /> Export backup</button>
        <button onClick={() => fileRef.current?.click()}><Upload size={16} /> Import backup</button>
        <button onClick={onClear}><Trash2 size={16} /> Clear this ledger</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) onImport(file); e.target.value = ''; }} />
      </div>
      <p className="hint">Data is saved in this browser on this phone only. Export a backup now and then, especially before clearing browser data.</p>
    </Modal>
  );
}
