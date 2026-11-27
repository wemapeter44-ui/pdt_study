import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Plus, Check, Trash2, Clock,
  BookOpen, Target, ListTodo, ChevronDown, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Priority pill colours plus a matching accent stripe on each task card
const priorities = {
  High: {
    pill: 'text-rose-300 bg-rose-400/10 border-rose-400/25',
    stripe: 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.7)]',
  },
  Medium: {
    pill: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
    stripe: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)]',
  },
  Low: {
    pill: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
    stripe: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]',
  },
};

/* ---------- local styles (self-contained, no extra files needed) ---------- */
// Colours use exact hex values so they work even if the Tailwind cyan palette is customised.
const glass =
  'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white';

const inputStyle =
  'w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-[#22D3EE]/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#22D3EE]/10 [color-scheme:dark]';

const btnPrimary =
  'pl-shine relative overflow-hidden bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-[#22D3EE]/20 transition-all hover:shadow-[#22D3EE]/40 hover:-translate-y-0.5 active:translate-y-0';

const optionClass = 'bg-[#0B1220] text-white';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.pl-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
.pl-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
}
@keyframes pl-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-24px,0) scale(1.08); } }
@keyframes pl-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes pl-pop { from { opacity: 0; transform: scale(.97) translateY(-8px); } to { opacity: 1; transform: none; } }
@keyframes pl-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes pl-skel { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.pl-orb { animation: pl-float 14s ease-in-out infinite; }
.pl-rise { animation: pl-rise .55s cubic-bezier(.2,.7,.2,1) both; }
.pl-pop { animation: pl-pop .3s cubic-bezier(.2,.7,.2,1) both; }
.pl-bar { transform-origin: left; animation: pl-bar 1s cubic-bezier(.2,.7,.2,1) both; }
.pl-skel {
  background: linear-gradient(90deg, rgba(255,255,255,.05) 25%, rgba(255,255,255,.14) 50%, rgba(255,255,255,.05) 75%);
  background-size: 200% 100%;
  animation: pl-skel 1.6s ease-in-out infinite;
}
.pl-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.3), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.pl-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
.pl-scroll::-webkit-scrollbar { height: 0; }
@media (prefers-reduced-motion: reduce) {
  .pl-orb, .pl-rise, .pl-pop, .pl-bar, .pl-skel { animation: none !important; }
  .pl-shine::before { transition: none; }
}
`;

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="pl-grid absolute inset-0" />
      <div className="pl-orb absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-[#22D3EE]/20 blur-[120px]" />
      <div className="pl-orb absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-[120px]" style={{ animationDelay: '-5s' }} />
      <div className="pl-orb absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-600/15 blur-[120px]" style={{ animationDelay: '-9s' }} />
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <span aria-hidden className={`pl-skel block rounded-lg ${className}`} />;
}

export default function Planner() {
  const { user } = useAuth();
  const storageKey = `pdt-study-planner-${user?.id || 'guest'}`;

  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    subject: '',
    date: today(),
    priority: 'Medium',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setTasks(saved ? JSON.parse(saved) : []);
    } catch {
      setTasks([]);
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    }
  }, [tasks, loaded, storageKey]);

  const addTask = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setTasks((current) => [
      {
        id: crypto.randomUUID(),
        title: form.title.trim(),
        subject: form.subject.trim() || 'General study',
        date: form.date,
        priority: form.priority,
        completed: false,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);

    setForm({
      title: '',
      subject: '',
      date: today(),
      priority: 'Medium',
    });
    setShowForm(false);
  };

  const toggleTask = (id) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const filteredTasks = useMemo(() => {
    const currentDay = today();

    return [...tasks]
      .filter((task) => {
        if (filter === 'Today') return task.date === currentDay;
        if (filter === 'Upcoming') return task.date > currentDay;
        if (filter === 'Completed') return task.completed;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [tasks, filter]);

  const formatDate = (value) => {
    if (value === today()) return 'Today';
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="pl-root relative min-h-screen overflow-x-hidden bg-[#060B16] text-white">
      <style>{styles}</style>
      <Backdrop />

      <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8">

        {/* HEADER */}
        <div className="pl-rise flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/20 bg-[#22D3EE]/10 px-3 py-1 text-xs font-medium text-[#67E8F9]">
              <CalendarDays size={13} />
              Study organisation
            </p>
            <h1 className="bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              Study planner
            </h1>
            <p className="mt-3 max-w-md text-slate-300">
              Organise your study sessions and stay on track.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className={`${btnPrimary} inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm`}
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Close' : 'Add task'}
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={ListTodo} label="Total tasks" value={tasks.length} loading={!loaded} accent="cyan" delay={40} />
          <StatCard icon={Clock} label="Pending" value={pending} loading={!loaded} accent="amber" delay={100} />
          <StatCard icon={Check} label="Completed" value={completed} loading={!loaded} accent="emerald" delay={160} />
          <StatCard icon={Target} label="Progress" value={`${progress}%`} loading={!loaded} accent="violet" delay={220} />
        </div>

        {/* PROGRESS */}
        <section
          className="pl-rise rounded-3xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-px"
          style={{ animationDelay: '240ms' }}
        >
          <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">Your progress</h2>
                <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                  {completed} of {tasks.length} tasks completed
                </p>
              </div>
              <span className="bg-gradient-to-r from-[#22D3EE] to-violet-400 bg-clip-text text-3xl font-bold tabular-nums text-transparent">
                {progress}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/[0.07]">
              {loaded && (
                <div
                  className="pl-bar h-full rounded-full shadow-[0_0_16px_rgba(34,211,238,0.5)]"
                  style={{
                    width: `${progress}%`,
                    minWidth: progress > 0 ? '8px' : '0px',
                    background: 'linear-gradient(90deg, #22D3EE 0%, #3B82F6 55%, #A855F7 100%)',
                  }}
                />
              )}
            </div>
          </div>
        </section>

        {/* FORM */}
        {showForm && (
          <form
            onSubmit={addTask}
            className="pl-pop rounded-3xl bg-gradient-to-br from-[#22D3EE]/40 via-white/5 to-violet-500/30 p-px"
          >
            <div className={`${glass} space-y-5 rounded-3xl bg-[#0B1220]/80 p-5 sm:p-7`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Create a study task</h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Task title">
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Revise computer networks"
                    className={inputStyle}
                  />
                </Field>

                <Field label="Subject">
                  <input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="e.g. Networking"
                    className={inputStyle}
                  />
                </Field>

                <Field label="Study date">
                  <input
                    type="date"
                    min={today()}
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={inputStyle}
                  />
                </Field>

                <Field label="Priority">
                  <div className="relative">
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className={`${inputStyle} appearance-none pr-10`}
                    >
                      <option className={optionClass}>High</option>
                      <option className={optionClass}>Medium</option>
                      <option className={optionClass}>Low</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </Field>
              </div>

              <button
                type="submit"
                className={`${btnPrimary} w-full px-6 py-3 text-sm sm:w-auto`}
              >
                Save task
              </button>
            </div>
          </form>
        )}

        {/* TASKS */}
        <section>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Your tasks</h2>
              <p className="mt-1 text-sm text-slate-400">
                Keep your learning organised.
              </p>
            </div>

            <div className="pl-scroll flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
              {['All', 'Today', 'Upcoming', 'Completed'].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    filter === item
                      ? 'bg-gradient-to-r from-[#22D3EE] to-sky-500 text-[#04101A] shadow-lg shadow-[#22D3EE]/20'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {!loaded ? (
              <div className="space-y-3" aria-busy="true" aria-label="Loading your tasks">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`${glass} flex items-start gap-3 rounded-2xl p-4`}>
                    <Skeleton className="mt-1 h-5 w-5 !rounded-md" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-2/3" />
                      <div className="mt-3 flex gap-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-14 !rounded-lg" />
                  </div>
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className={`${glass} pl-pop rounded-3xl px-5 py-16 text-center`}>
                <div className="relative mx-auto mb-5 h-16 w-16">
                  <div className="absolute inset-0 rounded-full bg-[#22D3EE]/30 blur-xl" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#22D3EE]/20 bg-[#22D3EE]/10 text-[#67E8F9]">
                    <BookOpen size={26} />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white">Nothing here yet</h3>
                <p className="mt-2 text-sm text-slate-300">
                  {filter === 'All'
                    ? 'Add your first study task to get started.'
                    : `No ${filter.toLowerCase()} tasks found.`}
                </p>
                {filter === 'All' && (
                  <button
                    onClick={() => setShowForm(true)}
                    className={`${btnPrimary} mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm`}
                  >
                    <Plus size={17} />
                    Create your first task
                  </button>
                )}
              </div>
            ) : (
              filteredTasks.map((task, i) => {
                const level = priorities[task.priority] || priorities.Medium;

                return (
                  <article
                    key={task.id}
                    style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                    className={`pl-rise group relative rounded-2xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-px transition-all duration-300 ${
                      task.completed ? 'opacity-60' : 'hover:-translate-y-0.5'
                    }`}
                  >
                    <div className={`${glass} relative flex items-start gap-3 overflow-hidden rounded-2xl p-4 pl-5 transition-colors group-hover:bg-white/[0.07]`}>
                      <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${task.completed ? 'bg-slate-600' : level.stripe}`} />

                      <button
                        onClick={() => toggleTask(task.id)}
                        aria-label={task.completed ? 'Mark as pending' : 'Mark as completed'}
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all ${
                          task.completed
                            ? 'border-transparent bg-gradient-to-br from-[#22D3EE] to-violet-500 text-white shadow-lg shadow-[#22D3EE]/30'
                            : 'border-slate-500 hover:border-[#22D3EE] hover:bg-[#22D3EE]/10'
                        }`}
                      >
                        {task.completed && <Check size={14} strokeWidth={3} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <h3 className={`break-words text-sm font-semibold sm:text-base ${
                          task.completed ? 'text-slate-400 line-through' : 'text-white'
                        }`}>
                          {task.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-slate-200">
                            {task.subject}
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <CalendarDays size={13} />
                            {formatDate(task.date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-3">
                        <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${level.pill}`}>
                          {task.priority}
                        </span>
                        <button
                          onClick={() => deleteTask(task.id)}
                          aria-label="Delete task"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <p className="text-center text-xs text-slate-400">
          Small, consistent study sessions build lasting progress.
        </p>
      </div>
    </div>
  );
}

const STAT_ACCENTS = {
  cyan: { tile: 'border-[#22D3EE]/25 bg-[#22D3EE]/10 text-[#67E8F9]', glow: 'bg-[#22D3EE]/30' },
  amber: { tile: 'border-amber-400/25 bg-amber-400/10 text-amber-300', glow: 'bg-amber-400/25' },
  emerald: { tile: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300', glow: 'bg-emerald-400/25' },
  violet: { tile: 'border-violet-400/25 bg-violet-400/10 text-violet-300', glow: 'bg-violet-400/30' },
};

function StatCard({ icon: Icon, label, value, loading, accent = 'cyan', delay = 0 }) {
  const a = STAT_ACCENTS[accent];

  return (
    <div
      className="pl-rise rounded-2xl bg-gradient-to-br from-white/15 to-white/0 p-px"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`${glass} relative h-full overflow-hidden rounded-2xl p-4 sm:p-5`}>
        <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${a.glow}`} />

        <div className={`relative mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${a.tile}`}>
          <Icon size={18} />
        </div>
        <p className="relative text-xs text-slate-300 sm:text-sm">{label}</p>
        <div className="relative mt-1 text-3xl font-bold tabular-nums text-white">
          {loading ? <Skeleton className="mt-2 h-8 w-12" /> : value}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      {children}
    </label>
  );
}