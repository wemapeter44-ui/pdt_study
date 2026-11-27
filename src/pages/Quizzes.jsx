import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generateQuiz } from '../lib/ai-router';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmProvider';
import {
  Plus, Search, Trash2, Pencil, X, Check,
  Play, ArrowLeft, ChevronRight, ChevronLeft, Trophy,
  BookOpen, RotateCcw, Sparkles, Loader2,
  Clock, Target, FileQuestion, Flame
} from 'lucide-react';

const emptyQuestion = () => ({
  question: '',
  options: ['', '', '', ''],
  correct_answer: '',
  explanation: ''
});

/* ---------- design tokens ---------- */
const glass =
  'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white';
const inputStyle =
  'w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-cyan-400/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-cyan-400/10 [color-scheme:dark]';
const btnPrimary =
  'relative overflow-hidden bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-400/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-cyan-500/20';
const btnGhost =
  'bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all';
const optionClass = 'bg-[#0B1220] text-white';

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
@keyframes qz-pop { from { opacity: 0; transform: scale(.96) translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes qz-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes qz-ring { from { stroke-dashoffset: ${RING}; } }
@keyframes qz-shimmer { from { transform: translateX(-100%); } to { transform: translateX(200%); } }
.qz-orb { animation: qz-float 14s ease-in-out infinite; }
.qz-rise { animation: qz-rise .55s cubic-bezier(.2,.7,.2,1) both; }
.qz-pop { animation: qz-pop .3s cubic-bezier(.2,.7,.2,1) both; }
.qz-fade { animation: qz-fade .25s ease both; }
.qz-ring { animation: qz-ring 1.2s cubic-bezier(.2,.7,.2,1) both; }
.qz-shimmer::after {
  content: ''; position: absolute; inset: 0; width: 50%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent);
  animation: qz-shimmer 2.2s ease-in-out infinite;
}
.qz-card:hover .qz-card-glow { opacity: 1; }
.qz-btn-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.3), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.qz-btn-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
.qz-scroll::-webkit-scrollbar { width: 8px; }
.qz-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 8px; }
@media (prefers-reduced-motion: reduce) {
  .qz-orb, .qz-rise, .qz-pop, .qz-fade, .qz-ring, .qz-shimmer::after { animation: none !important; }
  .qz-btn-shine::before { transition: none; }
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

function Shell({ children }) {
  return (
    <div className="qz-root relative min-h-screen bg-[#060B16] text-white overflow-x-hidden">
      <style>{styles}</style>
      <Backdrop />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function Quizzes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [saving, setSaving] = useState(false);

  const [aiModal, setAiModal] = useState(false);
  const [aiSubjectId, setAiSubjectId] = useState('');
  const [aiTopicId, setAiTopicId] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState('10');
  const [questionType, setQuestionType] = useState('Multiple choice');
  const [generating, setGenerating] = useState(false);

  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);

    const [q, s, t, a] = await Promise.all([
      supabase.from('study_quizzes').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('subjects').select('id,name')
        .eq('user_id', user.id).order('name'),
      supabase.from('topics').select('id,name,subject_id')
        .eq('user_id', user.id).order('name'),
      supabase.from('study_quiz_attempts').select('*')
        .eq('user_id', user.id).order('completed_at', { ascending: false })
    ]);

    if (q.error) console.error(q.error);
    if (s.error) console.error(s.error);
    if (t.error) console.error(t.error);
    if (a.error) console.error(a.error);

    setQuizzes(q.data || []);
    setSubjects(s.data || []);
    setTopics(t.data || []);
    setAttempts(a.data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setTitle('');
    setDescription('');
    setSubjectId('');
    setTopicId('');
    setQuestions([emptyQuestion()]);
    setModal(true);
  }

  function openAI() {
    setAiSubjectId('');
    setAiTopicId('');
    setDifficulty('Medium');
    setQuestionCount('10');
    setQuestionType('Multiple choice');
    setAiModal(true);
  }

  async function handleGenerateQuiz(e) {
    e.preventDefault();

    const selectedTopic = topics.find(t => t.id === aiTopicId);
    const selectedSubject = subjects.find(s => s.id === aiSubjectId);

    if (!selectedTopic) { toast('Please select a topic.', 'error'); return; }

    setGenerating(true);
    let createdQuizId = null;

    try {
      const generated = await generateQuiz({
        topic: selectedTopic.name,
        subject: selectedSubject?.name || '',
        difficulty,
        questionCount: Number(questionCount),
        questionType
      });

      if (!generated.questions?.length) {
        throw new Error('No questions were generated. Please try again.');
      }

      const questionRows = generated.questions.map((q, index) => {
        const options = Array.isArray(q.options)
          ? q.options.map(option => String(option).trim())
          : [];

        const correctAnswer = String(q.correctAnswer ?? '').trim();

        if (
          !q.question?.trim() ||
          options.length < 2 ||
          options.some(option => !option) ||
          !correctAnswer ||
          !options.includes(correctAnswer)
        ) {
          throw new Error(`Question ${index + 1} has invalid data.`);
        }

        return {
          question: q.question.trim(),
          options,
          correct_answer: correctAnswer,
          explanation: q.explanation || ''
        };
      });

      const { data: quiz, error: quizError } = await supabase
        .from('study_quizzes')
        .insert({
          user_id: user.id,
          title: generated.title,
          description: `AI-generated ${difficulty.toLowerCase()} quiz on ${selectedTopic.name}`,
          subject_id: aiSubjectId || null,
          topic_id: selectedTopic.id
        })
        .select()
        .single();

      if (quizError) throw quizError;
      createdQuizId = quiz.id;

      const rows = questionRows.map(q => ({
        ...q,
        quiz_id: quiz.id,
        user_id: user.id
      }));

      const { error: questionError } = await supabase
        .from('study_quiz_questions')
        .insert(rows);

      if (questionError) throw questionError;

      setAiModal(false);
      await loadData();
      toast('Your AI quiz has been generated successfully!', 'success');

    } catch (error) {
      console.error('Quiz generation error:', error);

      if (createdQuizId) {
        const { error: cleanupError } = await supabase
          .from('study_quizzes')
          .delete()
          .eq('id', createdQuizId)
          .eq('user_id', user.id);

        if (cleanupError) console.error(cleanupError);
      }

      toast(error.message || 'Could not generate your quiz.', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function openEdit(quiz) {
    const { data, error } = await supabase
      .from('study_quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .eq('user_id', user.id)
      .order('created_at');

    if (error) { toast(error.message, 'error'); return; }

    setEditing(quiz);
    setTitle(quiz.title);
    setDescription(quiz.description || '');
    setSubjectId(quiz.subject_id || '');
    setTopicId(quiz.topic_id || '');

    setQuestions(data?.length ? data.map(q => ({
      question: q.question,
      options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
      correct_answer: q.correct_answer,
      explanation: q.explanation || ''
    })) : [emptyQuestion()]);

    setModal(true);
  }

  function updateQuestion(index, field, value) {
    setQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, [field]: value } : q
    ));
  }

  function updateOption(qIndex, optionIndex, value) {
    setQuestions(prev => prev.map((q, i) =>
      i === qIndex
        ? {
            ...q,
            options: q.options.map((o, j) =>
              j === optionIndex ? value : o
            )
          }
        : q
    ));
  }

  function addQuestion() {
    setQuestions(prev => [...prev, emptyQuestion()]);
  }

  function removeQuestion(index) {
    setQuestions(prev =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );
  }

  async function saveQuiz(e) {
    e.preventDefault();

    if (!title.trim()) { toast('Enter a quiz title.', 'error'); return; }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const options = q.options.map(o => o.trim()).filter(Boolean);

      if (!q.question.trim()) { toast(`Enter question ${i + 1}.`, 'error'); return; }
      if (options.length < 2) {
        toast(`Question ${i + 1} needs at least two options.`, 'error'); return;
      }
      if (!q.correct_answer || !options.includes(q.correct_answer)) {
        toast(`Choose a correct answer for question ${i + 1}.`, 'error'); return;
      }
    }

    setSaving(true);

    try {
      let quizId = editing?.id;

      if (editing) {
        const { error } = await supabase
          .from('study_quizzes')
          .update({
            title: title.trim(),
            description: description.trim(),
            subject_id: subjectId || null,
            topic_id: topicId || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', quizId)
          .eq('user_id', user.id);

        if (error) throw error;

        const { error: deleteError } = await supabase
          .from('study_quiz_questions')
          .delete()
          .eq('quiz_id', quizId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
      } else {
        const { data, error } = await supabase
          .from('study_quizzes')
          .insert({
            user_id: user.id,
            title: title.trim(),
            description: description.trim(),
            subject_id: subjectId || null,
            topic_id: topicId || null
          })
          .select()
          .single();

        if (error) throw error;
        quizId = data.id;
      }

      const rows = questions.map(q => ({
        quiz_id: quizId,
        user_id: user.id,
        question: q.question.trim(),
        options: q.options.map(o => o.trim()).filter(Boolean),
        correct_answer: q.correct_answer,
        explanation: q.explanation.trim()
      }));

      const { error: insertError } = await supabase
        .from('study_quiz_questions')
        .insert(rows);

      if (insertError) throw insertError;

      setModal(false);
      await loadData();

    } catch (error) {
      toast(error.message || 'Could not save quiz.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuiz(quiz) {
    const confirmed = await confirm({ title: 'Delete quiz?', message: `Delete "${quiz.title}" and its questions? This action cannot be undone.`, confirmText: 'Delete quiz', cancelText: 'Keep quiz', danger: true });
    if (!confirmed) return;

    const { error } = await supabase
      .from('study_quizzes')
      .delete()
      .eq('id', quiz.id)
      .eq('user_id', user.id);

    if (error) return alert(error.message);
    await loadData();
  }

  async function startQuiz(quiz) {
    const { data, error } = await supabase
      .from('study_quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .eq('user_id', user.id)
      .order('created_at');

    if (error) return alert(error.message);
    if (!data?.length) { toast('This quiz has no questions yet.', 'error'); return; }

    setActiveQuiz(quiz);
    setQuizQuestions(data);
    setCurrent(0);
    setAnswers({});
    setFinished(false);
    setResult(null);
  }

  async function finishQuiz() {
    let score = 0;

    quizQuestions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) score++;
    });

    const attempt = {
      quiz_id: activeQuiz.id,
      user_id: user.id,
      score,
      total_questions: quizQuestions.length,
      answers: quizQuestions.map((q, i) => ({
        question_id: q.id,
        selected: answers[i] || null,
        correct: q.correct_answer
      }))
    };

    const { data, error } = await supabase
      .from('study_quiz_attempts')
      .insert(attempt)
      .select()
      .single();

    if (error) return alert(error.message);

    setResult(data);
    setFinished(true);
    await loadData();
  }

  const filtered = useMemo(() =>
    quizzes.filter(q =>
      q.title.toLowerCase().includes(search.toLowerCase())
    ), [quizzes, search]);

  const availableTopics = topics.filter(t =>
    !subjectId || t.subject_id === subjectId
  );

  const aiAvailableTopics = topics.filter(t =>
    !aiSubjectId || t.subject_id === aiSubjectId
  );

  const selectedQuestion = quizQuestions[current];

  const answeredCount = Object.values(answers).filter(Boolean).length;

  const progress = quizQuestions.length
    ? Math.round((answeredCount / quizQuestions.length) * 100)
    : 0;

  const averageScore = attempts.length
    ? Math.round(
        attempts.reduce(
          (sum, a) => sum + (a.score / Math.max(a.total_questions, 1)) * 100,
          0
        ) / attempts.length
      )
    : 0;

  const percentage = result
    ? Math.round((result.score / result.total_questions) * 100)
    : 0;

  const resultStyle = percentage >= 80
    ? {
        color: 'text-emerald-400',
        stroke: '#34D399',
        glow: 'shadow-emerald-500/20',
        background: 'bg-emerald-400/10',
        border: 'border-emerald-400/30',
        message: 'Excellent work!'
      }
    : percentage >= 50
      ? {
          color: 'text-amber-400',
          stroke: '#FBBF24',
          glow: 'shadow-amber-500/20',
          background: 'bg-amber-400/10',
          border: 'border-amber-400/30',
          message: 'Good effort!'
        }
      : {
          color: 'text-rose-400',
          stroke: '#FB7185',
          glow: 'shadow-rose-500/20',
          background: 'bg-rose-400/10',
          border: 'border-rose-400/30',
          message: 'Keep practising!'
        };

  /* ---------- LOADING ---------- */
  if (loading) {
    return (
      <Shell>
        <div className="min-h-screen flex items-center justify-center text-slate-300">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-xl" />
              <div className={`${glass} relative w-16 h-16 rounded-2xl flex items-center justify-center`}>
                <Loader2 className="animate-spin text-cyan-400" size={26} />
              </div>
            </div>
            <p className="text-sm text-slate-400">Loading your quizzes...</p>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- QUIZ SESSION ---------- */
  if (activeQuiz) {
    return (
      <Shell>
        <div className="px-4 py-6 sm:px-8 sm:py-8">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setActiveQuiz(null)}
              className="group inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-8 transition-colors"
            >
              <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:-translate-x-0.5 transition-all">
                <ArrowLeft size={16} />
              </span>
              Back to quizzes
            </button>

            <div className="flex justify-between items-start gap-4 mb-6 qz-rise">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-xs font-medium text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-3 py-1 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Practice session
                </p>
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
                  {activeQuiz.title}
                </h1>
              </div>
              {!finished && (
                <span className={`${glass} shrink-0 text-sm font-semibold tabular-nums px-3.5 py-2 rounded-xl`}>
                  {current + 1}<span className="text-slate-400"> / {quizQuestions.length}</span>
                </span>
              )}
            </div>

            {finished ? (
              <div className={`${glass} rounded-3xl p-5 sm:p-9 qz-pop`}>
                <div className="relative w-44 h-44 mx-auto">
                  <div className={`absolute inset-4 rounded-full blur-2xl opacity-40 ${resultStyle.background}`} />
                  <svg viewBox="0 0 120 120" className="relative w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                    <circle
                      className="qz-ring"
                      cx="60" cy="60" r="54" fill="none"
                      stroke={resultStyle.stroke}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={RING}
                      strokeDashoffset={RING * (1 - percentage / 100)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className={`text-5xl font-bold tabular-nums ${resultStyle.color}`}>
                      {percentage}<span className="text-2xl">%</span>
                    </p>
                  </div>
                </div>

                <div className="text-center mt-6">
                  <h2 className="text-2xl font-bold">Quiz completed</h2>
                  <p className={`font-semibold mt-1 ${resultStyle.color}`}>
                    {resultStyle.message}
                  </p>
                  <p className="text-sm text-slate-300 mt-2">
                    You got {result.score} of {result.total_questions} correct. Your result has been saved.
                  </p>
                </div>

                <div className="mt-9">
                  <h3 className="font-semibold text-sm mb-3 text-slate-200">
                    Answer review
                  </h3>

                  <div className="space-y-3">
                    {quizQuestions.map((q, i) => {
                      const correct = answers[i] === q.correct_answer;

                      return (
                        <div
                          key={q.id}
                          className={`border rounded-2xl p-4 qz-rise ${
                            correct
                              ? 'border-emerald-400/20 bg-emerald-400/[0.04]'
                              : 'border-rose-400/20 bg-rose-400/[0.04]'
                          }`}
                          style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                        >
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                              correct
                                ? 'bg-emerald-400/15 text-emerald-400'
                                : 'bg-rose-400/15 text-rose-400'
                            }`}>
                              {correct ? <Check size={16} /> : <X size={16} />}
                            </div>

                            <div className="min-w-0">
                              <p className="font-medium text-sm text-white leading-relaxed">
                                {i + 1}. {q.question}
                              </p>
                              <p className="text-xs text-slate-300 mt-2">
                                Your answer: <span className="text-white">{answers[i] || 'Not answered'}</span>
                              </p>

                              {!correct && (
                                <p className="text-xs text-emerald-400 mt-1.5">
                                  Correct answer: {q.correct_answer}
                                </p>
                              )}

                              {q.explanation && (
                                <p className="text-sm text-slate-300 mt-3 leading-relaxed border-l-2 border-white/10 pl-3">
                                  {q.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => startQuiz(activeQuiz)}
                  className={`${btnPrimary} qz-btn-shine w-full mt-8 py-3.5 flex items-center justify-center gap-2`}
                >
                  <RotateCcw size={17} /> Try again
                </button>
              </div>
            ) : (
              <div className={`${glass} rounded-3xl p-5 sm:p-8 qz-pop`}>
                <div className="flex justify-between items-center text-xs text-slate-300 mb-3">
                  <span className="font-medium">Your progress</span>
                  <span className="font-semibold text-cyan-300 tabular-nums">
                    {answeredCount} of {quizQuestions.length} answered · {progress}%
                  </span>
                </div>

                <div className="w-full h-2.5 bg-white/[0.07] rounded-full mb-5 overflow-hidden">
                  <div
                    className="qz-shimmer relative h-full rounded-full overflow-hidden transition-all duration-500 ease-out shadow-[0_0_16px_rgba(34,211,238,0.5)]"
                    style={{
                      width: `${progress}%`,
                      minWidth: progress > 0 ? '8px' : '0px',
                      background: 'linear-gradient(90deg, #22D3EE 0%, #3B82F6 55%, #A855F7 100%)'
                    }}
                  />
                </div>

                {/* question navigator */}
                <div className="flex flex-wrap gap-1.5 mb-8">
                  {quizQuestions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      aria-label={`Go to question ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        i === current
                          ? 'w-8 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]'
                          : answers[i]
                            ? 'w-4 bg-cyan-400/50 hover:bg-cyan-400/80'
                            : 'w-4 bg-white/15 hover:bg-white/30'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between mb-3 min-h-[24px]">
                  <p className="text-sm font-semibold text-cyan-300">
                    Question {current + 1}
                  </p>
                  {answers[current] && (
                    <span className="qz-fade text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-1">
                      <Check size={12} /> Answer selected
                    </span>
                  )}
                </div>

                <div key={current} className="qz-rise">
                  <h2 className="text-xl sm:text-2xl font-semibold leading-relaxed mb-7 text-white">
                    {selectedQuestion.question}
                  </h2>

                  <div className="space-y-3">
                    {selectedQuestion.options.map((option, i) => {
                      const selected = answers[current] === option;

                      return (
                        <button
                          key={i}
                          onClick={() => setAnswers(prev => ({
                            ...prev,
                            [current]: option
                          }))}
                          className={`group w-full flex items-center gap-3 text-left border rounded-2xl p-4 transition-all duration-200 ${
                            selected
                              ? 'border-cyan-400/70 bg-cyan-400/10 shadow-[0_0_28px_rgba(34,211,238,0.15)] -translate-y-0.5'
                              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/25 hover:-translate-y-0.5'
                          }`}
                        >
                          <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                            selected
                              ? 'bg-gradient-to-br from-cyan-300 to-sky-500 text-[#06101C] scale-105'
                              : 'bg-white/[0.07] text-slate-200 group-hover:bg-white/10'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>

                          <span className="text-sm sm:text-base text-white">
                            {option}
                          </span>

                          {selected && (
                            <Check size={18} className="ml-auto text-cyan-300 shrink-0 qz-pop" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center gap-3 mt-9 pt-6 border-t border-white/10">
                  <button
                    disabled={current === 0}
                    onClick={() => setCurrent(v => v - 1)}
                    className={`${btnGhost} px-4 py-3 text-sm flex items-center gap-1.5 disabled:opacity-30 disabled:hover:bg-white/[0.05]`}
                  >
                    <ChevronLeft size={17} /> Previous
                  </button>

                  {current < quizQuestions.length - 1 ? (
                    <button
                      onClick={() => setCurrent(v => v + 1)}
                      className={`${btnPrimary} qz-btn-shine px-5 py-3 text-sm flex items-center gap-1.5`}
                    >
                      Next question <ChevronRight size={17} />
                    </button>
                  ) : (
                    <button
                      onClick={finishQuiz}
                      disabled={answeredCount === 0}
                      className="qz-btn-shine relative overflow-hidden px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-[#04101A] font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/40 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-y-0"
                    >
                      Submit quiz
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- QUIZ LIBRARY ---------- */
  const stats = [
    { label: 'Total quizzes', value: quizzes.length, icon: BookOpen, color: 'text-cyan-300', ring: 'from-cyan-400/40 to-cyan-400/0', bg: 'bg-cyan-400/10' },
    { label: 'Quiz attempts', value: attempts.length, icon: Target, color: 'text-violet-300', ring: 'from-violet-400/40 to-violet-400/0', bg: 'bg-violet-400/10' },
    { label: 'Average score', value: `${averageScore}%`, icon: Trophy, color: 'text-amber-300', ring: 'from-amber-400/40 to-amber-400/0', bg: 'bg-amber-400/10' }
  ];

  return (
    <Shell>
      <div className="px-4 py-6 sm:px-8 sm:py-10">
        <div className="max-w-6xl mx-auto">

          {/* header */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10 qz-rise">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-medium text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-3 py-1 mb-4">
                <Flame size={13} /> Learning hub
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent">
                My quizzes
              </h1>
              <p className="text-slate-300 mt-3 max-w-md">
                Practise what you've learned and monitor your progress.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <button
                onClick={openAI}
                className={`${btnPrimary} qz-btn-shine px-5 py-3.5 flex items-center justify-center gap-2 text-sm`}
              >
                <Sparkles size={17} /> Generate with AI
              </button>

              <button
                onClick={openNew}
                className={`${btnGhost} px-5 py-3.5 flex items-center justify-center gap-2 text-sm`}
              >
                <Plus size={17} /> Create quiz
              </button>
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {stats.map((item, idx) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="qz-rise relative rounded-2xl p-px bg-gradient-to-br from-white/15 to-white/0"
                  style={{ animationDelay: `${80 + idx * 70}ms` }}
                >
                  <div className={`${glass} rounded-2xl p-5 relative overflow-hidden`}>
                    <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${item.ring} blur-2xl`} />
                    <div className="relative flex justify-between items-center">
                      <div>
                        <p className="text-sm text-slate-300">{item.label}</p>
                        <p className="text-3xl font-bold mt-2 tabular-nums text-white">
                          {item.value}
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl ${item.bg} border border-white/10 flex items-center justify-center`}>
                        <Icon size={22} className={item.color} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* library toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-semibold text-xl text-white">Your quiz library</h2>
              <p className="text-sm text-slate-400 mt-1">
                {filtered.length} {filtered.length === 1 ? 'quiz' : 'quizzes'} available
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search your quizzes..."
                className={`${inputStyle} pl-11 rounded-full`}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className={`${glass} rounded-3xl text-center py-20 px-5 qz-pop`}>
              <div className="relative w-16 h-16 mx-auto mb-5">
                <div className="absolute inset-0 bg-cyan-400/30 blur-xl rounded-full" />
                <div className="relative w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                  <FileQuestion size={27} className="text-cyan-300" />
                </div>
              </div>
              <h3 className="font-semibold text-xl text-white">
                {search ? 'No matching quizzes' : 'Your quiz library is empty'}
              </h3>
              <p className="text-sm text-slate-300 mt-2 max-w-sm mx-auto">
                {search
                  ? 'Try another search term.'
                  : 'Create a quiz manually or generate one from your study topics.'}
              </p>
              {!search && (
                <button
                  onClick={openAI}
                  className={`${btnPrimary} qz-btn-shine mt-7 inline-flex items-center gap-2 text-sm px-6 py-3.5`}
                >
                  <Sparkles size={16} /> Generate your first quiz
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((quiz, idx) => {
                const subject = subjects.find(s => s.id === quiz.subject_id);
                const topic = topics.find(t => t.id === quiz.topic_id);
                const quizAttempts = attempts.filter(a => a.quiz_id === quiz.id);
                const count = quizAttempts.length;
                const best = count
                  ? Math.max(...quizAttempts.map(a =>
                      Math.round((a.score / Math.max(a.total_questions, 1)) * 100)
                    ))
                  : null;

                return (
                  <div
                    key={quiz.id}
                    className="qz-card qz-rise group relative rounded-2xl p-px bg-gradient-to-br from-white/15 via-white/5 to-white/0 hover:from-cyan-400/50 hover:via-violet-400/20 hover:to-transparent transition-all duration-300 hover:-translate-y-1"
                    style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
                  >
                    <div className="qz-card-glow absolute -inset-1 -z-10 rounded-3xl bg-cyan-400/10 blur-2xl opacity-0 transition-opacity duration-300" />

                    <div className={`${glass} relative rounded-2xl p-5 sm:p-6 h-full flex flex-col`}>
                      <div className="flex justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 mb-3">
                            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 border border-white/10 flex items-center justify-center shrink-0">
                              <BookOpen size={18} className="text-cyan-300" />
                            </span>
                            {best !== null && (
                              <span className="text-xs font-medium text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-1 flex items-center gap-1">
                                <Trophy size={11} /> Best {best}%
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg leading-snug break-words text-white">
                            {quiz.title}
                          </h3>
                          <p className="text-sm text-slate-300 mt-2 line-clamp-2">
                            {quiz.description || 'Practice quiz'}
                          </p>
                        </div>

                        <div className="flex gap-1 shrink-0 self-start">
                          <button
                            onClick={() => openEdit(quiz)}
                            title="Edit quiz"
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-cyan-300 hover:bg-cyan-400/10 transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteQuiz(quiz)}
                            title="Delete quiz"
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-white/10 text-xs text-slate-300">
                        {subject && (
                          <span className="bg-white/[0.06] border border-white/10 rounded-full px-2.5 py-1">
                            {subject.name}
                          </span>
                        )}
                        {topic && (
                          <span className="bg-violet-400/10 text-violet-200 border border-violet-400/20 rounded-full px-2.5 py-1">
                            {topic.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 ml-auto text-slate-400">
                          <Clock size={13} /> {count} {count === 1 ? 'attempt' : 'attempts'}
                        </span>
                      </div>

                      <button
                        onClick={() => startQuiz(quiz)}
                        className="qz-btn-shine relative overflow-hidden w-full mt-5 bg-white/[0.05] group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-blue-500 text-cyan-200 group-hover:text-[#04101A] border border-white/10 group-hover:border-transparent rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300"
                      >
                        <Play size={15} /> Start practising
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AI GENERATOR MODAL */}
          {aiModal && (
            <div className="qz-fade qz-scroll fixed inset-0 z-50 bg-[#02050B]/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto flex items-start sm:items-center justify-center">
              <form
                onSubmit={handleGenerateQuiz}
                className={`${glass} qz-pop w-full max-w-lg rounded-3xl p-5 sm:p-8 my-auto bg-[#0B1220]/90`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-400/40 blur-lg rounded-2xl" />
                      <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
                        <Sparkles className="text-white" size={22} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">AI quiz generator</h2>
                      <p className="text-xs text-slate-300 mt-1">
                        Create questions from your study topics
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => setAiModal(false)}
                    className="text-slate-300 hover:text-white hover:bg-white/10 rounded-lg p-1.5 disabled:opacity-30 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mt-7 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-2">Subject</label>
                    <select
                      value={aiSubjectId}
                      onChange={e => {
                        setAiSubjectId(e.target.value);
                        setAiTopicId('');
                      }}
                      className={inputStyle}
                    >
                      <option className={optionClass} value="">All subjects</option>
                      {subjects.map(s => (
                        <option className={optionClass} key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-2">Topic</label>
                    <select
                      required
                      value={aiTopicId}
                      onChange={e => setAiTopicId(e.target.value)}
                      className={inputStyle}
                    >
                      <option className={optionClass} value="">Choose a topic</option>
                      {aiAvailableTopics.map(t => (
                        <option className={optionClass} key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {topics.length === 0 && (
                      <p className="text-xs text-amber-400 mt-2">
                        Add a subject and topic before generating a quiz.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-2">Difficulty</label>
                    <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-white/[0.04] border border-white/10">
                      {['Easy', 'Medium', 'Hard'].map(level => (
                        <button
                          type="button"
                          key={level}
                          onClick={() => setDifficulty(level)}
                          className={`py-2 rounded-lg text-sm font-medium transition-all ${
                            difficulty === level
                              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-[#04101A] shadow-lg shadow-cyan-500/20'
                              : 'text-slate-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-200 mb-2">Questions</label>
                      <select
                        value={questionCount}
                        onChange={e => setQuestionCount(e.target.value)}
                        className={inputStyle}
                      >
                        <option className={optionClass} value="5">5 questions</option>
                        <option className={optionClass} value="10">10 questions</option>
                        <option className={optionClass} value="15">15 questions</option>
                        <option className={optionClass} value="20">20 questions</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-200 mb-2">Question type</label>
                      <select
                        value={questionType}
                        onChange={e => setQuestionType(e.target.value)}
                        className={inputStyle}
                      >
                        <option className={optionClass}>Multiple choice</option>
                        <option className={optionClass}>True/False</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating || !aiTopicId}
                  className={`${btnPrimary} qz-btn-shine w-full mt-8 py-3.5 flex items-center justify-center gap-2`}
                >
                  {generating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Generating your quiz...
                    </>
                  ) : (
                    <>
                      <Sparkles size={17} /> Generate quiz
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-400 text-center mt-3">
                  Generated questions are saved to your quiz library.
                </p>
              </form>
            </div>
          )}

          {/* MANUAL QUIZ EDITOR */}
          {modal && (
            <div className="qz-fade qz-scroll fixed inset-0 z-50 bg-[#02050B]/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
              <form
                onSubmit={saveQuiz}
                className={`${glass} qz-pop max-w-3xl mx-auto my-4 rounded-3xl p-5 sm:p-8 bg-[#0B1220]/90`}
              >
                <div className="flex justify-between items-center mb-7">
                  <div>
                    <p className="text-xs text-cyan-300 font-medium mb-1">
                      Quiz editor
                    </p>
                    <h2 className="text-2xl font-bold text-white">
                      {editing ? 'Edit quiz' : 'Create a quiz'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModal(false)}
                    className="text-slate-300 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    placeholder="Quiz title"
                    className={inputStyle}
                  />

                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                    className={inputStyle}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={subjectId}
                      onChange={e => {
                        setSubjectId(e.target.value);
                        setTopicId('');
                      }}
                      className={inputStyle}
                    >
                      <option className={optionClass} value="">No subject</option>
                      {subjects.map(s => (
                        <option className={optionClass} key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={topicId}
                      onChange={e => setTopicId(e.target.value)}
                      className={inputStyle}
                    >
                      <option className={optionClass} value="">No topic</option>
                      {availableTopics.map(t => (
                        <option className={optionClass} key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {questions.map((q, qi) => (
                    <div
                      key={qi}
                      className="border border-white/10 bg-white/[0.025] rounded-2xl p-4 sm:p-5"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-sm text-white flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-xs flex items-center justify-center tabular-nums">
                            {qi + 1}
                          </span>
                          Question {qi + 1}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeQuestion(qi)}
                          disabled={questions.length === 1}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-400/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <textarea
                        value={q.question}
                        onChange={e => updateQuestion(qi, 'question', e.target.value)}
                        required
                        placeholder="Write your question..."
                        rows={2}
                        className={inputStyle}
                      />

                      <p className="text-xs text-slate-300 mt-4 mb-2">
                        Answer options. Select the correct one.
                      </p>

                      <div className="space-y-2">
                        {q.options.map((option, oi) => {
                          const isCorrect = q.correct_answer === option && option !== '';

                          return (
                            <div key={oi} className="flex gap-2.5 items-center">
                              <input
                                type="radio"
                                name={`correct-${qi}`}
                                checked={isCorrect}
                                onChange={() => updateQuestion(qi, 'correct_answer', option)}
                                disabled={!option.trim()}
                                className="accent-emerald-400 w-4 h-4 shrink-0"
                              />
                              <input
                                value={option}
                                onChange={e => {
                                  const old = option;
                                  updateOption(qi, oi, e.target.value);
                                  if (q.correct_answer === old) {
                                    updateQuestion(qi, 'correct_answer', e.target.value);
                                  }
                                }}
                                placeholder={`Option ${oi + 1}`}
                                className={`${inputStyle} py-2.5 ${
                                  isCorrect ? '!border-emerald-400/50 !bg-emerald-400/[0.06]' : ''
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <textarea
                        value={q.explanation}
                        onChange={e => updateQuestion(qi, 'explanation', e.target.value)}
                        placeholder="Explanation (optional)"
                        rows={2}
                        className={`${inputStyle} mt-4`}
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addQuestion}
                  className="w-full border border-dashed border-white/20 hover:border-cyan-400/60 hover:bg-cyan-400/5 text-cyan-300 rounded-xl py-3.5 mt-4 flex justify-center items-center gap-2 text-sm font-medium transition-all"
                >
                  <Plus size={17} /> Add question
                </button>

                <button
                  disabled={saving}
                  className={`${btnPrimary} qz-btn-shine w-full py-3.5 mt-4`}
                >
                  {saving ? 'Saving...' : editing ? 'Save changes' : 'Create quiz'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}