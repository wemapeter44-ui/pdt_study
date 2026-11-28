import {
  useState, useRef, useEffect, useCallback, memo
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { generateChatResponse } from '../lib/ai-router';
import ChatHistory from '../components/ChatHistory';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

import {
  ArrowLeft, BookOpen, Menu, Plus, AlertCircle, X,
  Calculator, FlaskConical, Landmark, ListChecks, ArrowUp, ArrowDown,
  Check, Copy, NotebookPen, RotateCcw, Square, Sparkles,
  CheckCircle2, Info
} from 'lucide-react';

/* ---------- chat interface (built into this file) ---------- */

const glass =
  'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.ck-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
.ck-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
}
@keyframes ck-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-24px,0) scale(1.08); } }
@keyframes ck-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes ck-pop { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes ck-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ck-dot { 0%,80%,100% { transform: translateY(0); opacity: .35; } 40% { transform: translateY(-5px); opacity: 1; } }
@keyframes ck-blink { to { visibility: hidden; } }
@keyframes ck-skel { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.ck-orb { animation: ck-float 14s ease-in-out infinite; }
.ck-rise { animation: ck-rise .45s cubic-bezier(.2,.7,.2,1) both; }
.ck-pop { animation: ck-pop .25s cubic-bezier(.2,.7,.2,1) both; }
.ck-fade { animation: ck-fade .25s ease both; }
.ck-dot { animation: ck-dot 1.2s ease-in-out infinite; }
.ck-caret {
  display: inline-block; width: 8px; height: 1.1em; margin-left: 3px; vertical-align: -0.2em;
  background: #22D3EE; border-radius: 2px; animation: ck-blink 1s steps(2, start) infinite;
}
.ck-skel {
  background: linear-gradient(90deg, rgba(255,255,255,.05) 25%, rgba(255,255,255,.14) 50%, rgba(255,255,255,.05) 75%);
  background-size: 200% 100%; animation: ck-skel 1.6s ease-in-out infinite;
}
.ck-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.3), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.ck-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
.ck-scroll::-webkit-scrollbar { width: 8px; }
.ck-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 8px; }

/* Markdown (no typography plugin needed) */
.ck-md { font-size: 15px; line-height: 1.75; color: #CBD5E1; overflow-wrap: anywhere; }
.ck-md > :first-child { margin-top: 0; }
.ck-md > :last-child { margin-bottom: 0; }
.ck-md p { margin: .75em 0; }
.ck-md h1, .ck-md h2, .ck-md h3, .ck-md h4 { color: #fff; font-weight: 600; line-height: 1.3; margin: 1.2em 0 .5em; }
.ck-md h1 { font-size: 1.25em; } .ck-md h2 { font-size: 1.15em; } .ck-md h3, .ck-md h4 { font-size: 1.02em; }
.ck-md strong { color: #fff; font-weight: 600; }
.ck-md a { color: #67E8F9; text-decoration: underline; text-underline-offset: 3px; }
.ck-md ul, .ck-md ol { margin: .75em 0; padding-left: 1.4em; }
.ck-md ul { list-style: disc; } .ck-md ol { list-style: decimal; }
.ck-md li { margin: .3em 0; } .ck-md li::marker { color: rgba(103,232,249,.7); }
.ck-md blockquote { margin: .9em 0; padding: .1em 0 .1em 1em; border-left: 3px solid #22D3EE; color: #94A3B8; }
.ck-md code { background: rgba(255,255,255,.1); color: #A5F3FC; padding: .15em .4em; border-radius: 6px; font-size: .88em; }
.ck-md pre { margin: .9em 0; padding: 14px 16px; background: rgba(2,5,11,.7); border: 1px solid rgba(255,255,255,.1); border-radius: 14px; overflow-x: auto; }
.ck-md pre code { background: none; padding: 0; color: #E2E8F0; }
.ck-md table { display: block; overflow-x: auto; border-collapse: collapse; margin: .9em 0; font-size: .93em; }
.ck-md th, .ck-md td { border: 1px solid rgba(255,255,255,.12); padding: 8px 12px; text-align: left; }
.ck-md th { background: rgba(255,255,255,.06); color: #fff; font-weight: 600; }
.ck-md hr { border: 0; border-top: 1px solid rgba(255,255,255,.12); margin: 1.2em 0; }

@media (max-width: 767px) { .ck-orb { animation: none; } }
@media (prefers-reduced-motion: reduce) {
  .ck-orb, .ck-rise, .ck-pop, .ck-fade, .ck-dot, .ck-caret, .ck-skel { animation: none !important; }
  .ck-shine::before { transition: none; }
}
`;

function ChatStyles() {
  return <style>{styles}</style>;
}

function ChatBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="ck-grid absolute inset-0" />
      <div className="ck-orb absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-[#22D3EE]/20 blur-[100px]" />
      <div className="ck-orb absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-[100px]" style={{ animationDelay: '-5s' }} />
      <div className="ck-orb absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-600/15 blur-[100px]" style={{ animationDelay: '-9s' }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

function Skeleton({ className = '' }) {
  return <span aria-hidden className={`ck-skel block rounded-lg ${className}`} />;
}

/* ------------------------------------------------------------------ */
/* Markdown                                                             */
/* ------------------------------------------------------------------ */

const Markdown = memo(function Markdown({ text }) {
  return (
    <div className="ck-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Messages                                                             */
/* ------------------------------------------------------------------ */

function TutorAvatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-white shadow-lg shadow-[#22D3EE]/20">
      <BookOpen size={17} />
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, disabled, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs transition hover:bg-white/10 hover:text-white disabled:opacity-40 ${
        active ? 'text-emerald-300' : 'text-slate-300'
      }`}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * onRedo     - regenerate (last answer) or retry (after an error)
 * onSaveNote - optional; shows "Save to notes"
 */
function Message({ msg, isLast, busy, streaming, onRedo, onSaveNote }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleCopy() {
    const ok = await copyText(msg.content);
    if (!ok) return;

    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  async function handleSave() {
    const ok = await onSaveNote?.(msg);
    if (ok) setSaved(true);
  }

  if (isUser) {
    return (
      <div className="ck-rise flex justify-end">
        <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-3xl rounded-tr-lg bg-gradient-to-br from-cyan-500/90 to-blue-600/90 px-4 py-3 text-left text-[15px] leading-7 text-white shadow-lg shadow-[#22D3EE]/15 sm:max-w-[80%]">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.isError) {
    return (
      <div className="ck-rise flex gap-3 sm:gap-4">
        <TutorAvatar />

        <div className="min-w-0 flex-1 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <div className="flex items-start gap-2">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
            <span>{msg.content}</span>
          </div>

          {isLast && onRedo && (
            <button
              type="button"
              onClick={onRedo}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              <RotateCcw size={13} />
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ck-rise group flex gap-3 sm:gap-4">
      <TutorAvatar />

      <div className="min-w-0 flex-1">
        <Markdown text={msg.content} />
        {streaming && <span className="ck-caret" aria-hidden />}

        {!streaming && (
          <div
            className={`mt-3 flex flex-wrap items-center gap-1.5 transition-opacity focus-within:opacity-100 ${
              isLast ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
            }`}
          >
            <ActionButton
              icon={copied ? Check : Copy}
              label={copied ? 'Copied' : 'Copy'}
              onClick={handleCopy}
              active={copied}
            />

            {onSaveNote && (
              <ActionButton
                icon={saved ? Check : NotebookPen}
                label={saved ? 'Saved' : 'Save to notes'}
                onClick={handleSave}
                disabled={saved}
                active={saved}
              />
            )}

            {isLast && onRedo && (
              <ActionButton icon={RotateCcw} label="Regenerate" onClick={onRedo} disabled={busy} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ label = 'Thinking...' }) {
  return (
    <div className="ck-fade flex items-center gap-3 sm:gap-4">
      <TutorAvatar />

      <div className={`${glass} flex items-center gap-3 rounded-2xl rounded-tl-lg px-4 py-3 text-sm text-slate-300`}>
        <span className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((n) => (
            <span
              key={n}
              className="ck-dot h-1.5 w-1.5 rounded-full bg-[#22D3EE]"
              style={{ animationDelay: `${n * 0.15}s` }}
            />
          ))}
        </span>
        {label}
      </div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading conversation">
      <div className="flex justify-end">
        <Skeleton className="h-12 w-2/3 max-w-sm !rounded-3xl" />
      </div>

      {[1, 2].map((n) => (
        <div key={n} className="flex gap-3 sm:gap-4">
          <Skeleton className="h-9 w-9 shrink-0 !rounded-xl" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll area that follows the answer, but never fights the reader     */
/* ------------------------------------------------------------------ */

/**
 * resetKey - change it (e.g. conversation id) to jump to the bottom
 * count    - number of messages (smooth scroll when it grows)
 * tick     - changes while the answer streams (keeps following if the reader is at the bottom)
 */
function ChatScroll({ children, resetKey, count, tick }) {
  const ref = useRef(null);
  const stick = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = distance < 120;
    setShowJump(distance > 320);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    stick.current = true;
    el.scrollTop = el.scrollHeight;
  }, [resetKey]);

  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [count]);

  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [tick]);

  return (
    <div className="relative min-h-0 flex-1">
      <section ref={ref} onScroll={onScroll} className="ck-scroll h-full overflow-y-auto">
        {children}
      </section>

      {showJump && (
        <button
          type="button"
          onClick={() => {
            stick.current = true;
            ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
          }}
          aria-label="Scroll to latest message"
          className="ck-pop absolute bottom-4 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0B1220] text-slate-200 shadow-xl shadow-black/50 transition hover:bg-[#13203A] hover:text-white"
        >
          <ArrowDown size={18} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                          */
/* ------------------------------------------------------------------ */

const TINTS = [
  { tile: 'border-[#22D3EE]/25 bg-[#22D3EE]/10 text-[#67E8F9]', edge: 'hover:from-[#22D3EE]/50' },
  { tile: 'border-violet-400/25 bg-violet-400/10 text-violet-300', edge: 'hover:from-violet-400/50' },
  { tile: 'border-amber-400/25 bg-amber-400/10 text-amber-300', edge: 'hover:from-amber-400/50' },
  { tile: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300', edge: 'hover:from-emerald-400/50' }
];

/** suggestions: [{ icon, title, text }]  onPick(text) */
function EmptyState({ heading, subtitle, suggestions = [], onPick, disabled }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full flex-col justify-center py-8">
      <div className="ck-rise mb-9">
        <div className="relative mb-6 h-16 w-16">
          <div className="absolute inset-0 rounded-2xl bg-[#22D3EE]/40 blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22D3EE] to-violet-500 shadow-lg shadow-[#22D3EE]/30">
            <BookOpen size={29} className="text-white" />
          </div>
        </div>

        <h2 className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
          {heading}
        </h2>

        {subtitle && <p className="mt-3 max-w-xl text-base leading-7 text-slate-300">{subtitle}</p>}
      </div>

      {suggestions.length > 0 && (
        <>
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
            <Sparkles size={15} className="text-[#67E8F9]" />
            Try one of these
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {suggestions.map(({ icon: Icon, title, text }, i) => {
              const tint = TINTS[i % TINTS.length];

              return (
                <button
                  key={title}
                  type="button"
                  onClick={() => onPick(text)}
                  disabled={disabled}
                  style={{ animationDelay: `${100 + i * 60}ms` }}
                  className={`ck-rise group rounded-2xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-px text-left transition-all duration-300 hover:-translate-y-1 disabled:opacity-40 disabled:hover:translate-y-0 ${tint.edge}`}
                >
                  <div className={`${glass} h-full rounded-2xl p-4 transition-colors group-hover:bg-white/[0.07]`}>
                    <div className="mb-2.5 flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${tint.tile}`}>
                        {Icon && <Icon size={17} />}
                      </span>
                      <span className="text-sm font-semibold text-white">{title}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{text}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composer                                                             */
/* ------------------------------------------------------------------ */

function Composer({ value, onChange, onSend, onStop, sending, disabled, placeholder, hint }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !sending && !disabled;

  function handleKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;

    // On phones Enter adds a new line; people tap the send button instead
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    if (touch) return;

    event.preventDefault();
    if (canSend) onSend();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
      className="mx-auto w-full max-w-3xl"
    >
      <div className="group relative">
        <div className="pointer-events-none absolute -inset-px rounded-[1.6rem] bg-gradient-to-r from-[#22D3EE]/0 via-violet-400/0 to-[#22D3EE]/0 opacity-0 blur-md transition-all duration-500 group-focus-within:from-[#22D3EE]/40 group-focus-within:via-violet-500/40 group-focus-within:to-[#22D3EE]/40 group-focus-within:opacity-100" />

        <div className="relative flex items-end gap-2 rounded-3xl border border-white/10 bg-[#0B1220]/95 p-2 shadow-2xl shadow-black/40 transition-colors group-focus-within:border-[#22D3EE]/50">
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            disabled={disabled}
            className="max-h-44 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent px-4 py-3 text-[15px] leading-6 text-white outline-none placeholder:text-slate-500 disabled:opacity-50"
          />

          {sending ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop generating"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
            >
              <Square size={15} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className="ck-shine relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-white shadow-lg shadow-[#22D3EE]/25 transition-all hover:scale-105 hover:shadow-[#22D3EE]/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100"
            >
              <ArrowUp size={20} />
            </button>
          )}
        </div>
      </div>

      {hint && <p className="mt-2.5 text-center text-xs text-slate-500">{hint}</p>}
    </form>
  );
}

/* ---------- confirm dialog (built into this file) ---------- */

const confirmStyles = `
@keyframes cd-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cd-pop { from { opacity: 0; transform: translateY(12px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes cd-sheet { from { transform: translateY(100%); } to { transform: none; } }
.cd-fade { animation: cd-fade .2s ease both; }
.cd-pop { animation: cd-pop .22s cubic-bezier(.2,.8,.2,1) both; }
@media (max-width: 639px) { .cd-pop { animation-name: cd-sheet; animation-duration: .3s; } }
@media (prefers-reduced-motion: reduce) { .cd-fade, .cd-pop { animation: none !important; } }
`;

// confirm({ title, message, confirmText, cancelText, tone: 'default' | 'danger' | 'success', hideCancel })
// resolves to true when the confirm button is pressed, false otherwise.
function ConfirmDialog({ dialog, onClose }) {
  const {
    title = 'Are you sure?',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    tone = 'default',
    hideCancel = false
  } = dialog;

  const danger = tone === 'danger';
  const success = tone === 'success';
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    // For destructive actions the safe button gets focus first
    (danger && !hideCancel ? cancelRef : confirmRef).current?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose(false);
        return;
      }

      if (event.key === 'Tab') {
        const order = [cancelRef.current, confirmRef.current].filter(Boolean);
        if (!order.length) return;

        event.preventDefault();

        const index = order.indexOf(document.activeElement);
        const next = event.shiftKey
          ? (index <= 0 ? order.length - 1 : index - 1)
          : (index === order.length - 1 ? 0 : index + 1);

        order[next].focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [danger, hideCancel, onClose]);

  const Icon = danger ? AlertCircle : success ? CheckCircle2 : Info;

  const iconStyle = danger
    ? 'border-rose-400/30 bg-rose-500/15 text-rose-300'
    : success
      ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
      : 'border-[#22D3EE]/30 bg-[#22D3EE]/15 text-[#67E8F9]';

  const glowStyle = danger ? 'bg-rose-500/40' : success ? 'bg-emerald-500/40' : 'bg-[#22D3EE]/40';

  const confirmStyle = danger
    ? 'bg-gradient-to-r from-rose-500 to-orange-500 shadow-rose-500/25 hover:shadow-rose-500/40'
    : success
      ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 shadow-emerald-500/25 hover:shadow-emerald-500/40'
      : 'bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 shadow-[#22D3EE]/25 hover:shadow-[#22D3EE]/40';

  return (
    <div
      className="cd-fade fixed inset-0 z-[100] flex items-end justify-center bg-[#02050B]/75 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose(false);
      }}
    >
      <style>{confirmStyles}</style>

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        aria-describedby={message ? 'cd-message' : undefined}
        className="cd-pop w-full max-w-md rounded-t-3xl bg-gradient-to-br from-white/20 via-white/5 to-white/0 p-px sm:rounded-3xl"
      >
        <div className="rounded-t-3xl bg-[#0B1220] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:rounded-3xl sm:p-7">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className={`absolute inset-0 rounded-2xl blur-lg ${glowStyle}`} />
              <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border ${iconStyle}`}>
                <Icon size={22} />
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id="cd-title" className="text-lg font-bold text-white">
                {title}
              </h2>

              {message && (
                <p id="cd-message" className="mt-1.5 text-sm leading-6 text-slate-300">
                  {message}
                </p>
              )}
            </div>
          </div>

          <div className={`mt-7 grid gap-3 ${hideCancel ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {!hideCancel && (
              <button
                ref={cancelRef}
                type="button"
                onClick={() => onClose(false)}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-200 outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
              >
                {cancelText}
              </button>
            )}

            <button
              ref={confirmRef}
              type="button"
              onClick={() => onClose(true)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/70 active:translate-y-0 ${confirmStyle}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// const [confirm, confirmDialog] = useConfirm();
// ... render {confirmDialog} once in the component, then: if (await confirm({...})) { ... }
function useConfirm() {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const close = useCallback((result) => {
    const resolve = resolver.current;
    resolver.current = null;
    setDialog(null);
    resolve?.(result);
  }, []);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      // A newer question replaces an unanswered older one (treated as "cancel")
      resolver.current?.(false);
      resolver.current = resolve;
      setDialog(typeof options === 'string' ? { message: options } : options || {});
    });
  }, []);

  const element = dialog
    ? createPortal(<ConfirmDialog dialog={dialog} onClose={close} />, document.body)
    : null;

  return [confirm, element];
}

const SUGGESTIONS = [
  {
    icon: Calculator,
    title: 'Work through a problem',
    text: 'Explain quadratic equations step by step.'
  },
  {
    icon: FlaskConical,
    title: 'Compare concepts',
    text: 'What is the difference between mitosis and meiosis?'
  },
  {
    icon: Landmark,
    title: 'Understand a topic',
    text: 'Explain the causes of World War I.'
  },
  {
    icon: ListChecks,
    title: 'Practise what you know',
    text: 'Generate a practice quiz on cell biology.'
  }
];

export default function Tutor() {
  const { user, profile } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirm, confirmDialog] = useConfirm();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState('');

  const abortRef = useRef(null);
  const tokenRef = useRef('');
  const frameRef = useRef(0);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return [];

    const { data, error } = await supabase
      .from('tutor_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    setConversations(data || []);
    return data || [];
  }, [user?.id]);

  const loadConversation = useCallback(async (id) => {
    if (!id || loading || sending) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('tutor_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      setConversationId(id);
      setIsSidebarOpen(false);
    } catch (err) {
      toast(err.message || 'Something went wrong.', 'error');
    } finally {
      setLoading(false);
    }
  }, [loading, sending]);

  const startNewChat = useCallback(async () => {
    if (!user?.id || loading || sending) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('tutor_conversations')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      setConversationId(data.id);
      setMessages([]);
      setInput('');
      await fetchConversations();
      setIsSidebarOpen(false);
    } catch (err) {
      toast(err.message || 'Something went wrong.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, loading, sending, fetchConversations]);

  useEffect(() => {
    if (!user?.id) {
      setInitializing(false);
      return;
    }

    let cancelled = false;

    async function initialise() {
      setInitializing(true);
      setError('');

      try {
        const list = await fetchConversations();
        if (cancelled) return;

        if (list.length > 0) {
          const first = list[0];

          const { data, error } = await supabase
            .from('tutor_messages')
            .select('*')
            .eq('conversation_id', first.id)
            .order('created_at', { ascending: true });

          if (error) throw error;
          if (cancelled) return;

          setConversationId(first.id);
          setMessages(data || []);
        } else {
          const { data, error } = await supabase
            .from('tutor_conversations')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (error) throw error;
          if (cancelled) return;

          setConversationId(data.id);
          setMessages([]);
          await fetchConversations();
        }
      } catch (err) {
        if (!cancelled) {
          toast(err.message || 'Something went wrong.', 'error');
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    initialise();

    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchConversations]);

  // Smooth streaming: update the screen at most once per frame
  const pushToken = useCallback((text) => {
    tokenRef.current = text;

    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        setStreamText(tokenRef.current);
      });
    }
  }, []);

  // Give a new conversation a readable title from its first question
  async function nameConversation(id, text) {
    try {
      const { error } = await supabase
        .from('tutor_conversations')
        .update({ title: text.slice(0, 60) })
        .eq('id', id)
        .eq('user_id', user.id);

      if (!error) await fetchConversations();
    } catch {
      /* the title is only cosmetic */
    }
  }

  async function send(text, baseMessages = messages, options = {}) {
    const userMsg = (text ?? input).trim();

    if (!userMsg || sending || loading || !conversationId) return;

    const activeConversation = conversationId;
    const isFirst = baseMessages.length === 0 && !options.skipUserInsert;

    const newMessages = [
      ...baseMessages,
      { role: 'user', content: userMsg }
    ];

    const controller = new AbortController();
    abortRef.current = controller;

    let userSaved = !!options.skipUserInsert;

    setInput('');
    setError('');
    setMessages(newMessages);
    setStreamText('');
    setSending(true);

    try {
      if (!options.skipUserInsert) {
        const { error: userError } = await supabase
          .from('tutor_messages')
          .insert({
            conversation_id: activeConversation,
            role: 'user',
            content: userMsg
          });

        if (userError) throw userError;
        userSaved = true;
      }

      if (isFirst) nameConversation(activeConversation, userMsg);

      const aiMsg = await generateChatResponse(newMessages, 2, {
        onToken: pushToken,
        signal: controller.signal
      });

      if (typeof aiMsg !== 'string' || !aiMsg.trim()) {
        throw new Error('The tutor returned an empty response.');
      }

      const { data: saved, error: assistantError } = await supabase
        .from('tutor_messages')
        .insert({
          conversation_id: activeConversation,
          role: 'assistant',
          content: aiMsg
        })
        .select('id, role, content, created_at')
        .single();

      if (assistantError) throw assistantError;

      setMessages([...newMessages, saved]);
    } catch (err) {
      if (err?.aborted) {
        // The student pressed Stop before anything arrived
        setMessages(newMessages);
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: err.message || 'Something went wrong. Please try again.',
            isError: true,
            userSaved
          }
        ]);
      }
    } finally {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }

      abortRef.current = null;
      setStreamText('');
      setSending(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  // Regenerate the last answer, or retry after an error
  async function redo() {
    if (sending || loading) return;

    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
    if (lastUserIndex === -1) return;

    const lastUser = messages[lastUserIndex];
    const last = messages[messages.length - 1];
    const base = messages.slice(0, lastUserIndex);

    let skipUserInsert = true;

    if (last?.isError) {
      skipUserInsert = !!last.userSaved;
    } else if (last?.role === 'assistant' && last.id) {
      // Remove the old answer so reloading the chat does not show two
      await supabase
        .from('tutor_messages')
        .delete()
        .eq('id', last.id)
        .eq('conversation_id', conversationId);
    }

    send(lastUser.content, base, { skipUserInsert });
  }

  async function saveAsNote(msg) {
    const firstLine = msg.content.split('\n').find((line) => line.trim()) || '';
    const title =
      firstLine
        .replace(/^[#>*\-\s\d.]+/, '')
        .replace(/[*_`]/g, '')
        .trim()
        .slice(0, 80) || 'Tutor note';

    const { error: noteError } = await supabase.from('study_notes').insert({
      user_id: user.id,
      title,
      content: msg.content,
      subject_id: null,
      topic_id: null,
      updated_at: new Date().toISOString()
    });

    if (noteError) {
      setError(noteError.message || 'Unable to save this note.');
      return false;
    }

    return true; // the button then shows "Saved"
  }

  async function deleteConversation(id) {
    const confirmed = await confirm({
      title: 'Delete this conversation?',
      message: 'All of its messages will be permanently removed. This cannot be undone.',
      confirmText: 'Delete conversation',
      tone: 'danger'
    });

    if (!confirmed || loading || sending) return;

    setError('');

    try {
      const { error: messageError } = await supabase
        .from('tutor_messages')
        .delete()
        .eq('conversation_id', id);

      if (messageError) throw messageError;

      const { error: conversationError } = await supabase
        .from('tutor_conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (conversationError) throw conversationError;

      const remaining = await fetchConversations();

      if (conversationId === id) {
        setMessages([]);
        setConversationId(null);

        if (remaining.length > 0) {
          const first = remaining[0];

          const { data, error } = await supabase
            .from('tutor_messages')
            .select('*')
            .eq('conversation_id', first.id)
            .order('created_at', { ascending: true });

          if (error) throw error;

          setMessages(data || []);
          setConversationId(first.id);
        } else {
          await startNewChat();
        }
      }

    } catch (err) {
      toast(err.message || 'Something went wrong.', 'error');
    }
  }

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0];
  const current = conversations.find((c) => c.id === conversationId);
  const headerTitle = current?.title || 'Study Tutor';
  const showEmpty = !initializing && !loading && messages.length === 0 && !sending;

  return (
    <div className="ck-root fixed inset-0 z-40 flex h-[100dvh] w-full overflow-hidden bg-[#060B16] text-slate-200">
      <ChatStyles />
      <ChatBackdrop />
      {confirmDialog}

      <ChatHistory
        conversations={conversations}
        currentId={conversationId}
        onSelect={loadConversation}
        onNew={startNewChat}
        onDelete={deleteConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">

        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#060B16]/70 px-3 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Back to Dashboard"
              title="Back to Dashboard"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:-translate-x-0.5 hover:border-[#22D3EE]/40 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open conversation history"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white md:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="relative hidden shrink-0 sm:block">
              <div className="absolute inset-0 rounded-xl bg-[#22D3EE]/40 blur-md" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-white">
                <BookOpen size={19} />
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-white">
                {headerTitle}
              </h1>
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                Study Tutor · Online
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewChat}
            disabled={loading || initializing || sending}
            className="ck-shine relative flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white transition hover:border-[#22D3EE]/40 hover:bg-white/10 disabled:opacity-40"
          >
            <Plus size={16} className="text-[#67E8F9]" />
            <span className="hidden sm:inline">New chat</span>
            <span className="sm:hidden">New</span>
          </button>
        </header>

        {/* Error notification */}
        {error && (
          <div className="ck-pop mx-3 mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3.5 text-sm text-rose-200 backdrop-blur-md sm:mx-5">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
              className="rounded-md p-0.5 text-rose-300 transition hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Conversation */}
        <ChatScroll resetKey={conversationId} count={messages.length} tick={streamText.length}>
          <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-8">
            {initializing || loading ? (
              <ChatSkeleton />
            ) : showEmpty ? (
              <EmptyState
                heading={`${firstName ? `Hi ${firstName}, w` : 'W'}hat would you like to learn today?`}
                subtitle="Ask a question, work through a problem or get ready for your next exam. Every answer can be saved to your notes."
                suggestions={SUGGESTIONS}
                onPick={(text) => send(text)}
                disabled={!conversationId}
              />
            ) : (
              <div className="space-y-7">
                {messages.map((msg, idx) => (
                  <Message
                    key={msg.id ?? idx}
                    msg={msg}
                    isLast={idx === messages.length - 1 && !sending}
                    busy={sending}
                    onRedo={redo}
                    onSaveNote={saveAsNote}
                  />
                ))}

                {sending && (
                  streamText
                    ? <Message streaming msg={{ role: 'assistant', content: streamText }} />
                    : <TypingIndicator label="Preparing your explanation..." />
                )}
              </div>
            )}
          </div>
        </ChatScroll>

        {/* Composer */}
        <footer className="shrink-0 bg-gradient-to-t from-[#060B16] via-[#060B16]/90 to-transparent px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5">
          <Composer
            value={input}
            onChange={setInput}
            onSend={() => send()}
            onStop={stop}
            sending={sending}
            disabled={!conversationId || initializing || loading}
            placeholder="Ask a question or enter a topic..."
            hint="Enter to send · Shift + Enter for a new line"
          />
        </footer>
      </main>
    </div>
  );
}
