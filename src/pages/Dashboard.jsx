import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

import {
  BookOpen,
  FileText,
  Layers,
  ArrowUpRight,
  ChartNoAxesColumnIncreasing,
  BookMarked,
  GraduationCap,
  ChevronRight,
  LayoutGrid,
  ClipboardList,
  Target,
  Sparkles,
} from 'lucide-react';

const initialStats = {
  sessions: 0,
  notes: 0,
  cards: 0,
  quizzes: 0,
  attempts: 0,
  averageScore: 0,
};

/* ---------- local styles (self-contained, no extra files needed) ---------- */
const glass =
  'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white';

const RING = 339.292; // 2 * PI * 54

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.qz-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
.qz-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
}
@keyframes qz-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-24px,0) scale(1.08); } }
@keyframes qz-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes qz-ring { from { stroke-dashoffset: ${RING}; } }
@keyframes qz-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.qz-orb { animation: qz-float 14s ease-in-out infinite; }
.qz-rise { animation: qz-rise .55s cubic-bezier(.2,.7,.2,1) both; }
.qz-ring { animation: qz-ring 1.2s cubic-bezier(.2,.7,.2,1) both; }
.qz-bar { transform-origin: left; animation: qz-bar 1s cubic-bezier(.2,.7,.2,1) both; }
@media (prefers-reduced-motion: reduce) {
  .qz-orb, .qz-rise, .qz-ring, .qz-bar { animation: none !important; }
}
`;

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 qz-grid" />
      <div className="qz-orb absolute -top-40 -left-32 w-[34rem] h-[34rem] rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="qz-orb absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-violet-600/20 blur-[120px]" style={{ animationDelay: '-5s' }} />
      <div className="qz-orb absolute -bottom-48 left-1/3 w-[28rem] h-[28rem] rounded-full bg-blue-600/15 blur-[120px]" style={{ animationDelay: '-9s' }} />
    </div>
  );
}

// Counts up to a number when it first loads
function CountUp({ value, suffix = '' }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) {
      setShown(0);
      return;
    }

    let frame;
    const start = performance.now();
    const duration = 900;

    const tick = now => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{shown}{suffix}</>;
}

function StatCard({ label, value, icon: Icon, loading, accent, delay = 0 }) {
  return (
    <div
      className="qz-rise rounded-2xl bg-gradient-to-br from-white/15 to-white/0 p-px"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`${glass} relative h-full overflow-hidden rounded-2xl p-3.5 sm:p-5`}>
        <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl ${accent.glow}`} />

        <div className="relative flex items-center justify-between gap-2">
          <span className="text-xs text-slate-300 sm:text-sm">{label}</span>
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${accent.tile}`}>
            <Icon size={17} strokeWidth={1.8} />
          </span>
        </div>

        <div className="relative mt-4 text-3xl font-bold tabular-nums text-white sm:text-4xl">
          {loading ? (
            <span className="inline-block h-9 w-12 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <CountUp value={value} />
          )}
        </div>
      </div>
    </div>
  );
}

const ACCENTS = {
  cyan: {
    glow: 'bg-cyan-400/30',
    tile: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
    edge: 'hover:from-cyan-400/50',
  },
  violet: {
    glow: 'bg-violet-400/30',
    tile: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
    edge: 'hover:from-violet-400/50',
  },
  amber: {
    glow: 'bg-amber-400/25',
    tile: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    edge: 'hover:from-amber-400/50',
  },
  emerald: {
    glow: 'bg-emerald-400/25',
    tile: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    edge: 'hover:from-emerald-400/50',
  },
};

function ResourceLink({ to, icon: Icon, title, subtitle, accent, delay = 0 }) {
  return (
    <Link
      to={to}
      style={{ animationDelay: `${delay}ms` }}
      className={`qz-rise group rounded-2xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-px transition-all duration-300 hover:-translate-y-1 ${accent.edge}`}
    >
      <div className={`${glass} flex h-full items-center gap-4 rounded-2xl p-4 transition-colors group-hover:bg-white/[0.07]`}>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${accent.tile}`}>
          <Icon size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white sm:text-base">{title}</h3>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">{subtitle}</p>
        </div>

        <ChevronRight
          size={18}
          className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-white"
        />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { profile, user } = useAuth();

  const [stats, setStats] = useState(initialStats);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchDashboardData() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatsError(false);

      try {
        const [
          sessionsRes,
          notesRes,
          cardsRes,
          subjectsRes,
          quizzesRes,
          attemptsRes,
        ] = await Promise.all([
          supabase
            .from('tutor_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),

          supabase
            .from('study_notes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),

          supabase
            .from('flashcards')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),

          supabase
            .from('subjects')
            .select('id, name, color')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),

          supabase
            .from('study_quizzes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),

          supabase
            .from('study_quiz_attempts')
            .select('score, total_questions')
            .eq('user_id', user.id),
        ]);

        if (!active) return;

        const errors = [
          sessionsRes.error,
          notesRes.error,
          cardsRes.error,
          subjectsRes.error,
          quizzesRes.error,
          attemptsRes.error,
        ];

        setStatsError(errors.some(Boolean));

        const attempts = attemptsRes.data || [];

        const averageScore = attempts.length
          ? Math.round(
              attempts.reduce(
                (sum, attempt) =>
                  sum +
                  (attempt.score /
                    Math.max(attempt.total_questions || 1, 1)) *
                    100,
                0
              ) / attempts.length
            )
          : 0;

        setStats({
          sessions: sessionsRes.count ?? 0,
          notes: notesRes.count ?? 0,
          cards: cardsRes.count ?? 0,
          quizzes: quizzesRes.count ?? 0,
          attempts: attempts.length,
          averageScore,
        });

        setSubjects(subjectsRes.data || []);
      } catch (error) {
        console.error('Dashboard statistics error:', error);

        if (active) setStatsError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const studentName = profile?.full_name || 'Student';
  const score = Math.min(stats.averageScore, 100);

  return (
    <div className="qz-root relative min-h-screen overflow-x-hidden bg-[#060B16] text-white">
      <style>{styles}</style>
      <Backdrop />

      <main className="relative z-10 mx-auto w-full max-w-5xl space-y-9 px-4 py-6 pb-12 sm:px-6 sm:py-10">

        {/* PAGE HEADER */}
        <section className="qz-rise relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 backdrop-blur-xl sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-400/30 to-violet-500/30 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                <Sparkles size={13} />
                Student overview
              </p>

              <h1 className="mt-4 bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl">
                Welcome back, {studentName}
              </h1>

              <p className="mt-3 text-slate-300">
                Your personal learning workspace.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-slate-200">
              <GraduationCap size={18} className="text-cyan-300" />
              <span>My Learning</span>
            </div>
          </div>
        </section>

        {/* LEARNING ACTIVITY */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Learning activity
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Your recorded activity on PDT Study.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <StatCard
              label="Sessions"
              value={stats.sessions}
              icon={BookOpen}
              loading={loading}
              accent={ACCENTS.cyan}
              delay={60}
            />

            <StatCard
              label="Notes"
              value={stats.notes}
              icon={FileText}
              loading={loading}
              accent={ACCENTS.violet}
              delay={120}
            />

            <StatCard
              label="Flashcards"
              value={stats.cards}
              icon={Layers}
              loading={loading}
              accent={ACCENTS.amber}
              delay={180}
            />
          </div>

          {statsError && (
            <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3.5 py-2.5 text-xs text-amber-300">
              Some statistics could not be loaded. Please try again later.
            </p>
          )}
        </section>

        {/* ACADEMIC PROGRESS */}
        <section className="qz-rise rounded-3xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-px" style={{ animationDelay: '200ms' }}>
          <div className={`${glass} rounded-3xl p-5 sm:p-7`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-cyan-400/40 blur-md" />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500">
                    <ChartNoAxesColumnIncreasing size={20} className="text-white" />
                  </div>
                </div>

                <div>
                  <h2 className="text-base font-semibold text-white">
                    Academic progress
                  </h2>
                  <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                    Based on your completed quiz attempts.
                  </p>
                </div>
              </div>

              <Link
                to="/quizzes"
                className="group flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Quizzes
                <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="mt-7 grid items-center gap-6 border-t border-white/10 pt-6 sm:grid-cols-[auto_1fr]">

              {/* score ring */}
              <div className="relative mx-auto h-36 w-36">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <defs>
                    <linearGradient id="dash-ring" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  {!loading && stats.attempts > 0 && (
                    <circle
                      className="qz-ring"
                      cx="60" cy="60" r="54" fill="none"
                      stroke="url(#dash-ring)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={RING}
                      strokeDashoffset={RING * (1 - score / 100)}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-4xl font-bold tabular-nums text-white">
                    {loading
                      ? '—'
                      : stats.attempts
                        ? <><CountUp value={stats.averageScore} /><span className="text-xl text-slate-300">%</span></>
                        : '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">Average score</p>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs text-slate-300">Saved quizzes</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-white">
                      {loading ? '—' : stats.quizzes}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs text-slate-300">Completed attempts</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-white">
                      {loading ? '—' : stats.attempts}
                    </p>
                  </div>
                </div>

                {!loading && stats.attempts > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="text-slate-300">Average quiz performance</span>
                      <span className="font-semibold text-white">{stats.averageScore}%</span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="qz-bar h-full rounded-full shadow-[0_0_14px_rgba(34,211,238,0.5)]"
                        style={{
                          width: `${score}%`,
                          background: 'linear-gradient(90deg, #22D3EE 0%, #3B82F6 55%, #A855F7 100%)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {!loading && stats.attempts === 0 && (
                  <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                    Complete your first quiz to start tracking your assessment performance.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* MY SUBJECTS */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LayoutGrid size={19} className="text-cyan-300" />
                <h2 className="text-lg font-semibold text-white">
                  My subjects
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-400">
                Your learning areas.
              </p>
            </div>

            <Link
              to="/subjects"
              className="group flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              View all
              <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
                />
              ))}
            </div>
          ) : subjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {subjects.slice(0, 4).map((subject, i) => {
                const color = subject.color || '#22D3EE';

                return (
                  <Link
                    key={subject.id}
                    to={`/subjects/${subject.id}`}
                    style={{ animationDelay: `${i * 70}ms` }}
                    className="qz-rise group relative overflow-hidden rounded-2xl border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-white/25"
                  >
                    <div
                      className="absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-60"
                      style={{ backgroundColor: color }}
                    />

                    <div className={`${glass} relative flex items-center gap-4 border-0 p-4 transition-colors group-hover:bg-white/[0.07]`}>
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${color}25`,
                          boxShadow: `inset 0 0 0 1px ${color}40`,
                        }}
                      >
                        <BookMarked size={21} style={{ color }} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-white sm:text-base">
                          {subject.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-300">
                          Open subject
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-white"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/20 bg-white/[0.03] px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <BookMarked size={25} strokeWidth={1.5} className="text-cyan-300" />
              </div>

              <h3 className="mt-4 text-base font-semibold text-white">
                No subjects available
              </h3>

              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-300">
                Add subjects to your learning workspace to see them here.
              </p>

              <Link
                to="/subjects"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-400/40"
              >
                Manage subjects
                <ChevronRight size={15} />
              </Link>
            </div>
          )}
        </section>

        {/* STUDY TOOLS */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Study resources
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Your personal learning resources.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ResourceLink
              to="/notes"
              icon={FileText}
              title="Study Notes"
              subtitle={loading ? 'Loading...' : `${stats.notes} saved notes`}
              accent={ACCENTS.cyan}
              delay={0}
            />

            <ResourceLink
              to="/flashcards"
              icon={Layers}
              title="Flashcards"
              subtitle={loading ? 'Loading...' : `${stats.cards} saved flashcards`}
              accent={ACCENTS.violet}
              delay={70}
            />

            <ResourceLink
              to="/quizzes"
              icon={ClipboardList}
              title="Quizzes"
              subtitle={loading ? 'Loading...' : `${stats.quizzes} saved quizzes`}
              accent={ACCENTS.amber}
              delay={140}
            />

            <ResourceLink
              to="/planner"
              icon={Target}
              title="Study Planner"
              subtitle="Organise your learning tasks."
              accent={ACCENTS.emerald}
              delay={210}
            />
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/10 pt-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">PDT Study</span>
            <span>Learn. Practice. Excel.</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
