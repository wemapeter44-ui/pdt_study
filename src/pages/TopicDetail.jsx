import {
  useEffect, useState, useRef, useCallback, memo
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, MessageSquare, Menu, X, GraduationCap,
  PanelLeftClose, PanelLeftOpen, AlertCircle, Sparkles, ArrowUp, ArrowDown,
  BookOpen, Check, Copy, NotebookPen, RotateCcw, Square
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generateChatResponse } from '../lib/ai-router';

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

export default function TopicDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [topic, setTopic] = useState(null);
  const [subject, setSubject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [desktopSidebar, setDesktopSidebar] = useState(true);

  const abortRef = useRef(null);
  const tokenRef = useRef('');
  const frameRef = useRef(0);

  useEffect(() => {
    if (user) loadTopic();
  }, [id, user]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  async function loadTopic() {
    setLoading(true);
    setError('');

    const { data, error: topicError } = await supabase
      .from('topics')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (topicError || !data) {
      setError('Topic could not be loaded.');
      setLoading(false);
      return;
    }

    setTopic(data);

    const { data: subjectData } = await supabase
      .from('subjects')
      .select('id, name, color')
      .eq('id', data.subject_id)
      .eq('user_id', user.id)
      .single();

    setSubject(subjectData);

    const { data: savedConversations, error: conversationError } =
      await supabase
        .from('tutor_conversations')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .ilike('title', `${data.name} —%`)
        .order('created_at', { ascending: false });

    if (conversationError) {
      setError(conversationError.message);
    } else {
      setConversations(savedConversations || []);
    }

    setLoading(false);
  }

  async function openConversation(conversation) {
    if (sending) return;

    setError('');
    setActiveConversation(conversation.id);
    setMessages([]);
    setHistoryOpen(false);
    setOpening(true);

    const { data, error: messageError } = await supabase
      .from('tutor_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    setOpening(false);

    if (messageError) {
      setError(messageError.message);
      return;
    }

    setMessages(data || []);
  }

  function startNewConversation() {
    if (sending) return;

    setActiveConversation(null);
    setMessages([]);
    setQuestion('');
    setError('');
    setHistoryOpen(false);
  }

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

  async function send(text, baseMessages = messages, options = {}) {
    const userText = String(text ?? '').trim();
    if (!userText || sending || !topic) return;

    const controller = new AbortController();
    abortRef.current = controller;

    const updatedMessages = [
      ...baseMessages,
      { role: 'user', content: userText }
    ];

    setQuestion('');
    setError('');
    setMessages(updatedMessages);
    setStreamText('');
    setSending(true);

    try {
      let conversationId = activeConversation;

      if (!conversationId) {
        const { data: newConversation, error: createError } =
          await supabase
            .from('tutor_conversations')
            .insert({
              user_id: user.id,
              title: `${topic.name} — ${userText.slice(0, 60)}`
            })
            .select('id, title, created_at')
            .single();

        if (createError) throw createError;

        conversationId = newConversation.id;
        setActiveConversation(conversationId);
        setConversations(prev => [newConversation, ...prev]);
      }

      if (!options.skipUserInsert) {
        const { error: saveUserError } = await supabase
          .from('tutor_messages')
          .insert({
            conversation_id: conversationId,
            role: 'user',
            content: userText
          });

        if (saveUserError) throw saveUserError;
      }

      const response = await generateChatResponse(updatedMessages, 2, {
        topic: topic.name,
        subject: subject?.name,
        onToken: pushToken,
        signal: controller.signal
      });

      const { data: savedAssistantMessage, error: saveAssistantError } =
        await supabase
          .from('tutor_messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: response
          })
          .select('id, role, content, created_at')
          .single();

      if (saveAssistantError) throw saveAssistantError;

      setMessages([...updatedMessages, savedAssistantMessage]);
    } catch (err) {
      if (err?.aborted) {
        // Stopped before anything arrived: keep the question in the chat
        setMessages(updatedMessages);
      } else {
        setError(err.message || 'Unable to send your question.');
        // Remove the unanswered question and give the text back to the input
        setMessages(baseMessages);
        if (!options.skipUserInsert) setQuestion(userText);
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

  // Regenerate the last answer
  async function redo() {
    if (sending) return;

    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
    if (lastUserIndex === -1) return;

    const lastUser = messages[lastUserIndex];
    const last = messages[messages.length - 1];
    const base = messages.slice(0, lastUserIndex);

    if (last?.role === 'assistant' && last.id && activeConversation) {
      // Remove the old answer so reloading the chat does not show two
      await supabase
        .from('tutor_messages')
        .delete()
        .eq('id', last.id)
        .eq('conversation_id', activeConversation);
    }

    send(lastUser.content, base, { skipUserInsert: true });
  }

  async function saveAsNote(msg) {
    const firstLine = msg.content.split('\n').find((line) => line.trim()) || '';
    const title =
      firstLine
        .replace(/^[#>*\-\s\d.]+/, '')
        .replace(/[*_`]/g, '')
        .trim()
        .slice(0, 80) || `${topic.name} note`;

    const { error: noteError } = await supabase.from('study_notes').insert({
      user_id: user.id,
      title,
      content: msg.content,
      subject_id: topic.subject_id || null,
      topic_id: topic.id,
      updated_at: new Date().toISOString()
    });

    if (noteError) {
      setError(noteError.message || 'Unable to save this note.');
      return false;
    }

    return true; // the button then shows "Saved"
  }

  const historyPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-[#22D3EE]/40 blur-md" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500">
              <GraduationCap size={20} className="text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-white">PDT Study</p>
            <p className="text-xs text-slate-400">Study workspace</p>
          </div>
        </div>
        <button
          onClick={() => setHistoryOpen(false)}
          className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close discussions"
        >
          <X size={19} />
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={startNewConversation}
          disabled={sending}
          className="ck-shine relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-[#22D3EE]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#22D3EE]/40 active:translate-y-0 disabled:opacity-50"
        >
          <Plus size={17} />
          New discussion
        </button>
      </div>

      <div className="px-4 pb-2">
        <p className="text-xs font-semibold text-slate-400">Your discussions</p>
      </div>

      <div className="ck-scroll flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
        {conversations.length === 0 ? (
          <div className="px-2 py-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <MessageSquare size={19} className="text-slate-400" />
            </div>
            <p className="mt-3 text-xs text-slate-300">
              Your saved discussions will appear here.
            </p>
          </div>
        ) : (
          conversations.map(conversation => {
            const active = activeConversation === conversation.id;

            return (
              <button
                key={conversation.id}
                onClick={() => openConversation(conversation)}
                className={`relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  active
                    ? 'border-white/10 bg-gradient-to-r from-[#22D3EE]/15 to-violet-500/10 text-white'
                    : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {active && (
                  <span className="absolute inset-y-2.5 -left-3 w-1 rounded-full bg-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                )}
                <MessageSquare
                  size={16}
                  className={`mt-0.5 shrink-0 ${active ? 'text-[#22D3EE]' : 'text-slate-400'}`}
                />
                <span className="line-clamp-2 text-xs leading-5">
                  {conversation.title.replace(`${topic?.name} —`, '').trim()}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <Link
          to="/subjects"
          className="group flex items-center gap-2 text-xs text-slate-300 transition-colors hover:text-white"
        >
          <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
          Back to subjects
        </Link>
      </div>
    </div>
  );

  /* ---------- LOADING (skeleton) ---------- */
  if (loading) {
    return (
      <div className="ck-root fixed inset-0 z-40 flex overflow-hidden bg-[#060B16] text-white">
        <ChatStyles />
        <ChatBackdrop />

        <aside className="relative z-10 hidden w-[270px] shrink-0 border-r border-white/10 bg-[#060B16]/70 p-5 lg:block">
          <div className="flex items-center gap-3">
            <span className="ck-skel block h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <span className="ck-skel block h-3.5 w-20 rounded-lg" />
              <span className="ck-skel block h-3 w-28 rounded-lg" />
            </div>
          </div>
          <span className="ck-skel mt-6 block h-11 w-full rounded-xl" />
          <div className="mt-7 space-y-2.5">
            {[1, 2, 3].map(n => <span key={n} className="ck-skel block h-12 w-full rounded-xl" />)}
          </div>
        </aside>

        <main className="relative z-10 flex min-w-0 flex-1 flex-col" aria-busy="true" aria-label="Loading study workspace">
          <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-5">
            <div className="space-y-2">
              <span className="ck-skel block h-3 w-20 rounded-lg" />
              <span className="ck-skel block h-4 w-44 rounded-lg" />
            </div>
            <span className="ck-skel block h-9 w-9 rounded-xl" />
          </div>

          <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
            <ChatSkeleton />
          </div>

          <div className="px-4 pb-5 sm:px-6">
            <span className="ck-skel mx-auto block h-14 w-full max-w-3xl rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  /* ---------- NOT FOUND ---------- */
  if (!topic) {
    return (
      <div className="ck-root relative flex min-h-screen items-center justify-center bg-[#060B16] p-6 text-white">
        <ChatStyles />
        <ChatBackdrop />
        <div className={`${glass} ck-pop relative z-10 flex max-w-md items-start gap-3 rounded-2xl p-5 text-rose-200`}>
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-rose-400" />
          <p className="text-sm">{error || 'Topic not found.'}</p>
        </div>
      </div>
    );
  }

  const topicSuggestions = [
    { icon: Sparkles, title: 'Start with the basics', text: `Explain the basics of ${topic.name}` },
    { icon: Sparkles, title: 'See an example', text: `Give me an example of ${topic.name}` },
    { icon: Sparkles, title: 'Check my understanding', text: `Ask me 5 short practice questions on ${topic.name}` },
    { icon: Sparkles, title: 'Summarise it', text: `Summarise the key points of ${topic.name} for revision` }
  ];

  return (
    <div className="ck-root fixed inset-0 z-40 flex overflow-hidden bg-[#060B16] text-white">
      <ChatStyles />
      <ChatBackdrop />

      {desktopSidebar && (
        <aside className="relative z-10 hidden w-[270px] shrink-0 border-r border-white/10 bg-[#060B16]/70 backdrop-blur-xl lg:block">
          {historyPanel}
        </aside>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close discussion history"
            onClick={() => setHistoryOpen(false)}
            className="ck-fade absolute inset-0 bg-[#02050B]/70 backdrop-blur-sm"
          />
          <aside className="relative h-full w-[min(85vw,300px)] border-r border-white/10 bg-[#0B1220] shadow-[20px_0_60px_rgba(0,0,0,0.5)]">
            {historyPanel}
          </aside>
        </div>
      )}

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#060B16]/70 px-3 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setHistoryOpen(true)}
              className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Open discussions"
            >
              <Menu size={21} />
            </button>

            <button
              onClick={() => setDesktopSidebar(!desktopSidebar)}
              className="hidden rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:block"
              aria-label="Toggle sidebar"
            >
              {desktopSidebar
                ? <PanelLeftClose size={20} />
                : <PanelLeftOpen size={20} />}
            </button>

            <div className="min-w-0">
              <p className="truncate text-xs text-slate-400">
                {subject?.name || 'Subject'}
              </p>
              <h1 className="truncate text-sm font-semibold sm:text-base">
                {topic.name}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-[#22D3EE]/20 bg-[#22D3EE]/10 px-3 py-1.5 text-xs font-medium text-[#67E8F9] sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22D3EE] shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              Topic Tutor
            </span>
            <Link
              to={`/subjects/${topic.subject_id}`}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-300 transition hover:-translate-x-0.5 hover:bg-white/10 hover:text-white"
              aria-label="Back to subject"
            >
              <ArrowLeft size={18} />
            </Link>
          </div>
        </header>

        <ChatScroll resetKey={activeConversation} count={messages.length} tick={streamText.length}>
          <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-8">
            {opening ? (
              <ChatSkeleton />
            ) : messages.length === 0 && !sending ? (
              <EmptyState
                heading={`Let's understand ${topic.name}`}
                subtitle="Ask a question, request an explanation or explore a concept. Your discussions are saved so you can continue later, and any answer can be saved to your notes."
                suggestions={topicSuggestions}
                onPick={(text) => setQuestion(text)}
              />
            ) : (
              <div className="space-y-7">
                {messages.map((message, index) => (
                  <Message
                    key={message.id || index}
                    msg={message}
                    isLast={index === messages.length - 1 && !sending}
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

        <footer className="shrink-0 bg-gradient-to-t from-[#060B16] via-[#060B16]/90 to-transparent px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5">
          {error && (
            <div className="ck-pop mx-auto mb-3 flex max-w-3xl items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
                className="rounded p-0.5 text-rose-300 hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <Composer
            value={question}
            onChange={setQuestion}
            onSend={() => send(question)}
            onStop={stop}
            sending={sending}
            disabled={opening}
            placeholder={`Ask about ${topic.name}...`}
            hint="PDT Study · Learn with purpose"
          />
        </footer>
      </main>
    </div>
  );
}