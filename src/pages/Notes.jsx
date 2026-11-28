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
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/* ---------- local styles (self-contained, no extra files needed) ---------- */
// Colours use exact hex values so they work even if the Tailwind cyan palette is customised.
const glass =
  'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white';

const inputStyle =
  'w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-[#22D3EE]/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#22D3EE]/10 disabled:opacity-50 [color-scheme:dark]';

const btnPrimary =
  'nt-shine relative overflow-hidden bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-[#22D3EE]/20 transition-all hover:shadow-[#22D3EE]/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0';

const optionClass = 'bg-[#0B1220] text-white';

// Each subject gets a consistent accent colour on its note cards
const ACCENTS = [
  { tile: 'border-[#22D3EE]/25 bg-[#22D3EE]/10 text-[#67E8F9]', edge: 'hover:from-[#22D3EE]/50', glow: 'bg-[#22D3EE]/30' },
  { tile: 'border-violet-400/25 bg-violet-400/10 text-violet-300', edge: 'hover:from-violet-400/50', glow: 'bg-violet-400/30' },
  { tile: 'border-amber-400/25 bg-amber-400/10 text-amber-300', edge: 'hover:from-amber-400/50', glow: 'bg-amber-400/25' },
  { tile: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300', edge: 'hover:from-emerald-400/50', glow: 'bg-emerald-400/25' },
  { tile: 'border-rose-400/25 bg-rose-400/10 text-rose-300', edge: 'hover:from-rose-400/50', glow: 'bg-rose-400/25' },
];

const GENERAL_ACCENT = {
  tile: 'border-white/15 bg-white/[0.06] text-slate-300',
  edge: 'hover:from-white/40',
  glow: 'bg-slate-400/20',
};

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.nt-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
.nt-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
}
@keyframes nt-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-24px,0) scale(1.08); } }
@keyframes nt-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes nt-pop { from { opacity: 0; transform: scale(.97) translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes nt-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes nt-skel { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.nt-orb { animation: nt-float 14s ease-in-out infinite; }
.nt-rise { animation: nt-rise .55s cubic-bezier(.2,.7,.2,1) both; }
.nt-pop { animation: nt-pop .3s cubic-bezier(.2,.7,.2,1) both; }
.nt-fade { animation: nt-fade .25s ease both; }
.nt-skel {
  background: linear-gradient(90deg, rgba(255,255,255,.05) 25%, rgba(255,255,255,.14) 50%, rgba(255,255,255,.05) 75%);
  background-size: 200% 100%;
  animation: nt-skel 1.6s ease-in-out infinite;
}
.nt-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.3), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.nt-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
.nt-card:hover .nt-card-glow { opacity: 1; }
.nt-scroll::-webkit-scrollbar { width: 8px; }
.nt-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 8px; }
@media (prefers-reduced-motion: reduce) {
  .nt-orb, .nt-rise, .nt-pop, .nt-fade, .nt-skel { animation: none !important; }
  .nt-shine::before { transition: none; }
}
`;

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="nt-grid absolute inset-0" />
      <div className="nt-orb absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-[#22D3EE]/20 blur-[120px]" />
      <div className="nt-orb absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-[120px]" style={{ animationDelay: '-5s' }} />
      <div className="nt-orb absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-600/15 blur-[120px]" style={{ animationDelay: '-9s' }} />
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <span aria-hidden className={`nt-skel block rounded-lg ${className}`} />;
}

function NoteSkeleton() {
  return (
    <div className={`${glass} flex min-h-[210px] flex-col rounded-2xl p-5`}>
      <div className="mb-4 flex items-start justify-between">
        <Skeleton className="h-11 w-11 !rounded-xl" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2.5 h-3 w-full" />
      <Skeleton className="mt-2.5 h-3 w-2/3" />
      <div className="mt-auto flex items-center gap-2 border-t border-white/10 pt-4">
        <Skeleton className="h-5 w-24 !rounded-full" />
        <Skeleton className="h-5 w-16 !rounded-full" />
      </div>
    </div>
  );
}

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

  function accentFor(id) {
    if (!id) return GENERAL_ACCENT;
    const index = subjects.findIndex((subject) => subject.id === id);
    return index < 0 ? GENERAL_ACCENT : ACCENTS[index % ACCENTS.length];
  }

  function formatDate(date) {
    if (!date) return '';

    return new Date(date).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const filtering = search || filterSubject !== 'all';

  return (
    <div className="nt-root relative min-h-screen overflow-x-hidden bg-[#060B16] text-white">
      <style>{styles}</style>
      <Backdrop />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8">

        {/* HEADER */}
        <div className="nt-rise mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/20 bg-[#22D3EE]/10 px-3 py-1 text-xs font-medium text-[#67E8F9]">
              <NotebookPen size={13} />
              Learning resources
            </p>

            <h1 className="bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              My notes
            </h1>

            <p className="mt-3 max-w-md text-slate-300">
              Create, organise and keep your study notes in one place.
            </p>
          </div>

          <button
            onClick={createNote}
            className={`${btnPrimary} flex items-center justify-center gap-2 px-6 py-3.5 text-sm`}
          >
            <Plus size={18} />
            Create note
          </button>
        </div>

        {error && !showEditor && (
          <div className="nt-pop mb-5 flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3.5 text-sm text-rose-200">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
            {error}
          </div>
        )}

        {/* TOOLBAR */}
        <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_230px]">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your notes..."
              className={`${inputStyle} h-12 rounded-full pl-11 pr-11`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={filterSubject}
            onChange={(event) => setFilterSubject(event.target.value)}
            className={`${inputStyle} h-12 rounded-full px-5`}
          >
            <option className={optionClass} value="all">All subjects</option>
            <option className={optionClass} value="">General notes</option>
            {subjects.map((subject) => (
              <option className={optionClass} key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 flex items-center justify-between">
          {loading ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            <p className="text-sm text-slate-400">
              {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
            </p>
          )}
        </div>

        {/* NOTES */}
        {loading ? (
          <div
            className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
            aria-busy="true"
            aria-label="Loading your notes"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <NoteSkeleton key={n} />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className={`${glass} nt-pop flex min-h-[320px] flex-col items-center justify-center rounded-3xl px-5 text-center`}>
            <div className="relative mb-5 h-16 w-16">
              <div className="absolute inset-0 rounded-full bg-[#22D3EE]/30 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#22D3EE]/20 bg-[#22D3EE]/10 text-[#67E8F9]">
                <FileText size={28} />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-white">
              {filtering ? 'No matching notes' : 'Your notebook is empty'}
            </h2>

            <p className="mt-2 max-w-sm text-sm text-slate-300">
              {filtering
                ? 'Try changing your search or subject filter.'
                : 'Create your first note and start organising your learning.'}
            </p>

            {!filtering && (
              <button
                onClick={createNote}
                className={`${btnPrimary} mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm`}
              >
                <Plus size={17} />
                Create your first note
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredNotes.map((note, i) => {
              const accent = accentFor(note.subject_id);

              return (
                <button
                  key={note.id}
                  onClick={() => openNote(note)}
                  style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
                  className={`nt-card nt-rise group relative min-h-[210px] rounded-2xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-px text-left transition-all duration-300 hover:-translate-y-1 ${accent.edge}`}
                >
                  <div className={`nt-card-glow pointer-events-none absolute -inset-1 -z-10 rounded-3xl opacity-0 blur-2xl transition-opacity duration-300 ${accent.glow}`} style={{ opacity: 0 }} />

                  <div className={`${glass} flex h-full min-h-[208px] flex-col rounded-2xl p-5 transition-colors group-hover:bg-white/[0.07]`}>
                    <div className="mb-4 flex items-start justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accent.tile}`}>
                        <FileText size={19} />
                      </div>

                      <span className="text-xs text-slate-400">
                        {formatDate(note.updated_at || note.created_at)}
                      </span>
                    </div>

                    <h3 className="mb-2 line-clamp-1 text-lg font-semibold text-white">
                      {note.title || 'Untitled note'}
                    </h3>

                    <p className="line-clamp-3 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {note.content || 'No content yet.'}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-slate-200">
                        <BookOpen size={12} className="text-[#22D3EE]" />
                        {getSubjectName(note.subject_id)}
                      </span>

                      {note.topic_id && (
                        <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-200">
                          {getTopicName(note.topic_id)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* EDITOR */}
      {showEditor && (
        <div className="nt-fade fixed inset-0 z-50 flex items-center justify-center bg-[#02050B]/80 p-0 backdrop-blur-md sm:p-5">
          <div className="nt-pop flex h-full w-full max-w-4xl flex-col overflow-hidden bg-[#0B1220]/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:h-[90vh] sm:rounded-3xl sm:border sm:border-white/10">

            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeEditor}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close editor"
                >
                  <ArrowLeft size={19} />
                </button>

                <div>
                  <h2 className="font-semibold text-white">
                    {selectedNote ? 'Edit note' : 'New note'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Your personal study notebook
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {selectedNote && (
                  <button
                    onClick={deleteNote}
                    disabled={deleting}
                    className="rounded-xl p-2.5 text-rose-400 transition hover:bg-rose-500/10 disabled:opacity-50"
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
                  className="hidden rounded-xl p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white sm:block"
                  aria-label="Close"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-2 sm:px-6">
              <select
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setTopicId('');
                }}
                className={inputStyle}
              >
                <option className={optionClass} value="">General note — no subject</option>
                {subjects.map((subject) => (
                  <option className={optionClass} key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>

              <select
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                disabled={!subjectId || availableTopics.length === 0}
                className={inputStyle}
              >
                <option className={optionClass} value="">No specific topic</option>
                {availableTopics.map((topic) => (
                  <option className={optionClass} key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="nt-scroll flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Note title..."
                className="mb-5 w-full bg-transparent text-2xl font-bold text-white outline-none placeholder:text-slate-600 sm:text-4xl"
              />

              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Start writing your study notes..."
                className="min-h-[350px] w-full resize-none bg-transparent text-base leading-8 text-slate-200 outline-none placeholder:text-slate-600"
              />
            </div>

            {error && (
              <div className="nt-pop mx-4 mb-3 flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3.5 text-sm text-rose-200 sm:mx-6">
                <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
                {error}
              </div>
            )}

            <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-black/20 px-4 py-4 sm:px-6">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </span>

              <button
                onClick={saveNote}
                disabled={saving || deleting}
                className={`${btnPrimary} flex items-center gap-2 px-6 py-3 text-sm`}
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