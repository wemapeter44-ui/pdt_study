
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
  Clock3,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';

const initialStats = {
  sessions: 0,
  notes: 0,
  cards: 0,
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
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchStats() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatsError(false);

      try {
        const [sessionsRes, notesRes, cardsRes] = await Promise.all([
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
        ]);

        if (!active) return;

        const hasError =
          sessionsRes.error ||
          notesRes.error ||
          cardsRes.error;

        setStats({
          sessions: sessionsRes.count ?? 0,
          notes: notesRes.count ?? 0,
          cards: cardsRes.count ?? 0,
        });

        setStatsError(Boolean(hasError));
      } catch (error) {
        console.error('Dashboard statistics error:', error);

        if (active) setStatsError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchStats();

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

      {/* STATISTICS */}
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

      {/* PROGRESS */}
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
                Your learning performance.
              </p>
            </div>
          </div>

          <Link
            to="/progress"
            className="flex items-center gap-1 text-xs font-medium text-[#22D3EE] hover:text-white transition-colors"
          >
            Details
            <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="mt-6 border-t border-[#263244] pt-5">
          <p className="text-sm text-slate-400">
            Progress tracking will appear here as you complete learning
            activities and assessments.
          </p>
        </div>
      </section>

      {/* SUBJECTS */}
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
              Your enrolled learning areas.
            </p>
          </div>
        </div>

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
            Your subjects and learning materials will appear here once
            the subject management feature is connected.
          </p>
        </div>
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

          <div className="flex items-center gap-4 rounded-lg border border-[#263244] bg-[#111B2B] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#22D3EE]/10">
              <FileText size={19} className="text-[#22D3EE]" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-white">
                Study Notes
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Your saved academic notes.
              </p>
            </div>

            <ChevronRight size={17} className="text-slate-500" />
          </div>

          <div className="flex items-center gap-4 rounded-lg border border-[#263244] bg-[#111B2B] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#22D3EE]/10">
              <Layers size={19} className="text-[#22D3EE]" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-white">
                Flashcards
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Review and practise concepts.
              </p>
            </div>

            <ChevronRight size={17} className="text-slate-500" />
          </div>

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
