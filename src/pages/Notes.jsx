
import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  FileText,
  BookOpen,
  Trash2,
  Save,
  X,
  Loader2,
  ArrowLeft,
  NotebookPen,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Notes() {
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  const [selectedNote, setSelectedNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');

  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError('');

    const [notesResult, subjectsResult, topicsResult] = await Promise.all([
      supabase
        .from('study_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),

      supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name'),

      supabase
        .from('topics')
        .select('id, name, subject_id')
        .eq('user_id', user.id)
        .order('name'),
    ]);

    if (notesResult.error) setError(notesResult.error.message);
    else setNotes(notesResult.data || []);

    if (subjectsResult.error) setError(subjectsResult.error.message);
    else setSubjects(subjectsResult.data || []);

    if (topicsResult.error) setError(topicsResult.error.message);
    else setTopics(topicsResult.data || []);

    setLoading(false);
  }

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        (note.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (note.content || '').toLowerCase().includes(search.toLowerCase());

      const matchesSubject =
        filterSubject === 'all' || note.subject_id === filterSubject;

      return matchesSearch && matchesSubject;
    });
  }, [notes, search, filterSubject]);

  const availableTopics = topics.filter(
    (topic) => topic.subject_id === subjectId
  );

  function createNote() {
    setSelectedNote(null);
    setTitle('');
    setContent('');
    setSubjectId('');
    setTopicId('');
    setError('');
    setShowEditor(true);
  }

  function openNote(note) {
    setSelectedNote(note);
    setTitle(note.title || '');
    setContent(note.content || '');
    setSubjectId(note.subject_id || '');
    setTopicId(note.topic_id || '');
    setError('');
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setSelectedNote(null);
    setError('');
  }

  async function saveNote() {
    if (!title.trim() && !content.trim()) {
      setError('Write something before saving your note.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      user_id: user.id,
      title: title.trim() || 'Untitled note',
      content,
      subject_id: subjectId || null,
      topic_id: topicId || null,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (selectedNote) {
      result = await supabase
        .from('study_notes')
        .update(payload)
        .eq('id', selectedNote.id)
        .eq('user_id', user.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('study_notes')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    const savedNote = result.data;

    setNotes((previous) => {
      const updated = previous.filter((note) => note.id !== savedNote.id);
      return [savedNote, ...updated];
    });

    setSelectedNote(savedNote);
    setTitle(savedNote.title);
    setSaving(false);
    setShowEditor(false);
  }

  async function deleteNote() {
    if (!selectedNote) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this note?'
    );

    if (!confirmed) return;

    setDeleting(true);
    setError('');

    const { error: deleteError } = await supabase
      .from('study_notes')
      .delete()
      .eq('id', selectedNote.id)
      .eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setNotes((previous) =>
      previous.filter((note) => note.id !== selectedNote.id)
    );

    setDeleting(false);
    closeEditor();
  }

  function getSubjectName(id) {
    return subjects.find((subject) => subject.id === id)?.name || 'General';
  }

  function getTopicName(id) {
    return topics.find((topic) => topic.id === id)?.name || '';
  }

  function formatDate(date) {
    if (!date) return '';

    return new Date(date).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={20} />
        Loading your notes...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-cyan-400">
            <NotebookPen size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Learning resources
            </span>
          </div>

          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            My Notes
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Create, organise and keep your study notes in one place.
          </p>
        </div>

        <button
          onClick={createNote}
          className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          <Plus size={18} />
          Create note
        </button>
      </div>

      {error && !showEditor && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="flex items-center gap-3 rounded-lg border border-[#263244] bg-[#111B2B] px-4">
          <Search size={18} className="shrink-0 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your notes..."
            className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search">
              <X size={17} className="text-slate-400" />
            </button>
          )}
        </div>

        <select
          value={filterSubject}
          onChange={(event) => setFilterSubject(event.target.value)}
          className="h-12 rounded-lg border border-[#263244] bg-[#111B2B] px-3 text-sm text-slate-300 outline-none focus:border-cyan-500"
        >
          <option value="all">All subjects</option>
          <option value="">General notes</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
        </p>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#334155] bg-[#111B2B]/50 px-5 text-center">
          <div className="mb-4 rounded-xl bg-[#1E293B] p-4 text-cyan-400">
            <FileText size={28} />
          </div>

          <h2 className="text-lg font-semibold text-white">
            {search || filterSubject !== 'all'
              ? 'No matching notes'
              : 'Your notebook is empty'}
          </h2>

          <p className="mt-2 max-w-sm text-sm text-slate-400">
            {search || filterSubject !== 'all'
              ? 'Try changing your search or subject filter.'
              : 'Create your first note and start organising your learning.'}
          </p>

          {!search && filterSubject === 'all' && (
            <button
              onClick={createNote}
              className="mt-5 flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300"
            >
              <Plus size={17} />
              Create your first note
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => openNote(note)}
              className="group flex min-h-[190px] flex-col rounded-xl border border-[#263244] bg-[#111B2B] p-5 text-left transition hover:border-cyan-500/50 hover:bg-[#152236]"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-lg bg-[#1E293B] p-2.5 text-cyan-400">
                  <FileText size={19} />
                </div>

                <span className="text-xs text-slate-500">
                  {formatDate(note.updated_at || note.created_at)}
                </span>
              </div>

              <h3 className="mb-2 line-clamp-1 font-semibold text-white">
                {note.title || 'Untitled note'}
              </h3>

              <p className="line-clamp-3 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                {note.content || 'No content yet.'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#263244] pt-3">
                <BookOpen size={14} className="text-cyan-400" />
                <span className="text-xs text-slate-400">
                  {getSubjectName(note.subject_id)}
                </span>

                {note.topic_id && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs text-slate-500">
                      {getTopicName(note.topic_id)}
                    </span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-0 backdrop-blur-sm sm:p-5">
          <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-[#080F1C] sm:h-[90vh] sm:rounded-xl sm:border sm:border-[#263244]">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#263244] px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeEditor}
                  className="rounded-lg p-2 text-slate-400 hover:bg-[#1E293B] hover:text-white"
                  aria-label="Close editor"
                >
                  <ArrowLeft size={20} />
                </button>

                <div>
                  <h2 className="font-semibold text-white">
                    {selectedNote ? 'Edit note' : 'New note'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your personal study notebook
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedNote && (
                  <button
                    onClick={deleteNote}
                    disabled={deleting}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    aria-label="Delete note"
                  >
                    {deleting ? (
                      <Loader2 size={19} className="animate-spin" />
                    ) : (
                      <Trash2 size={19} />
                    )}
                  </button>
                )}

                <button
                  onClick={closeEditor}
                  className="hidden rounded-lg p-2 text-slate-400 hover:bg-[#1E293B] hover:text-white sm:block"
                  aria-label="Close"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="grid gap-3 border-b border-[#263244] p-4 sm:grid-cols-2 sm:px-6">
              <select
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setTopicId('');
                }}
                className="h-11 rounded-lg border border-[#263244] bg-[#111B2B] px-3 text-sm text-slate-300 outline-none focus:border-cyan-500"
              >
                <option value="">General note — no subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>

              <select
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                disabled={!subjectId || availableTopics.length === 0}
                className="h-11 rounded-lg border border-[#263244] bg-[#111B2B] px-3 text-sm text-slate-300 outline-none focus:border-cyan-500 disabled:opacity-50"
              >
                <option value="">No specific topic</option>
                {availableTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Note title..."
                className="mb-5 w-full bg-transparent text-2xl font-bold text-white outline-none placeholder:text-slate-600 sm:text-3xl"
              />

              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Start writing your study notes..."
                className="min-h-[350px] w-full resize-none bg-transparent text-base leading-8 text-slate-300 outline-none placeholder:text-slate-600"
              />
            </div>

            {error && (
              <div className="mx-4 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 sm:mx-6">
                {error}
              </div>
            )}

            <div className="flex shrink-0 items-center justify-between border-t border-[#263244] bg-[#0B1422] px-4 py-4 sm:px-6">
              <span className="text-xs text-slate-500">
                {content.trim().split(/\s+/).filter(Boolean).length} words
              </span>

              <button
                onClick={saveNote}
                disabled={saving || deleting}
                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                {saving ? 'Saving...' : 'Save note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
