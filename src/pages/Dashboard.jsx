
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
} from 'lucide-react';

const initialStats = {
  sessions: 0,
  notes: 0,
  cards: 0,
  quizzes: 0,
  attempts: 0,
  averageScore: 0,
};

function StatCard({ label, value, icon: Icon, loading }) {
  return (
    <div className="rounded-lg border border-[#263244] bg-[#111B2B] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <Icon size={19} className="text-[#22D3EE]" strokeWidth={1.7} />
      </div>

      <div className="mt-4 text-2xl font-semibold text-white">
        {loading ? (
          <span className="inline-block h-7 w-10 animate-pulse rounded bg-[#263244]" />
        ) : (
          value
        )}
      </div>
    </div>
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

  return (
    <main className="mx-auto w-full max-w-5xl space-y-7 px-4 py-5 pb-10 sm:px-6 sm:py-8">

      {/* PAGE HEADER */}
      <section className="flex flex-col gap-3 border-b border-[#263244] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#22D3EE]">
            Student Overview
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Welcome back, {studentName}
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Your personal learning workspace.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <GraduationCap size={18} />
          <span>My Learning</span>
        </div>
      </section>

      {/* LEARNING ACTIVITY */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">
            Learning Activity
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Your recorded activity on PDT Study.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <StatCard
            label="Sessions"
            value={stats.sessions}
            icon={BookOpen}
            loading={loading}
          />

          <StatCard
            label="Notes"
            value={stats.notes}
            icon={FileText}
            loading={loading}
          />

          <StatCard
            label="Flashcards"
            value={stats.cards}
            icon={Layers}
            loading={loading}
          />
        </div>

        {statsError && (
          <p className="mt-3 text-xs text-amber-400">
            Some statistics could not be loaded. Please try again later.
          </p>
        )}
      </section>

      {/* ACADEMIC PROGRESS */}
      <section className="rounded-lg border border-[#263244] bg-[#111B2B] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#22D3EE]/10">
              <ChartNoAxesColumnIncreasing
                size={20}
                className="text-[#22D3EE]"
              />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-white">
                Academic Progress
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Based on your completed quiz attempts.
              </p>
            </div>
          </div>

          <Link
            to="/quizzes"
            className="flex items-center gap-1 text-xs font-medium text-[#22D3EE] transition-colors hover:text-white"
          >
            Quizzes
            <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#263244] pt-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">Saved quizzes</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {loading ? '—' : stats.quizzes}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Completed attempts</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {loading ? '—' : stats.attempts}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-400">Average score</p>
            <p className="mt-2 text-2xl font-semibold text-[#22D3EE]">
              {loading
                ? '—'
                : stats.attempts
                  ? `${stats.averageScore}%`
                  : '—'}
            </p>
          </div>
        </div>

        {!loading && stats.attempts > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-slate-400">Average quiz performance</span>
              <span className="text-white">{stats.averageScore}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#263244]">
              <div
                className="h-full rounded-full bg-[#22D3EE] transition-all duration-500"
                style={{
                  width: `${Math.min(stats.averageScore, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {!loading && stats.attempts === 0 && (
          <p className="mt-5 border-t border-[#263244] pt-4 text-xs text-slate-400">
            Complete your first quiz to start tracking your assessment performance.
          </p>
        )}
      </section>

      {/* MY SUBJECTS */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <LayoutGrid size={18} className="text-[#22D3EE]" />
              <h2 className="text-base font-semibold text-white">
                My Subjects
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Your learning areas.
            </p>
          </div>

          <Link
            to="/subjects"
            className="flex items-center gap-1 text-xs font-medium text-[#22D3EE] hover:text-white"
          >
            View all
            <ChevronRight size={15} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-lg border border-[#263244] bg-[#111B2B]"
              />
            ))}
          </div>
        ) : subjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subjects.slice(0, 4).map((subject) => (
              <Link
                key={subject.id}
                to={`/subjects/${subject.id}`}
                className="flex items-center gap-3 rounded-lg border border-[#263244] bg-[#111B2B] p-4 transition-colors hover:border-[#22D3EE]/50"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: `${subject.color || '#22D3EE'}20`,
                  }}
                >
                  <BookMarked
                    size={19}
                    style={{ color: subject.color || '#22D3EE' }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-white">
                    {subject.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Open subject
                  </p>
                </div>

                <ChevronRight size={17} className="text-slate-500" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#334155] bg-[#111B2B]/50 px-5 py-10 text-center">
            <BookMarked
              size={27}
              strokeWidth={1.5}
              className="mx-auto text-slate-500"
            />

            <h3 className="mt-4 text-sm font-medium text-white">
              No subjects available
            </h3>

            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-400">
              Add subjects to your learning workspace to see them here.
            </p>

            <Link
              to="/subjects"
              className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#22D3EE] hover:text-white"
            >
              Manage subjects
              <ChevronRight size={14} />
            </Link>
          </div>
        )}
      </section>

      {/* STUDY TOOLS */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-white">
            Study Resources
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Your personal learning resources.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          <Link
            to="/notes"
            className="flex items-center gap-4 rounded-lg border border-[#263244] bg-[#111B2B] p-4 transition-colors hover:border-[#22D3EE]/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#22D3EE]/10">
              <FileText size={19} className="text-[#22D3EE]" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-white">
                Study Notes
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {loading ? 'Loading...' : `${stats.notes} saved notes`}
              </p>
            </div>

            <ChevronRight size={17} className="text-slate-500" />
          </Link>

          <Link
            to="/flashcards"
            className="flex items-center gap-4 rounded-lg border border-[#263244] bg-[#111B2B] p-4 transition-colors hover:border-[#22D3EE]/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#22D3EE]/10">
              <Layers size={19} className="text-[#22D3EE]" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-white">
                Flashcards
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {loading ? 'Loading...' : `${stats.cards} saved flashcards`}
              </p>
            </div>

            <ChevronRight size={17} className="text-slate-500" />
          </Link>

          <Link
            to="/quizzes"
            className="flex items-center gap-4 rounded-lg border border-[#263244] bg-[#111B2B] p-4 transition-colors hover:border-[#22D3EE]/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#22D3EE]/10">
              <ClipboardList size={19} className="text-[#22D3EE]" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-white">
                Quizzes
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {loading ? 'Loading...' : `${stats.quizzes} saved quizzes`}
              </p>
            </div>

            <ChevronRight size={17} className="text-slate-500" />
          </Link>

          <Link
            to="/planner"
            className="flex items-center gap-4 rounded-lg border border-[#263244] bg-[#111B2B] p-4 transition-colors hover:border-[#22D3EE]/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#22D3EE]/10">
              <Target size={19} className="text-[#22D3EE]" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-white">
                Study Planner
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Organise your learning tasks.
              </p>
            </div>

            <ChevronRight size={17} className="text-slate-500" />
          </Link>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#263244] pt-5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>PDT Study</span>
          <span>Learn. Practice. Excel.</span>
        </div>
      </footer>

    </main>
  );
}
