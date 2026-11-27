
import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Layers, BookOpen, Trash2, Pencil,
  X, Loader2, ArrowLeft, ChevronLeft, ChevronRight,
  RotateCcw, Shuffle, Check, GraduationCap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../components/ConfirmProvider';

export default function Flashcards() {
  const { user } = useAuth();
  const { confirm } = useConfirm();

  const [cards, setCards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');

  const [showEditor, setShowEditor] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [saving, setSaving] = useState(false);

  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError('');

    const [cardResult, subjectResult, topicResult] = await Promise.all([
      supabase.from('study_flashcards')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase.from('subjects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name'),
      supabase.from('topics')
        .select('id, name, subject_id')
        .eq('user_id', user.id)
        .order('name')
    ]);

    if (cardResult.error) setError(cardResult.error.message);
    else setCards(cardResult.data || []);

    if (subjectResult.error) setError(subjectResult.error.message);
    else setSubjects(subjectResult.data || []);

    if (topicResult.error) setError(topicResult.error.message);
    else setTopics(topicResult.data || []);

    setLoading(false);
  }

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const term = search.toLowerCase();

      const matchesSearch =
        (card.question || '').toLowerCase().includes(term) ||
        (card.answer || '').toLowerCase().includes(term);

      const matchesSubject =
        filterSubject === 'all' ||
        (filterSubject === ''
          ? !card.subject_id
          : card.subject_id === filterSubject);

      return matchesSearch && matchesSubject;
    });
  }, [cards, search, filterSubject]);

  const availableTopics = topics.filter(
    (topic) => topic.subject_id === subjectId
  );

  function openNewCard() {
    setEditingCard(null);
    setQuestion('');
    setAnswer('');
    setSubjectId('');
    setTopicId('');
    setError('');
    setShowEditor(true);
  }

  function openEditCard(card) {
    setEditingCard(card);
    setQuestion(card.question);
    setAnswer(card.answer);
    setSubjectId(card.subject_id || '');
    setTopicId(card.topic_id || '');
    setError('');
    setShowEditor(true);
  }

  async function saveCard() {
    if (!question.trim() || !answer.trim()) {
      setError('Both the question and answer are required.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      user_id: user.id,
      question: question.trim(),
      answer: answer.trim(),
      subject_id: subjectId || null,
      topic_id: topicId || null,
      updated_at: new Date().toISOString()
    };

    const result = editingCard
      ? await supabase.from('study_flashcards')
          .update(payload)
          .eq('id', editingCard.id)
          .eq('user_id', user.id)
          .select()
          .single()
      : await supabase.from('study_flashcards')
          .insert(payload)
          .select()
          .single();

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setCards((previous) => {
      const remaining = previous.filter(
        (card) => card.id !== result.data.id
      );
      return [result.data, ...remaining];
    });

    setSaving(false);
    setShowEditor(false);
  }

  async function deleteCard(card) {
    const confirmed = await confirm({
      title: 'Delete flashcard?',
      message: 'Are you sure you want to delete this flashcard?',
      confirmText: 'Delete flashcard',
      cancelText: 'Keep flashcard',
      danger: true
    });
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from('study_flashcards')
      .delete()
      .eq('id', card.id)
      .eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setCards((previous) =>
      previous.filter((item) => item.id !== card.id)
    );
  }

  function getSubjectName(id) {
    return subjects.find((item) => item.id === id)?.name || 'General';
  }

  function getTopicName(id) {
    return topics.find((item) => item.id === id)?.name || '';
  }

  function startStudy() {
    if (!filteredCards.length) return;
    setStudyIndex(0);
    setFlipped(false);
    setStudyMode(true);
  }

  function closeStudy() {
    setStudyMode(false);
    setFlipped(false);
  }

  function moveCard(direction) {
    setStudyIndex((index) =>
      (index + direction + filteredCards.length) % filteredCards.length
    );
    setFlipped(false);
  }

  function shuffleCards() {
    setCards((previous) => [...previous].sort(() => Math.random() - 0.5));
    setStudyIndex(0);
    setFlipped(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={20} />
        Loading flashcards...
      </div>
    );
  }

  const currentCard = filteredCards[studyIndex];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8">

      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-cyan-400">
            <Layers size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Practice and revision
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Flashcards
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Test your memory and strengthen what you've learned.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={startStudy}
            disabled={!filteredCards.length}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#334155] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1E293B] disabled:opacity-40 sm:flex-none"
          >
            <GraduationCap size={18} />
            Study cards
          </button>

          <button
            onClick={openNewCard}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 sm:flex-none"
          >
            <Plus size={18} />
            Create card
          </button>
        </div>
      </div>

      {error && !showEditor && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="flex items-center gap-3 rounded-lg border border-[#263244] bg-[#111B2B] px-4">
          <Search size={18} className="text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions and answers..."
            className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <select
          value={filterSubject}
          onChange={(event) => setFilterSubject(event.target.value)}
          className="h-12 rounded-lg border border-[#263244] bg-[#111B2B] px-3 text-sm text-slate-300 outline-none"
        >
          <option value="all">All subjects</option>
          <option value="">General cards</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {filteredCards.length} {filteredCards.length === 1 ? 'card' : 'cards'}
        </p>
      </div>

      {filteredCards.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#334155] bg-[#111B2B]/50 px-5 text-center">
          <div className="mb-4 rounded-xl bg-[#1E293B] p-4 text-cyan-400">
            <Layers size={28} />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Your flashcards are empty
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Create question-and-answer cards to start practising.
          </p>
          <button
            onClick={openNewCard}
            className="mt-5 flex items-center gap-2 text-sm font-semibold text-cyan-400"
          >
            <Plus size={17} />
            Create your first card
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="flex min-h-[230px] flex-col rounded-xl border border-[#263244] bg-[#111B2B] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Question
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditCard(card)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-[#1E293B] hover:text-white"
                    aria-label="Edit card"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => deleteCard(card)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                    aria-label="Delete card"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="flex-1 whitespace-pre-wrap text-base font-medium leading-7 text-white">
                {card.question}
              </p>

              <div className="mt-4 border-t border-[#263244] pt-3">
                <p className="mb-2 line-clamp-2 text-sm leading-6 text-slate-400">
                  {card.answer}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <BookOpen size={13} />
                  {getSubjectName(card.subject_id)}
                  {card.topic_id && ` Â· ${getTopicName(card.topic_id)}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-0 backdrop-blur-sm sm:p-5">
          <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-[#080F1C] sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:border sm:border-[#263244]">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#263244] px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEditor(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-[#1E293B]"
                  aria-label="Close editor"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="font-semibold text-white">
                  {editingCard ? 'Edit flashcard' : 'Create flashcard'}
                </h2>
              </div>
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-[#1E293B]"
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Question
                </label>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Enter your question..."
                  rows={4}
                  className="w-full resize-y rounded-lg border border-[#263244] bg-[#111B2B] p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Answer
                </label>
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Enter the answer..."
                  rows={5}
                  className="w-full resize-y rounded-lg border border-[#263244] bg-[#111B2B] p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={subjectId}
                  onChange={(event) => {
                    setSubjectId(event.target.value);
                    setTopicId('');
                  }}
                  className="h-11 rounded-lg border border-[#263244] bg-[#111B2B] px-3 text-sm text-slate-300 outline-none"
                >
                  <option value="">General â€” no subject</option>
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
                  className="h-11 rounded-lg border border-[#263244] bg-[#111B2B] px-3 text-sm text-slate-300 outline-none disabled:opacity-50"
                >
                  <option value="">No specific topic</option>
                  {availableTopics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end border-t border-[#263244] bg-[#0B1422] p-4 sm:px-6">
              <button
                onClick={saveCard}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
              >
                {saving && <Loader2 size={17} className="animate-spin" />}
                {saving ? 'Saving...' : 'Save flashcard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {studyMode && currentCard && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#080F1C]">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#263244] px-4 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={closeStudy}
                className="rounded-lg p-2 text-slate-400 hover:bg-[#1E293B]"
                aria-label="Exit study mode"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <p className="font-semibold text-white">Study mode</p>
                <p className="text-xs text-slate-500">
                  {getSubjectName(currentCard.subject_id)}
                </p>
              </div>
            </div>
            <span className="text-sm tabular-nums text-slate-400">
              {studyIndex + 1} / {filteredCards.length}
            </span>
          </header>

          <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-5">
            <div className="mb-4 flex w-full max-w-2xl items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>{flipped ? 'Answer' : 'Question'}</span>
              <span>Tap card to flip</span>
            </div>

            <button
              onClick={() => setFlipped((value) => !value)}
              className="flex min-h-[300px] w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-[#334155] bg-[#111B2B] p-8 text-center transition hover:border-cyan-500/50 sm:min-h-[380px] sm:p-12"
            >
              <span className="mb-8 text-xs font-semibold uppercase tracking-widest text-cyan-400">
                {flipped ? 'Answer' : 'Question'}
              </span>
              <span className="whitespace-pre-wrap text-xl font-semibold leading-relaxed text-white sm:text-2xl">
                {flipped ? currentCard.answer : currentCard.question}
              </span>
              <span className="mt-10 flex items-center gap-2 text-sm text-slate-500">
                <RotateCcw size={15} />
                Tap to {flipped ? 'see question' : 'reveal answer'}
              </span>
            </button>

            <div className="mt-8 flex w-full max-w-2xl items-center justify-between gap-3">
              <button
                onClick={() => moveCard(-1)}
                disabled={filteredCards.length < 2}
                className="flex items-center gap-2 rounded-lg border border-[#334155] px-4 py-3 text-sm text-white hover:bg-[#1E293B] disabled:opacity-40"
              >
                <ChevronLeft size={18} />
                Previous
              </button>

              <button
                onClick={shuffleCards}
                className="rounded-lg border border-[#334155] p-3 text-slate-300 hover:bg-[#1E293B]"
                aria-label="Shuffle cards"
                title="Shuffle cards"
              >
                <Shuffle size={18} />
              </button>

              <button
                onClick={() => moveCard(1)}
                disabled={filteredCards.length < 2}
                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

