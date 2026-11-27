
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';

const ToastContext = createContext(null);

const toastStyles = {
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    border: 'border-emerald-400/20',
    title: 'Success'
  },
  error: {
    icon: XCircle,
    color: 'text-rose-400',
    border: 'border-rose-400/20',
    title: 'Something went wrong'
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    border: 'border-amber-400/20',
    title: 'Warning'
  },
  info: {
    icon: Info,
    color: 'text-[#22D3EE]',
    border: 'border-[#22D3EE]/20',
    title: 'Information'
  }
};

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timers.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    setToasts(current => current.filter(item => item.id !== id));
  }, []);

  const toast = useCallback((message, type = 'success', duration = 3500) => {
    const id = `${Date.now()}-${Math.random()}`;

    setToasts(current => [
      ...current,
      {
        id,
        message,
        type: toastStyles[type] ? type : 'info'
      }
    ]);

    const timer = setTimeout(() => {
      removeToast(id);
    }, duration);

    timers.current.set(id, timer);

    return id;
  }, [removeToast]);

  useEffect(() => {
    return () => {
      timers.current.forEach(timer => clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed right-4 top-4 z-[200] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
      >
        {toasts.map(item => {
          const style = toastStyles[item.type];
          const Icon = style.icon;

          return (
            <div
              key={item.id}
              role="status"
              className={`flex items-center gap-3 rounded-2xl border ${style.border} bg-[#111B2B] p-4 shadow-2xl shadow-black/40`}
              style={{
                animation: 'toast-enter .25s ease-out both'
              }}
            >
              <Icon size={21} className={`shrink-0 ${style.color}`} />

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${style.color}`}>
                  {style.title}
                </p>
                <p className="mt-0.5 break-words text-sm text-slate-300">
                  {item.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(item.id)}
                aria-label="Dismiss notification"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toast-enter {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
