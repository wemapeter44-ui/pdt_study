import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider');
  return context;
}

export default function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const close = useCallback((result) => {
    if (resolver.current) { resolver.current(result); resolver.current = null; }
    setDialog(null);
  }, []);

  const confirm = useCallback((options = {}) => {
    if (resolver.current) { resolver.current(false); resolver.current = null; }
    return new Promise((resolve) => {
      resolver.current = resolve;
      setDialog({
        title: options.title || 'Are you sure?',
        message: options.message || 'Please confirm that you want to continue.',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        danger: options.danger ?? false,
      });
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const handleKeyDown = (event) => { if (event.key === 'Escape') close(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, close]);

  useEffect(() => {
    return () => { if (resolver.current) resolver.current(false); };
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) close(false); }} role="presentation">
          <section role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111B2B] p-5 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${dialog.danger ? 'bg-rose-500/10 text-rose-400' : 'bg-[#22D3EE]/10 text-[#22D3EE]'}`}><AlertTriangle size={22} /></div>
              <button type="button" onClick={() => close(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </div>
            <h2 className="text-lg font-semibold text-white">{dialog.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{dialog.message}</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => close(false)} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">{dialog.cancelText}</button>
              <button type="button" onClick={() => close(true)} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${dialog.danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-[#0891B2] hover:bg-[#0E7490]'}`}>{dialog.confirmText}</button>
            </div>
          </section>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
