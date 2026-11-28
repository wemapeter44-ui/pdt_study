import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Book,
  ChevronRight,
  X,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

const COLORS = [
  '#64748B',
  '#0891B2',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED'
];

const EMPTY_SUBJECT = {
  name: '',
  color: '#64748B'
};

/* ---------- local styles (self-contained, no extra files needed) ---------- */
// Colours use exact hex values so they work even if the Tailwind cyan palette is customised.
const glass =
  'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white';

const btnPrimary =
  'sj-shine relative overflow-hidden bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-[#22D3EE]/20 transition-all hover:shadow-[#22D3EE]/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.sj-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
.sj-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
}
@keyframes sj-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-24px,0) scale(1.08); } }
@keyframes sj-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes sj-pop { from { opacity: 0; transform: scale(.96) translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes sj-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sj-skel { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.sj-orb { animation: sj-float 14s ease-in-out infinite; }
.sj-rise { animation: sj-rise .55s cubic-bezier(.2,.7,.2,1) both; }
.sj-pop { animation: sj-pop .3s cubic-bezier(.2,.7,.2,1) both; }
.sj-fade { animation: sj-fade .25s ease both; }
.sj-skel {
  background: linear-gradient(90deg, rgba(255,255,255,.05) 25%, rgba(255,255,255,.14) 50%, rgba(255,255,255,.05) 75%);
  background-size: 200% 100%;
  animation: sj-skel 1.6s ease-in-out infinite;
}
.sj-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.3), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.sj-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
@media (prefers-reduced-motion: reduce) {
  .sj-orb, .sj-rise, .sj-pop, .sj-fade, .sj-skel { animation: none !important; }
  .sj-shine::before { transition: none; }
}
`;

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="sj-grid absolute inset-0" />
      <div className="sj-orb absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-[#22D3EE]/20 blur-[120px]" />
      <div className="sj-orb absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-[120px]" style={{ animationDelay: '-5s' }} />
      <div className="sj-orb absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-600/15 blur-[120px]" style={{ animationDelay: '-9s' }} />
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <span aria-hidden className={`sj-skel block rounded-lg ${className}`} />;
}

export default function Subjects() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [newSubject, setNewSubject] = useState(EMPTY_SUBJECT);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSubjects = useCallback(async () => {
    if (!user?.id) {
      setSubjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setSubjects(data || []);
    } catch (err) {
      toast(err.message || 'Unable to load subjects.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  async function addSubject(e) {
    e.preventDefault();

    if (!newSubject.name.trim() || !user?.id || saving) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          name: newSubject.name.trim(),
          color: newSubject.color
        })
        .select()
        .single();

      if (error) throw error;

      setSubjects(current => [...current, data]);
      setNewSubject(EMPTY_SUBJECT);
      setIsAdding(false);
      toast('Subject created successfully.', 'success');
    } catch (err) {
      toast(err.message || 'Unable to create subject.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubject(id) {
    const subject = subjects.find(item => item.id === id);

    if (!subject || deleting) return;

    const confirmed = window.confirm(
      `Delete "${subject.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(id);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSubjects(current => current.filter(item => item.id !== id));
      toast('Subject deleted successfully.', 'success');
    } catch (err) {
      toast(err.message || 'Unable to delete subject.', 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="sj-root relative min-h-screen overflow-x-hidden bg-[#060B16] text-white">
      <style>{styles}</style>
      <Backdrop />

      <div className="relative z-10 mx-auto max-w-4xl space-y-8 px-4 py-6 pb-24 sm:px-6 sm:py-8">

        {/* Page heading */}
        <div className="sj-rise flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/20 bg-[#22D3EE]/10 px-3 py-1 text-xs font-medium text-[#67E8F9]">
              <Sparkles size={13} />
              Learning workspace
            </p>

            <h1 className="bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              My subjects
            </h1>

            <p className="mt-3 max-w-md text-slate-300">
              Organise your subjects and access their learning materials.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError('');
              setIsAdding(true);
            }}
            className={`${btnPrimary} inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 text-sm sm:w-auto`}
          >
            <Plus size={18} />
            Add subject
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div role="alert" className="sj-pop flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3.5 text-sm text-rose-200">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-400" />
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="sj-pop flex items-start gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3.5 text-sm text-emerald-200">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
            {success}
          </div>
        )}

        {/* Add subject dialog */}
        {isAdding && (
          <div
            className="sj-fade fixed inset-0 z-50 flex items-center justify-center bg-[#02050B]/80 p-4 backdrop-blur-md"
            onClick={() => !saving && setIsAdding(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-subject-title"
              className="sj-pop w-full max-w-md rounded-3xl bg-gradient-to-br from-white/20 via-white/5 to-white/0 p-px"
              onClick={e => e.stopPropagation()}
            >
              <div className="rounded-3xl bg-[#0B1220]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-7">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-xl bg-[#22D3EE]/40 blur-md" />
                      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-white">
                        <Book size={20} />
                      </div>
                    </div>
                    <div>
                      <h2 id="add-subject-title" className="text-lg font-bold text-white">
                        Add a subject
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-300">
                        Enter the subject details below.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    disabled={saving}
                    aria-label="Close dialog"
                    className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                  >
                    <X size={19} />
                  </button>
                </div>

                <form onSubmit={addSubject} className="space-y-6">

                  <div>
                    <label htmlFor="subjectName" className="mb-2 block text-sm font-medium text-slate-200">
                      Subject name
                    </label>

                    <input
                      id="subjectName"
                      type="text"
                      autoFocus
                      required
                      maxLength={80}
                      placeholder="e.g. Mathematics"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition-all [color-scheme:dark] placeholder:text-slate-500 focus:border-[#22D3EE]/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#22D3EE]/10"
                      value={newSubject.name}
                      onChange={e => setNewSubject(current => ({
                        ...current,
                        name: e.target.value
                      }))}
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-200">
                      Subject colour
                    </label>

                    <div className="flex flex-wrap gap-3.5">
                      {COLORS.map(color => {
                        const selected = newSubject.color === color;

                        return (
                          <button
                            key={color}
                            type="button"
                            aria-label={`Select colour ${color}`}
                            aria-pressed={selected}
                            onClick={() => setNewSubject(current => ({
                              ...current,
                              color
                            }))}
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition-all duration-200 ${
                              selected
                                ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0B1220]'
                                : 'hover:scale-110'
                            }`}
                            style={{
                              backgroundColor: color,
                              boxShadow: selected ? `0 0 20px ${color}` : 'none',
                            }}
                          >
                            {selected && <CheckCircle2 size={16} />}
                          </button>
                        );
                      })}
                    </div>

                    {/* live preview */}
                    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${newSubject.color}25`,
                          color: newSubject.color,
                          boxShadow: `inset 0 0 0 1px ${newSubject.color}50`,
                        }}
                      >
                        <Book size={19} />
                      </div>
                      <p className="truncate text-sm font-semibold text-white">
                        {newSubject.name.trim() || 'Subject preview'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-white/10 pt-5">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      disabled={saving}
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving || !newSubject.name.trim()}
                      className={`${btnPrimary} flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm`}
                    >
                      {saving ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create subject'
                      )}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </div>
        )}

        {/* Subject count */}
        {!loading && subjects.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-white">
              Your subjects
            </p>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
              {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
            </span>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            aria-busy="true"
            aria-label="Loading subjects"
          >
            {[1, 2, 3, 4].map(n => (
              <div key={n} className={`${glass} flex items-center gap-4 rounded-2xl p-4`}>
                <Skeleton className="h-12 w-12 shrink-0 !rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-2.5 h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : subjects.length === 0 ? (

          /* Empty state */
          <div className={`${glass} sj-pop rounded-3xl px-5 py-16 text-center`}>
            <div className="relative mx-auto mb-5 h-16 w-16">
              <div className="absolute inset-0 rounded-full bg-[#22D3EE]/30 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#22D3EE]/20 bg-[#22D3EE]/10 text-[#67E8F9]">
                <Book size={27} />
              </div>
            </div>

            <h3 className="text-xl font-semibold text-white">
              No subjects added
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-300">
              Start by adding a subject. You can organise your learning materials and topics under each subject.
            </p>

            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className={`${btnPrimary} mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm`}
            >
              <Plus size={17} />
              Add your first subject
            </button>
          </div>

        ) : (

          /* Subjects list */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {subjects.map((subject, i) => {
              const color = subject.color || '#64748B';

              return (
                <div
                  key={subject.id}
                  style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
                  className="sj-rise group relative rounded-2xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-px transition-all duration-300 hover:-translate-y-1 hover:from-white/35"
                >
                  <div
                    className="pointer-events-none absolute -left-4 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full opacity-25 blur-3xl transition-opacity duration-300 group-hover:opacity-60"
                    style={{ backgroundColor: color }}
                  />

                  <div className={`${glass} relative rounded-2xl transition-colors group-hover:bg-white/[0.07]`}>
                    <Link
                      to={`/subjects/${subject.id}`}
                      className="block rounded-2xl p-4 pr-14 outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: `${color}25`,
                            color,
                            boxShadow: `inset 0 0 0 1px ${color}50`,
                          }}
                        >
                          <Book size={22} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-white">
                            {subject.name}
                          </h3>

                          <p className="mt-1 text-xs text-slate-300">
                            View learning materials
                          </p>
                        </div>

                        <ChevronRight
                          size={18}
                          className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#22D3EE]"
                        />
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={() => deleteSubject(subject.id)}
                      disabled={deleting === subject.id || !!deleting}
                      aria-label={`Delete ${subject.name}`}
                      title="Delete subject"
                      className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                    >
                      {deleting === subject.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

