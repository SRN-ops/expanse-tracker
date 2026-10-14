import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { parseAmount } from '@/lib/finance';

type Props = {
  firstTime: boolean;
  onDone: (name: string, amount: number) => void;
  onCancel?: () => void;
};

export function Onboarding({ firstTime, onDone, onCancel }: Props) {
  const [step, setStep] = useState<'name' | 'amount'>('name');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const next = () => {
    if (!name.trim()) return setError('Enter a name so we know whose ledger this is.');
    setError('');
    setStep('amount');
  };

  const finish = () => {
    const value = parseAmount(amount);
    if (Number.isNaN(value) || value < 0) return setError('Enter the amount you have right now. Zero is fine.');
    onDone(name.trim(), value);
  };

  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-label="Set up your profile">
      {onCancel && (
        <button className="onboard-close" onClick={onCancel} aria-label="Cancel"><X size={22} /></button>
      )}
      <div className="onboard-inner">
        <p className="eyebrow yellow">ॐ / EXPENSE TRACKER / ॐ</p>
        {step === 'name' ? (
          <>
            <h1 className="onboard-title">{firstTime ? 'NAMASTE.' : 'NEW PROFILE.'}<br /><span>WHO IS THIS?</span></h1>
            <p className="onboard-sub">Every profile keeps its own ledger on this phone. Nothing leaves your device.</p>
            <label className="onboard-field">
              <span>Your name</span>
              <input autoFocus autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" value={name} maxLength={24} placeholder="e.g. Sarthak" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="sticker-button yellow-button" onClick={next}>Continue <ArrowRight size={20} /></button>
          </>
        ) : (
          <>
            <h1 className="onboard-title">HOW MUCH<br /><span>DO YOU HAVE NOW?</span></h1>
            <p className="onboard-sub">Add up your cash, bank and wallets. This is your starting balance, and every entry after this moves it.</p>
            <label className="onboard-field big">
              <span>Current amount</span>
              <div className="amount-wrap"><b>₹</b><input autoFocus inputMode="decimal" enterKeyHint="done" autoComplete="off" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && finish()} /></div>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="onboard-actions">
              <button className="ghost-light" onClick={() => { setStep('name'); setError(''); }}>Back</button>
              <button className="sticker-button yellow-button" onClick={finish}>Start tracking <ArrowRight size={20} /></button>
            </div>
            <p className="onboard-note">You can correct this any time from the balance card.</p>
          </>
        )}
      </div>
    </div>
  );
}
