
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Plus, Trash2, Loader2,
  AlertCircle, X, ChevronRight
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function SubjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();

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
    if (!window.confirm('Delete this topic?')) return;

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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#22D3EE]" size={28} />
      </div>
    );
  }

  if (!subject) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link to="/subjects" className="text-sm text-[#22D3EE]">
          <ArrowLeft size={16} className="inline mr-2" />
          Back to subjects
        </Link>
        <p className="mt-6 text-sm text-[#94A3B8]">
          {error || 'Subject unavailable.'}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-7 px-4 py-5 pb-10 sm:px-6 sm:py-8">
      <Link to="/subjects" className="inline-flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white">
        <ArrowLeft size={16} />
        Back to subjects
      </Link>

      <section className="rounded-xl border border-[#263244] bg-[#111B2B] p-6">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `${subject.color || '#22D3EE'}20`,
              color: subject.color || '#22D3EE'
            }}
          >
            <BookOpen size={24} />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-[#94A3B8]">
              Subject workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {subject.name}
            </h1>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Topics</h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#22D3EE] px-4 py-2.5 text-sm font-semibold text-[#080F1C] hover:bg-[#67E8F9]"
          >
            <Plus size={17} /> Add topic
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle size={16} className="mr-2 inline" />
            {error}
          </div>
        )}

        {topics.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#263244] bg-[#111B2B]/50 px-5 py-12 text-center">
            <BookOpen className="mx-auto text-[#64748B]" size={30} />
            <h3 className="mt-4 font-medium text-white">No topics yet</h3>
            <p className="mt-2 text-sm text-[#94A3B8]">
              Add your first topic to organise this subject.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 text-sm font-semibold text-[#22D3EE]"
            >
              Add your first topic
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((topic, index) => (
              <div
                key={topic.id}
                className="flex items-center gap-3 rounded-xl border border-[#263244] bg-[#111B2B] p-4"
              >
                <Link
                  to={`/topics/${topic.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B1422] text-sm font-semibold text-[#22D3EE]">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-white">{topic.name}</p>
                    <p className="mt-1 text-xs text-[#64748B]">Open learning workspace</p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-[#64748B]" />
                </Link>

                <button
                  onClick={() => handleDeleteTopic(topic.id)}
                  disabled={deleting === topic.id}
                  aria-label={`Delete ${topic.name}`}
                  className="rounded-lg p-2 text-[#64748B] hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                >
                  {deleting === topic.id
                    ? <Loader2 size={17} className="animate-spin" />
                    : <Trash2 size={17} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-[#263244] bg-[#111B2B] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Add a topic</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setTopicName('');
                }}
                className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#263244]"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleAddTopic}>
              <label className="mb-2 block text-sm font-medium text-[#CBD5E1]">
                Topic name
              </label>
              <input
                value={topicName}
                onChange={e => setTopicName(e.target.value)}
                placeholder="e.g. Introduction to Algebra"
                maxLength={100}
                required
                autoFocus
                className="w-full rounded-lg border border-[#263244] bg-[#0B1422] px-4 py-3 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-[#22D3EE]"
              />

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setTopicName('');
                  }}
                  className="rounded-lg border border-[#263244] px-4 py-2.5 text-sm text-[#CBD5E1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !topicName.trim()}
                  className="rounded-lg bg-[#22D3EE] px-4 py-2.5 text-sm font-semibold text-[#080F1C] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
