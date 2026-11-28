import {
  useEffect, useState, useRef, useCallback
} from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Plus, Trash2, Loader2, AlertCircle,
  X, ChevronRight, CheckCircle2, Info
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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

/* ---------- local styles (self-contained, no extra files needed) ---------- */
// Colours use exact hex values so they work even if the Tailwind cyan palette is customised.
const glass =
  'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white';

const btnPrimary =
  'sd-shine relative overflow-hidden bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-[#22D3EE]/20 transition-all hover:shadow-[#22D3EE]/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.sd-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
.sd-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
}
@keyframes sd-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-24px,0) scale(1.08); } }
@keyframes sd-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes sd-pop { from { opacity: 0; transform: scale(.96) translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes sd-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sd-skel { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.sd-orb { animation: sd-float 14s ease-in-out infinite; }
.sd-rise { animation: sd-rise .55s cubic-bezier(.2,.7,.2,1) both; }
.sd-pop { animation: sd-pop .3s cubic-bezier(.2,.7,.2,1) both; }
.sd-fade { animation: sd-fade .25s ease both; }
.sd-skel {
  background: linear-gradient(90deg, rgba(255,255,255,.05) 25%, rgba(255,255,255,.14) 50%, rgba(255,255,255,.05) 75%);
  background-size: 200% 100%;
  animation: sd-skel 1.6s ease-in-out infinite;
}
.sd-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.3), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.sd-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
@media (prefers-reduced-motion: reduce) {
  .sd-orb, .sd-rise, .sd-pop, .sd-fade, .sd-skel { animation: none !important; }
  .sd-shine::before { transition: none; }
}
`;

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="sd-grid absolute inset-0" />
      <div className="sd-orb absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-[#22D3EE]/20 blur-[120px]" />
      <div className="sd-orb absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-[120px]" style={{ animationDelay: '-5s' }} />
      <div className="sd-orb absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-600/15 blur-[120px]" style={{ animationDelay: '-9s' }} />
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <span aria-hidden className={`sd-skel block rounded-lg ${className}`} />;
}

function Shell({ children }) {
  return (
    <div className="sd-root relative min-h-screen overflow-x-hidden bg-[#060B16] text-white">
      <style>{styles}</style>
      <Backdrop />
      <main className="relative z-10 mx-auto w-full max-w-5xl space-y-8 px-4 py-6 pb-24 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/subjects"
      className="group inline-flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-white"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-all group-hover:-translate-x-0.5 group-hover:bg-white/10">
        <ArrowLeft size={16} />
      </span>
      Back to subjects
    </Link>
  );
}

export default function SubjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [confirm, confirmDialog] = useConfirm();

  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      if (!user || !id) return;

      setLoading(true);
      setError('');

      const [subjectResult, topicsResult] = await Promise.all([
        supabase.from('subjects').select('*')
          .eq('id', id).eq('user_id', user.id).single(),

        supabase.from('topics').select('*')
          .eq('subject_id', id).eq('user_id', user.id)
          .order('created_at', { ascending: true })
      ]);

      if (!active) return;

      if (subjectResult.error) {
        setError('Subject not found or unavailable.');
      } else {
        setSubject(subjectResult.data);
      }

      if (topicsResult.error) {
        setError('Unable to load topics.');
      } else {
        setTopics(topicsResult.data || []);
      }

      setLoading(false);
    }

    loadWorkspace();
    return () => { active = false; };
  }, [id, user]);

  async function handleAddTopic(e) {
    e.preventDefault();
    const name = topicName.trim();

    if (!name || !subject || !user) return;

    setSaving(true);
    setError('');

    const { data, error: insertError } = await supabase
      .from('topics')
      .insert({
        subject_id: subject.id,
        user_id: user.id,
        name
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
    } else {
      setTopics(current => [...current, data]);
      setTopicName('');
      setShowForm(false);
    }

    setSaving(false);
  }

  async function handleDeleteTopic(topicId) {
    const confirmed = await confirm({
      title: 'Delete this topic?',
      message: 'The topic will be removed from this subject. This cannot be undone.',
      confirmText: 'Delete topic',
      tone: 'danger'
    });

    if (!confirmed) return;

    setDeleting(topicId);
    setError('');

    const { error: deleteError } = await supabase
      .from('topics')
      .delete()
      .eq('id', topicId)
      .eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setTopics(current => current.filter(topic => topic.id !== topicId));
    }

    setDeleting(null);
  }

  /* ---------- LOADING (skeleton) ---------- */
  if (loading) {
    return (
      <Shell>
        <div aria-busy="true" aria-label="Loading subject" className="space-y-8">
          <Skeleton className="h-8 w-40" />

          <div className={`${glass} flex items-center gap-4 rounded-3xl p-6`}>
            <Skeleton className="h-14 w-14 shrink-0 !rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-3 h-7 w-56 max-w-full" />
            </div>
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <Skeleton className="h-5 w-20" />
                <Skeleton className="mt-2 h-3 w-16" />
              </div>
              <Skeleton className="h-11 w-32 !rounded-xl" />
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className={`${glass} flex items-center gap-3 rounded-2xl p-4`}>
                  <Skeleton className="h-10 w-10 shrink-0 !rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="mt-2.5 h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- NOT FOUND ---------- */
  if (!subject) {
    return (
      <Shell>
        <BackLink />

        <div className={`${glass} sd-pop rounded-3xl px-5 py-14 text-center`}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-400/10 text-rose-300">
            <AlertCircle size={26} />
          </div>
          <p className="text-sm text-slate-300">
            {error || 'Subject unavailable.'}
          </p>
        </div>
      </Shell>
    );
  }

  const color = subject.color || '#22D3EE';

  return (
    <Shell>
      {confirmDialog}
      <div className="sd-rise">
        <BackLink />
      </div>

      {/* SUBJECT HEADER */}
      <section
        className="sd-rise rounded-3xl bg-gradient-to-br from-white/20 via-white/5 to-white/0 p-px"
        style={{ animationDelay: '60ms' }}
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 backdrop-blur-xl sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
            style={{ backgroundColor: color }}
          />

          <div className="relative flex items-center gap-5">
            <div className="relative shrink-0">
              <div
                className="absolute inset-0 rounded-2xl opacity-60 blur-lg"
                style={{ backgroundColor: color }}
              />
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: `${color}30`,
                  color,
                  boxShadow: `inset 0 0 0 1px ${color}55`,
                }}
              >
                <BookOpen size={28} />
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-300">
                Subject workspace
              </p>
              <h1 className="mt-1 break-words bg-gradient-to-b from-white to-slate-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                {subject.name}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* TOPICS */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Topics</h2>
            <p className="mt-1 text-sm text-slate-400">
              {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className={`${btnPrimary} inline-flex items-center gap-2 px-5 py-3 text-sm`}
          >
            <Plus size={17} /> Add topic
          </button>
        </div>

        {error && (
          <div className="sd-pop mb-4 flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3.5 text-sm text-rose-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />
            {error}
          </div>
        )}

        {topics.length === 0 ? (
          <div className={`${glass} sd-pop rounded-3xl px-5 py-14 text-center`}>
            <div className="relative mx-auto mb-5 h-16 w-16">
              <div className="absolute inset-0 rounded-full bg-[#22D3EE]/30 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#22D3EE]/20 bg-[#22D3EE]/10 text-[#67E8F9]">
                <BookOpen size={28} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white">No topics yet</h3>
            <p className="mt-2 text-sm text-slate-300">
              Add your first topic to organise this subject.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className={`${btnPrimary} mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm`}
            >
              <Plus size={16} />
              Add your first topic
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((topic, index) => (
              <div
                key={topic.id}
                style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                className="sd-rise group rounded-2xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-px transition-all duration-300 hover:-translate-y-0.5 hover:from-[#22D3EE]/45"
              >
                <div className={`${glass} flex items-center gap-3 rounded-2xl p-3.5 pr-2 transition-colors group-hover:bg-white/[0.07] sm:p-4 sm:pr-3`}>
                  <Link
                    to={`/topics/${topic.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums"
                      style={{
                        backgroundColor: `${color}20`,
                        color,
                        boxShadow: `inset 0 0 0 1px ${color}40`,
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-white">{topic.name}</p>
                      <p className="mt-1 text-xs text-slate-300">Open learning workspace</p>
                    </div>
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-white"
                    />
                  </Link>

                  <button
                    onClick={() => handleDeleteTopic(topic.id)}
                    disabled={deleting === topic.id}
                    aria-label={`Delete ${topic.name}`}
                    className="rounded-xl p-2.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                  >
                    {deleting === topic.id
                      ? <Loader2 size={17} className="animate-spin" />
                      : <Trash2 size={17} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ADD TOPIC MODAL */}
      {showForm && (
        <div className="sd-fade fixed inset-0 z-50 flex items-center justify-center bg-[#02050B]/80 px-4 backdrop-blur-md">
          <div className="sd-pop w-full max-w-md rounded-3xl bg-gradient-to-br from-white/20 via-white/5 to-white/0 p-px">
            <div className="rounded-3xl bg-[#0B1220]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-7">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-xl bg-[#22D3EE]/40 blur-md" />
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-white">
                      <Plus size={19} />
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-white">Add a topic</h2>
                </div>

                <button
                  onClick={() => {
                    setShowForm(false);
                    setTopicName('');
                  }}
                  aria-label="Close"
                  className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={handleAddTopic}>
                <label htmlFor="topicName" className="mb-2 block text-sm font-medium text-slate-200">
                  Topic name
                </label>
                <input
                  id="topicName"
                  value={topicName}
                  onChange={e => setTopicName(e.target.value)}
                  placeholder="e.g. Introduction to Algebra"
                  maxLength={100}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition-all [color-scheme:dark] placeholder:text-slate-500 focus:border-[#22D3EE]/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#22D3EE]/10"
                />

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setTopicName('');
                    }}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !topicName.trim()}
                    className={`${btnPrimary} flex items-center gap-2 px-5 py-3 text-sm`}
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? 'Saving...' : 'Save topic'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}