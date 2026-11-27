
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used inside ConfirmProvider');
  }

  return context;
}

export default function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const closeDialog = useCallback((result) => {
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }

    setDialog(null);
  }, []);

  const confirm = useCallback((options = {}) => {
    if (resolver.current) {
      resolver.current(false);
    }

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

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeDialog(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, closeDialog]);

  useEffect(() => {
    return () => {
      if (resolver.current) {
        resolver.current(false);
        resolver.current = null;
      }
    };
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {dialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog(false);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            className="w-full max-w-md animate-[confirmIn_.2s_ease-out] rounded-2xl border border-white/10 bg-[#111B2B] p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                dialog.danger
                  ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-[#22D3EE]/10 text-[#22D3EE]'
              }`}>
                <AlertTriangle size={21} />
              </div>

              <button
                type="button"
                onClick={() => closeDialog(false)}
                aria-label="Close confirmation"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <h2
              id="confirm-title"
              className="text-lg font-semibold text-white"
            >
              {dialog.title}
            </h2>

            <p
              id="confirm-message"
              className="mt-2 text-sm leading-6 text-slate-400"
            >
              {dialog.message}
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeDialog(false)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                {dialog.cancelText}
              </button>

              <button
                type="button"
                onClick={() => closeDialog(true)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                  dialog.danger
                    ? 'bg-rose-500 hover:bg-rose-400'
                    : 'bg-[#0891B2] hover:bg-[#0E7490]'
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </section>

          <style>{`
            @keyframes confirmIn {
              from { opacity: 0; transform: translateY(8px) scale(.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
