
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Plus, Check, Trash2, Clock,
  BookOpen, Target, ListTodo, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const priorities = {
  High: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  Medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Low: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

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
    <div className="min-h-screen bg-[#080F1C] text-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-7">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-cyan-400">
              <CalendarDays size={17} />
              <span>STUDY ORGANISATION</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Study Planner
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Organise your study sessions and stay on track.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            <Plus size={18} />
            Add task
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={ListTodo} label="Total tasks" value={tasks.length} />
          <StatCard icon={Clock} label="Pending" value={pending} />
          <StatCard icon={Check} label="Completed" value={completed} />
          <StatCard icon={Target} label="Progress" value={`${progress}%`} />
        </div>

        <section className="rounded-2xl border border-[#263244] bg-[#111B2B] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Your progress</h2>
              <p className="mt-1 text-xs text-slate-400">
                {completed} of {tasks.length} tasks completed
              </p>
            </div>
            <span className="text-lg font-bold text-cyan-400">{progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#263244]">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {showForm && (
          <form
            onSubmit={addTask}
            className="space-y-4 rounded-2xl border border-cyan-400/20 bg-[#111B2B] p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Create a study task</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-slate-400 hover:text-white"
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
                  className="planner-input"
                />
              </Field>

              <Field label="Subject">
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Networking"
                  className="planner-input"
                />
              </Field>

              <Field label="Study date">
                <input
                  type="date"
                  min={today()}
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="planner-input"
                />
              </Field>

              <Field label="Priority">
                <div className="relative">
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="planner-input appearance-none"
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </Field>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 sm:w-auto"
            >
              Save task
            </button>
          </form>
        )}

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Your tasks</h2>
              <p className="mt-1 text-sm text-slate-400">
                Keep your learning organised.
              </p>
            </div>

            <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#263244] bg-[#111B2B] p-1">
              {['All', 'Today', 'Upcoming', 'Completed'].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${
                    filter === item
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#334155] bg-[#111B2B]/60 px-5 py-14 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
                  <BookOpen size={23} />
                </div>
                <h3 className="font-semibold">Nothing here yet</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {filter === 'All'
                    ? 'Add your first study task to get started.'
                    : `No ${filter.toLowerCase()} tasks found.`}
                </p>
                {filter === 'All' && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                  >
                    + Create your first task
                  </button>
                )}
              </div>
            ) : (
              filteredTasks.map((task) => (
                <article
                  key={task.id}
                  className={`flex items-start gap-3 rounded-2xl border border-[#263244] bg-[#111B2B] p-4 transition ${
                    task.completed ? 'opacity-65' : 'hover:border-slate-600'
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    aria-label={task.completed ? 'Mark as pending' : 'Mark as completed'}
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      task.completed
                        ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                        : 'border-slate-500 hover:border-cyan-400'
                    }`}
                  >
                    {task.completed && <Check size={14} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <h3 className={`break-words text-sm font-semibold ${
                      task.completed ? 'text-slate-400 line-through' : 'text-white'
                    }`}>
                      {task.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
                      <span>{task.subject}</span>
                      <span className="flex items-center gap-1">
                        <CalendarDays size={13} />
                        {formatDate(task.date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <span className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${priorities[task.priority] || priorities.Medium}`}>
                      {task.priority}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      aria-label="Delete task"
                      className="text-slate-500 transition hover:text-rose-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <p className="text-center text-xs text-slate-500">
          Small, consistent study sessions build lasting progress.
        </p>
      </div>

      <style>{`
        .planner-input {
          width: 100%;
          border: 1px solid #334155;
          border-radius: 10px;
          background: #0B1422;
          color: #F8FAFC;
          padding: 11px 12px;
          font-size: 14px;
          outline: none;
          color-scheme: dark;
        }
        .planner-input:focus {
          border-color: #22D3EE;
          box-shadow: 0 0 0 2px rgba(34,211,238,.10);
        }
        .planner-input::placeholder { color: #64748B; }
        .planner-input option { background: #111B2B; color: #F8FAFC; }
      `}</style>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[#263244] bg-[#111B2B] p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
        <Icon size={18} />
      </div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}
