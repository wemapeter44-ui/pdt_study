
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
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

export default function Subjects() {
  const { user } = useAuth();

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
      setError(err.message || 'Unable to load your subjects.');
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
      setSuccess('Subject created successfully.');
    } catch (err) {
      setError(err.message || 'Unable to create subject.');
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
      setSuccess('Subject deleted successfully.');
    } catch (err) {
      setError(err.message || 'Unable to delete subject.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-10">

      {/* Page heading */}
      <div className="flex flex-col gap-4 border-b border-[#263244] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#22D3EE]">
            Learning workspace
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-white">
            My Subjects
          </h1>

          <p className="mt-2 text-sm text-[#94A3B8]">
            Organise your subjects and access their learning materials.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError('');
            setIsAdding(true);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#22D3EE] px-4 py-2.5 text-sm font-semibold text-[#08111F] transition hover:bg-[#67E8F9] sm:w-auto"
        >
          <Plus size={18} />
          Add subject
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {/* Add subject dialog */}
      {isAdding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !saving && setIsAdding(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-subject-title"
            className="w-full max-w-md rounded-lg border border-[#263244] bg-[#111B2B] p-5 sm:p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 id="add-subject-title" className="text-lg font-semibold text-white">
                  Add a subject
                </h2>
                <p className="mt-1 text-xs text-[#94A3B8]">
                  Enter the subject details below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAdding(false)}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-md p-2 text-[#94A3B8] hover:bg-[#263244] hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={addSubject} className="space-y-5">

              <div>
                <label className="mb-2 block text-sm font-medium text-[#D1D5DB]">
                  Subject name
                </label>

                <input
                  type="text"
                  autoFocus
                  required
                  maxLength={80}
                  placeholder="e.g. Mathematics"
                  className="w-full rounded-md border border-[#263244] bg-[#0B1422] px-3 py-3 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-[#22D3EE]"
                  value={newSubject.name}
                  onChange={e => setNewSubject(current => ({
                    ...current,
                    name: e.target.value
                  }))}
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-[#D1D5DB]">
                  Subject colour
                </label>

                <div className="flex flex-wrap gap-3">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Select colour ${color}`}
                      aria-pressed={newSubject.color === color}
                      onClick={() => setNewSubject(current => ({
                        ...current,
                        color
                      }))}
                      className={`h-8 w-8 rounded-full transition ${
                        newSubject.color === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111B2B]'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 border-t border-[#263244] pt-5">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  disabled={saving}
                  className="flex-1 rounded-md border border-[#334155] px-4 py-2.5 text-sm font-medium text-[#CBD5E1] hover:bg-[#263244]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !newSubject.name.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#22D3EE] px-4 py-2.5 text-sm font-semibold text-[#08111F] hover:bg-[#67E8F9] disabled:opacity-60"
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
      )}

      {/* Subject count */}
      {!loading && subjects.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#D1D5DB]">
            Your subjects
          </p>
          <span className="text-xs text-[#64748B]">
            {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
          </span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-[#94A3B8]">
          <Loader2 size={19} className="animate-spin" />
          Loading subjects...
        </div>
      ) : subjects.length === 0 ? (

        /* Empty state */
        <div className="rounded-lg border border-dashed border-[#334155] bg-[#111B2B]/40 px-5 py-14 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-[#263244] bg-[#111B2B]">
            <Book size={23} className="text-[#22D3EE]" />
          </div>

          <h3 className="font-semibold text-white">
            No subjects added
          </h3>

          <p className="mx-auto mt-2 max-w-sm text-sm text-[#94A3B8]">
            Start by adding a subject. You can organise your learning materials and topics under each subject.
          </p>

          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#22D3EE] px-5 py-2.5 text-sm font-semibold text-[#08111F] hover:bg-[#67E8F9]"
          >
            <Plus size={17} />
            Add your first subject
          </button>
        </div>

      ) : (

        /* Subjects list */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subjects.map(subject => (
            <div
              key={subject.id}
              className="group relative rounded-lg border border-[#263244] bg-[#111B2B] transition-colors hover:border-[#475569]"
            >
              <Link
                to={`/subjects/${subject.id}`}
                className="block rounded-lg p-4 pr-14 outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: `${subject.color || '#64748B'}18`,
                      color: subject.color || '#64748B'
                    }}
                  >
                    <Book size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {subject.name}
                    </h3>

                    <p className="mt-1 text-xs text-[#94A3B8]">
                      View learning materials
                    </p>
                  </div>

                  <ChevronRight
                    size={18}
                    className="shrink-0 text-[#64748B] transition group-hover:translate-x-1 group-hover:text-[#22D3EE]"
                  />
                </div>
              </Link>

              <button
                type="button"
                onClick={() => deleteSubject(subject.id)}
                disabled={deleting === subject.id || !!deleting}
                aria-label={`Delete ${subject.name}`}
                title="Delete subject"
                className="absolute right-3 top-4 rounded-md p-2 text-[#64748B] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
              >
                {deleting === subject.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
