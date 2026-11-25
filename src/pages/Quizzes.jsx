import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generateQuiz } from '../lib/ai-router';
import {
  Plus, Search, Trash2, Pencil, X, Check,
  Play, ArrowLeft, ChevronRight, Trophy,
  BookOpen, RotateCcw, Sparkles, Loader2,
  Clock, Target, FileQuestion
} from 'lucide-react';

const emptyQuestion = () => ({
  question: '',
  options: ['', '', '', ''],
  correct_answer: '',
  explanation: ''
});

const panel = 'bg-[#111B2B] border border-[#263244] text-white';
const inputStyle = 'w-full bg-[#0B1422] border border-[#263244] rounded-lg px-3.5 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-cyan-400 transition-colors [color-scheme:dark]';

export default function Quizzes() {
  const { user } = useAuth();

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

    if (!selectedTopic) return alert('Please select a topic.');

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
      alert('Your AI quiz has been generated successfully!');

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

      alert(error.message || 'Could not generate your quiz.');
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

    if (error) return alert(error.message);

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

    if (!title.trim()) return alert('Enter a quiz title.');

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const options = q.options.map(o => o.trim()).filter(Boolean);

      if (!q.question.trim()) return alert(`Enter question ${i + 1}.`);
      if (options.length < 2) {
        return alert(`Question ${i + 1} needs at least two options.`);
      }
      if (!q.correct_answer || !options.includes(q.correct_answer)) {
        return alert(`Choose a correct answer for question ${i + 1}.`);
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
      alert(error.message || 'Could not save quiz.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuiz(quiz) {
    if (!window.confirm(`Delete "${quiz.title}" and its questions?`)) return;

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
    if (!data?.length) return alert('This quiz has no questions yet.');

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

  // Progress now responds immediately when an answer is selected.
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
        background: 'bg-emerald-400/10',
        border: 'border-emerald-400/30',
        message: 'Excellent work!'
      }
    : percentage >= 50
      ? {
          color: 'text-amber-400',
          background: 'bg-amber-400/10',
          border: 'border-amber-400/30',
          message: 'Good effort!'
        }
      : {
          color: 'text-rose-400',
          background: 'bg-rose-400/10',
          border: 'border-rose-400/30',
          message: 'Keep practising!'
        };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080F1C] flex items-center justify-center text-slate-300">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-3 text-cyan-400" size={28} />
          <p className="text-sm">Loading your quizzes...</p>
        </div>
      </div>
    );
  }

  // QUIZ SESSION
  if (activeQuiz) {
    return (
      <div className="min-h-screen bg-[#080F1C] text-white px-4 py-6 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setActiveQuiz(null)}
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-8"
          >
            <ArrowLeft size={17} /> Back to quizzes
          </button>

          <div className="flex justify-between items-start gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold tracking-widest text-cyan-400 mb-2">
                PDT STUDY / PRACTICE
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {activeQuiz.title}
              </h1>
            </div>
            {!finished && (
              <span className="shrink-0 text-sm text-white bg-[#111B2B] border border-[#263244] px-3 py-2 rounded-lg">
                {current + 1} / {quizQuestions.length}
              </span>
            )}
          </div>

          {finished ? (
            <div className={`${panel} rounded-2xl p-5 sm:p-8`}>
              <div className={`w-20 h-20 mx-auto rounded-2xl ${resultStyle.background} border ${resultStyle.border} flex items-center justify-center mb-5`}>
                <Trophy size={34} className={resultStyle.color} />
              </div>

              <h2 className="text-2xl font-bold text-center">
                Quiz completed
              </h2>
              <p className={`text-center font-semibold mt-2 ${resultStyle.color}`}>
                {resultStyle.message}
              </p>
              <p className="text-sm text-slate-300 text-center mt-2">
                Your result has been saved.
              </p>

              <div className={`my-8 rounded-2xl p-6 text-center border ${resultStyle.border} ${resultStyle.background}`}>
                <p className={`text-6xl font-bold tabular-nums ${resultStyle.color}`}>
                  {percentage}%
                </p>
                <p className="text-sm text-slate-200 mt-3">
                  {result.score} correct out of {result.total_questions}
                </p>
                <div className="h-3 rounded-full bg-[#263244] overflow-hidden mt-5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      percentage >= 80
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                        : percentage >= 50
                          ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                          : 'bg-gradient-to-r from-rose-500 to-orange-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm mb-3 text-white">
                  Answer review
                </h3>

                {quizQuestions.map((q, i) => {
                  const correct = answers[i] === q.correct_answer;

                  return (
                    <div key={q.id} className={`border rounded-xl p-4 ${
                      correct
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-rose-500/30 bg-rose-500/5'
                    }`}>
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                          correct
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {correct ? <Check size={16} /> : <X size={16} />}
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-sm text-white">
                            {i + 1}. {q.question}
                          </p>
                          <p className="text-xs text-slate-300 mt-2">
                            Your answer: {answers[i] || 'Not answered'}
                          </p>

                          {!correct && (
                            <p className="text-xs text-emerald-400 mt-2">
                              Correct answer: {q.correct_answer}
                            </p>
                          )}

                          {q.explanation && (
                            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => startQuiz(activeQuiz)}
                className="w-full mt-7 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-lg py-3 flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw size={17} /> Try again
              </button>
            </div>
          ) : (
            <div className={`${panel} rounded-2xl p-5 sm:p-8`}>
              <div className="flex justify-between text-xs text-slate-300 mb-3">
                <span className="font-semibold tracking-wider">YOUR PROGRESS</span>
                <span className="font-semibold text-cyan-300 tabular-nums">
                  {answeredCount} of {quizQuestions.length} answered · {progress}%
                </span>
              </div>

              {/* Answer-based progress bar */}
              <div className="w-full h-3 bg-[#263244] rounded-full mb-8 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    minWidth: progress > 0 ? '6px' : '0px',
                    background: 'linear-gradient(90deg, #22D3EE 0%, #3B82F6 55%, #A855F7 100%)'
                  }}
                />
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold tracking-widest text-cyan-300">
                  QUESTION {String(current + 1).padStart(2, '0')}
                </p>
                {answers[current] && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Check size={13} /> Answer selected
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold leading-relaxed mb-7 text-white">
                {selectedQuestion.question}
              </h2>

              <div className="space-y-3">
                {selectedQuestion.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswers(prev => ({
                      ...prev,
                      [current]: option
                    }))}
                    className={`w-full flex items-center gap-3 text-left border rounded-xl p-4 transition-all ${
                      answers[current] === option
                        ? 'border-cyan-400 bg-cyan-400/10 text-white'
                        : 'border-[#263244] hover:border-slate-500 bg-[#0B1422] text-white'
                    }`}
                  >
                    <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-semibold ${
                      answers[current] === option
                        ? 'bg-cyan-400 text-[#08111F]'
                        : 'bg-[#263244] text-white'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>

                    <span className="text-sm sm:text-base text-white">
                      {option}
                    </span>

                    {answers[current] === option && (
                      <Check size={17} className="ml-auto text-cyan-300 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center gap-3 mt-8 pt-5 border-t border-[#263244]">
                <button
                  disabled={current === 0}
                  onClick={() => setCurrent(v => v - 1)}
                  className="px-4 py-2.5 rounded-lg border border-[#263244] text-sm text-white hover:bg-[#172438] disabled:opacity-30"
                >
                  Previous
                </button>

                {current < quizQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrent(v => v + 1)}
                    className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#07111E] font-semibold text-sm flex items-center gap-2"
                  >
                    Next question <ChevronRight size={17} />
                  </button>
                ) : (
                  <button
                    onClick={finishQuiz}
                    disabled={answeredCount === 0}
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold text-sm disabled:opacity-40"
                  >
                    Submit quiz
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MAIN QUIZ LIBRARY
  return (
    <div className="min-h-screen bg-[#080F1C] text-white px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-cyan-400 mb-3">
              PDT STUDY / LEARNING
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              My quizzes
            </h1>
            <p className="text-sm text-slate-300 mt-2">
              Practise what you've learned and monitor your progress.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              onClick={openAI}
              className="bg-[#172438] hover:bg-[#22364F] border border-[#30445C] text-white font-semibold px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <Sparkles size={17} /> Generate with AI
            </button>

            <button
              onClick={openNew}
              className="bg-[#111B2B] hover:bg-[#172438] border border-[#263244] text-white font-semibold px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <Plus size={17} /> Create quiz
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total quizzes', value: quizzes.length, icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
            { label: 'Quiz attempts', value: attempts.length, icon: Target, color: 'text-violet-400', bg: 'bg-violet-400/10' },
            { label: 'Average score', value: `${averageScore}%`, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-400/10' }
          ].map(item => {
            const Icon = item.icon;

            return (
              <div key={item.label} className={`${panel} rounded-xl p-5`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-300">{item.label}</p>
                    <p className="text-2xl font-bold mt-2 tabular-nums text-white">
                      {item.value}
                    </p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <Icon size={21} className={item.color} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-semibold text-lg text-white">Your quiz library</h2>
            <p className="text-xs text-slate-300 mt-1">
              {filtered.length} {filtered.length === 1 ? 'quiz' : 'quizzes'} available
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your quizzes..."
              className={`${inputStyle} pl-10`}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={`${panel} rounded-2xl text-center py-16 px-5`}>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-400/10 flex items-center justify-center mb-4">
              <FileQuestion size={25} className="text-cyan-400" />
            </div>
            <h3 className="font-semibold text-lg text-white">
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
                className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm px-5 py-3 rounded-lg"
              >
                <Sparkles size={16} /> Generate your first quiz
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(quiz => {
              const subject = subjects.find(s => s.id === quiz.subject_id);
              const topic = topics.find(t => t.id === quiz.topic_id);
              const count = attempts.filter(a => a.quiz_id === quiz.id).length;

              return (
                <div
                  key={quiz.id}
                  className={`${panel} rounded-xl p-5 hover:border-[#3A526D] transition-colors`}
                >
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center shrink-0">
                          <BookOpen size={16} className="text-cyan-400" />
                        </span>
                        <span className="text-[10px] font-semibold tracking-widest text-slate-300 uppercase">
                          Study quiz
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg leading-snug break-words text-white">
                        {quiz.title}
                      </h3>
                      <p className="text-sm text-slate-300 mt-2 line-clamp-2">
                        {quiz.description || 'Practice quiz'}
                      </p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(quiz)}
                        title="Edit quiz"
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-cyan-400/10"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteQuiz(quiz)}
                        title="Delete quiz"
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-400/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 pt-4 border-t border-[#263244] text-xs text-slate-300">
                    {subject && <span>{subject.name}</span>}
                    {topic && <span>{topic.name}</span>}
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} /> {count} {count === 1 ? 'attempt' : 'attempts'}
                    </span>
                  </div>

                  <button
                    onClick={() => startQuiz(quiz)}
                    className="w-full mt-4 bg-[#172438] hover:bg-cyan-500 hover:text-white text-cyan-300 border border-[#30445C] hover:border-cyan-400 rounded-lg py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Play size={15} /> Start practising
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* AI GENERATOR MODAL */}
        {aiModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto flex items-start sm:items-center justify-center">
            <form
              onSubmit={handleGenerateQuiz}
              className={`${panel} w-full max-w-lg rounded-2xl p-5 sm:p-7 my-auto shadow-2xl`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cyan-400/10 flex items-center justify-center">
                    <Sparkles className="text-cyan-400" size={21} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">AI quiz generator</h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Create questions from your study topics
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => setAiModal(false)}
                  className="text-slate-300 hover:text-white p-1 disabled:opacity-30"
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
                    className={`${inputStyle} text-white`}
                  >
                    <option className="bg-[#111B2B] text-white" value="">All subjects</option>
                    {subjects.map(s => (
                      <option className="bg-[#111B2B] text-white" key={s.id} value={s.id}>
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
                    className={`${inputStyle} text-white`}
                  >
                    <option className="bg-[#111B2B] text-white" value="">Choose a topic</option>
                    {aiAvailableTopics.map(t => (
                      <option className="bg-[#111B2B] text-white" key={t.id} value={t.id}>
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
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className={`${inputStyle} text-white`}
                  >
                    <option className="bg-[#111B2B] text-white">Easy</option>
                    <option className="bg-[#111B2B] text-white">Medium</option>
                    <option className="bg-[#111B2B] text-white">Hard</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-2">Questions</label>
                    <select
                      value={questionCount}
                      onChange={e => setQuestionCount(e.target.value)}
                      className={`${inputStyle} text-white`}
                    >
                      <option className="bg-[#111B2B] text-white" value="5">5 questions</option>
                      <option className="bg-[#111B2B] text-white" value="10">10 questions</option>
                      <option className="bg-[#111B2B] text-white" value="15">15 questions</option>
                      <option className="bg-[#111B2B] text-white" value="20">20 questions</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-2">Question type</label>
                    <select
                      value={questionType}
                      onChange={e => setQuestionType(e.target.value)}
                      className={`${inputStyle} text-white`}
                    >
                      <option className="bg-[#111B2B] text-white">Multiple choice</option>
                      <option className="bg-[#111B2B] text-white">True/False</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || !aiTopicId}
                className="w-full mt-7 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 flex items-center justify-center gap-2 transition-colors"
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
              <p className="text-[11px] text-slate-300 text-center mt-3">
                Generated questions are saved to your quiz library.
              </p>
            </form>
          </div>
        )}

        {/* MANUAL QUIZ EDITOR */}
        {modal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
            <form
              onSubmit={saveQuiz}
              className={`${panel} max-w-3xl mx-auto my-4 rounded-2xl p-5 sm:p-7`}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-xs tracking-widest text-cyan-400 font-semibold mb-1">
                    QUIZ EDITOR
                  </p>
                  <h2 className="text-xl font-bold text-white">
                    {editing ? 'Edit quiz' : 'Create a quiz'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="text-slate-300 hover:text-white p-2"
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
                    className={`${inputStyle} text-white`}
                  >
                    <option className="bg-[#111B2B] text-white" value="">No subject</option>
                    {subjects.map(s => (
                      <option className="bg-[#111B2B] text-white" key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={topicId}
                    onChange={e => setTopicId(e.target.value)}
                    className={`${inputStyle} text-white`}
                  >
                    <option className="bg-[#111B2B] text-white" value="">No topic</option>
                    {availableTopics.map(t => (
                      <option className="bg-[#111B2B] text-white" key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-7 space-y-4">
                {questions.map((q, qi) => (
                  <div key={qi} className="border border-[#263244] rounded-xl p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-sm text-white">
                        Question {String(qi + 1).padStart(2, '0')}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qi)}
                        disabled={questions.length === 1}
                        className="text-slate-300 hover:text-red-400 disabled:opacity-30"
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

                    <p className="text-xs text-slate-200 mt-4 mb-2">
                      Answer options — select the correct answer
                    </p>

                    <div className="space-y-2">
                      {q.options.map((option, oi) => (
                        <div key={oi} className="flex gap-2 items-center">
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            checked={q.correct_answer === option && option !== ''}
                            onChange={() => updateQuestion(qi, 'correct_answer', option)}
                            disabled={!option.trim()}
                            className="accent-cyan-400"
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
                            className={`${inputStyle} py-2.5`}
                          />
                        </div>
                      ))}
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
                className="w-full border border-dashed border-[#3B526C] hover:border-cyan-400 text-cyan-300 rounded-lg py-3 mt-4 flex justify-center items-center gap-2 text-sm"
              >
                <Plus size={17} /> Add question
              </button>

              <button
                disabled={saving}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 mt-4"
              >
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Create quiz'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}