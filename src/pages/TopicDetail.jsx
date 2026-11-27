import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Send, Bot, User, Plus,
  MessageSquare, Loader2, Menu, X, GraduationCap,
  PanelLeftClose, PanelLeftOpen, AlertCircle, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generateChatResponse } from '../lib/ai-router';

/* ---------- local styles (self-contained, no extra files needed) ---------- */
// Colours use exact hex values so they work even if the Tailwind cyan palette is customised.
const glass =
  'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.td-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
.td-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
}
@keyframes td-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-24px,0) scale(1.08); } }
@keyframes td-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes td-pop { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes td-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes td-dot { 0%,80%,100% { transform: translateY(0); opacity: .35; } 40% { transform: translateY(-5px); opacity: 1; } }
@keyframes td-skel { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@keyframes td-drawer { from { transform: translateX(-100%); } to { transform: none; } }
.td-orb { animation: td-float 14s ease-in-out infinite; }
.td-rise { animation: td-rise .5s cubic-bezier(.2,.7,.2,1) both; }
.td-pop { animation: td-pop .3s cubic-bezier(.2,.7,.2,1) both; }
.td-fade { animation: td-fade .25s ease both; }
.td-dot { animation: td-dot 1.2s ease-in-out infinite; }
.td-drawer { animation: td-drawer .3s cubic-bezier(.2,.8,.2,1) both; }
.td-skel {
  background: linear-gradient(90deg, rgba(255,255,255,.05) 25%, rgba(255,255,255,.14) 50%, rgba(255,255,255,.05) 75%);
  background-size: 200% 100%;
  animation: td-skel 1.6s ease-in-out infinite;
}
.td-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.3), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.td-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
.td-scroll::-webkit-scrollbar { width: 8px; }
.td-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 8px; }
@media (prefers-reduced-motion: reduce) {
  .td-orb, .td-rise, .td-pop, .td-fade, .td-dot, .td-skel, .td-drawer { animation: none !important; }
  .td-shine::before { transition: none; }
}
`;

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="td-grid absolute inset-0" />
      <div className="td-orb absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-[#22D3EE]/20 blur-[120px]" />
      <div className="td-orb absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-[120px]" style={{ animationDelay: '-5s' }} />
      <div className="td-orb absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-600/15 blur-[120px]" style={{ animationDelay: '-9s' }} />
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <span aria-hidden className={`td-skel block rounded-lg ${className}`} />;
}

export default function TopicDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [topic, setTopic] = useState(null);
  const [subject, setSubject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [desktopSidebar, setDesktopSidebar] = useState(true);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user) loadTopic();
  }, [id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function loadTopic() {
    setLoading(true);
    setError('');

    const { data, error: topicError } = await supabase
      .from('topics')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (topicError || !data) {
      setError('Topic could not be loaded.');
      setLoading(false);
      return;
    }

    setTopic(data);

    const { data: subjectData } = await supabase
      .from('subjects')
      .select('id, name, color')
      .eq('id', data.subject_id)
      .eq('user_id', user.id)
      .single();

    setSubject(subjectData);

    const { data: savedConversations, error: conversationError } =
      await supabase
        .from('tutor_conversations')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .ilike('title', `${data.name} —%`)
        .order('created_at', { ascending: false });

    if (conversationError) {
      setError(conversationError.message);
    } else {
      setConversations(savedConversations || []);
    }

    setLoading(false);
  }

  async function openConversation(conversation) {
    setError('');
    setActiveConversation(conversation.id);
    setMessages([]);
    setHistoryOpen(false);

    const { data, error: messageError } = await supabase
      .from('tutor_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (messageError) {
      setError(messageError.message);
      return;
    }

    setMessages(data || []);
  }

  function startNewConversation() {
    setActiveConversation(null);
    setMessages([]);
    setQuestion('');
    setError('');
    setHistoryOpen(false);
  }

  async function handleSend(e) {
    e?.preventDefault();

    const text = question.trim();
    if (!text || sending || !topic) return;

    setQuestion('');
    setSending(true);
    setError('');

    const updatedMessages = [
      ...messages,
      { role: 'user', content: text }
    ];

    setMessages(updatedMessages);

    try {
      let conversationId = activeConversation;

      if (!conversationId) {
        const { data: newConversation, error: createError } =
          await supabase
            .from('tutor_conversations')
            .insert({
              user_id: user.id,
              title: `${topic.name} — ${text.slice(0, 60)}`
            })
            .select('id, title, created_at')
            .single();

        if (createError) throw createError;

        conversationId = newConversation.id;
        setActiveConversation(conversationId);
        setConversations(prev => [newConversation, ...prev]);
      }

      const { error: saveUserError } = await supabase
        .from('tutor_messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: text
        });

      if (saveUserError) throw saveUserError;

      const response = await generateChatResponse(updatedMessages);

      const { data: savedAssistantMessage, error: saveAssistantError } =
        await supabase
          .from('tutor_messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: response
          })
          .select()
          .single();

      if (saveAssistantError) throw saveAssistantError;

      setMessages(prev => [...prev, savedAssistantMessage]);
    } catch (err) {
      setError(err.message || 'Unable to send your question.');
      setQuestion(text);
    } finally {
      setSending(false);
    }
  }

  const historyPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-[#22D3EE]/40 blur-md" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500">
              <GraduationCap size={20} className="text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-white">PDT Study</p>
            <p className="text-xs text-slate-400">Study workspace</p>
          </div>
        </div>
        <button
          onClick={() => setHistoryOpen(false)}
          className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close discussions"
        >
          <X size={19} />
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={startNewConversation}
          className="td-shine relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-[#22D3EE]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#22D3EE]/40 active:translate-y-0"
        >
          <Plus size={17} />
          New discussion
        </button>
      </div>

      <div className="px-4 pb-2">
        <p className="text-xs font-semibold text-slate-400">
          Your discussions
        </p>
      </div>

      <div className="td-scroll flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
        {conversations.length === 0 ? (
          <div className="px-2 py-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <MessageSquare size={19} className="text-slate-400" />
            </div>
            <p className="mt-3 text-xs text-slate-300">
              Your saved discussions will appear here.
            </p>
          </div>
        ) : (
          conversations.map(conversation => {
            const active = activeConversation === conversation.id;

            return (
              <button
                key={conversation.id}
                onClick={() => openConversation(conversation)}
                className={`relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  active
                    ? 'border-white/10 bg-gradient-to-r from-[#22D3EE]/15 to-violet-500/10 text-white'
                    : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {active && (
                  <span className="absolute inset-y-2.5 -left-3 w-1 rounded-full bg-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                )}
                <MessageSquare
                  size={16}
                  className={`mt-0.5 shrink-0 ${active ? 'text-[#22D3EE]' : 'text-slate-400'}`}
                />
                <span className="line-clamp-2 text-xs leading-5">
                  {conversation.title.replace(`${topic?.name} —`, '').trim()}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <Link
          to="/subjects"
          className="group flex items-center gap-2 text-xs text-slate-300 transition-colors hover:text-white"
        >
          <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
          Back to subjects
        </Link>
      </div>
    </div>
  );

  /* ---------- LOADING (skeleton) ---------- */
  if (loading) {
    return (
      <div className="td-root fixed inset-0 z-40 flex overflow-hidden bg-[#060B16] text-white">
        <style>{styles}</style>
        <Backdrop />

        <aside className="relative z-10 hidden w-[270px] shrink-0 border-r border-white/10 bg-[#060B16]/70 p-5 backdrop-blur-xl lg:block">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 !rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          </div>
          <Skeleton className="mt-6 h-11 w-full !rounded-xl" />
          <Skeleton className="mt-7 h-3 w-24" />
          <div className="mt-4 space-y-2.5">
            {[1, 2, 3].map(n => <Skeleton key={n} className="h-12 w-full !rounded-xl" />)}
          </div>
        </aside>

        <main className="relative z-10 flex min-w-0 flex-1 flex-col" aria-busy="true" aria-label="Loading study workspace">
          <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-5">
            <div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-4 w-44" />
            </div>
            <Skeleton className="h-8 w-8 !rounded-lg" />
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 text-center">
            <Skeleton className="h-16 w-16 !rounded-2xl" />
            <Skeleton className="mt-6 h-3 w-32" />
            <Skeleton className="mt-4 h-8 w-72 max-w-full" />
            <Skeleton className="mt-4 h-3 w-80 max-w-full" />
            <Skeleton className="mt-2 h-3 w-64 max-w-full" />
          </div>

          <div className="px-4 pb-5 sm:px-6">
            <Skeleton className="mx-auto h-14 w-full max-w-3xl !rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  /* ---------- NOT FOUND ---------- */
  if (!topic) {
    return (
      <div className="td-root relative flex min-h-screen items-center justify-center bg-[#060B16] p-6 text-white">
        <style>{styles}</style>
        <Backdrop />
        <div className={`${glass} td-pop relative z-10 flex max-w-md items-start gap-3 rounded-2xl p-5 text-rose-200`}>
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-rose-400" />
          <p className="text-sm">{error || 'Topic not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="td-root fixed inset-0 z-40 flex overflow-hidden bg-[#060B16] text-white">
      <style>{styles}</style>
      <Backdrop />

      {desktopSidebar && (
        <aside className="relative z-10 hidden w-[270px] shrink-0 border-r border-white/10 bg-[#060B16]/70 backdrop-blur-xl lg:block">
          {historyPanel}
        </aside>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close discussion history"
            onClick={() => setHistoryOpen(false)}
            className="td-fade absolute inset-0 bg-[#02050B]/70 backdrop-blur-sm"
          />
          <aside className="td-drawer relative h-full w-[min(85vw,300px)] border-r border-white/10 bg-[#0B1220]/95 shadow-[20px_0_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            {historyPanel}
          </aside>
        </div>
      )}

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#060B16]/60 px-3 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setHistoryOpen(true)}
              className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Open discussions"
            >
              <Menu size={21} />
            </button>

            <button
              onClick={() => setDesktopSidebar(!desktopSidebar)}
              className="hidden rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:block"
              aria-label="Toggle sidebar"
            >
              {desktopSidebar
                ? <PanelLeftClose size={20} />
                : <PanelLeftOpen size={20} />}
            </button>

            <div className="min-w-0">
              <p className="truncate text-xs text-slate-400">
                {subject?.name || 'Subject'}
              </p>
              <h1 className="truncate text-sm font-semibold sm:text-base">
                {topic.name}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-[#22D3EE]/20 bg-[#22D3EE]/10 px-3 py-1.5 text-xs font-medium text-[#67E8F9] sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22D3EE] shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              Topic Tutor
            </span>
            <Link
              to={`/subjects/${topic.subject_id}`}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-300 transition hover:-translate-x-0.5 hover:bg-white/10 hover:text-white"
              aria-label="Back to subject"
            >
              <ArrowLeft size={18} />
            </Link>
          </div>
        </header>

        <section className="td-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-3 py-6 sm:px-6 sm:py-9">
            {messages.length === 0 && (
              <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                <div className="td-rise relative mb-6 h-16 w-16">
                  <div className="absolute inset-0 rounded-2xl bg-[#22D3EE]/40 blur-xl" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22D3EE] to-violet-500 shadow-lg shadow-[#22D3EE]/30">
                    <BookOpen size={29} className="text-white" />
                  </div>
                </div>

                <h2 className="td-rise bg-gradient-to-b from-white to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl" style={{ animationDelay: '60ms' }}>
                  Let's understand {topic.name}
                </h2>

                <p className="td-rise mt-4 max-w-md text-sm leading-6 text-slate-300" style={{ animationDelay: '120ms' }}>
                  Ask a question, request an explanation or explore a concept.
                  Your discussions are saved so you can continue learning later.
                </p>

                <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-3 text-left sm:grid-cols-2">
                  {[
                    `Explain the basics of ${topic.name}`,
                    `Give me an example of ${topic.name}`
                  ].map((item, i) => (
                    <button
                      key={item}
                      onClick={() => setQuestion(item)}
                      style={{ animationDelay: `${180 + i * 70}ms` }}
                      className="td-rise group rounded-2xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-px transition-all duration-300 hover:-translate-y-1 hover:from-[#22D3EE]/50"
                    >
                      <div className={`${glass} flex h-full items-start gap-2.5 rounded-2xl p-4 text-xs leading-5 text-slate-200 transition-colors group-hover:bg-white/[0.07] group-hover:text-white`}>
                        <Sparkles size={15} className="mt-0.5 shrink-0 text-[#67E8F9]" />
                        {item}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-7">
              {messages.map((message, index) => {
                const isUser = message.role === 'user';

                return (
                  <div
                    key={message.id || index}
                    className={`td-rise flex gap-3 sm:gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isUser
                        ? 'border border-white/10 bg-white/[0.08] text-white'
                        : 'bg-gradient-to-br from-[#22D3EE] to-violet-500 text-white shadow-lg shadow-[#22D3EE]/20'
                    }`}>
                      {isUser ? <User size={16} /> : <Bot size={17} />}
                    </div>

                    <div className={`min-w-0 max-w-[88%] sm:max-w-[85%] ${isUser ? 'text-right' : ''}`}>
                      <p className="mb-1.5 text-xs font-medium text-slate-400">
                        {isUser ? 'You' : 'PDT Study Tutor'}
                      </p>
                      <div className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-left text-sm leading-7 ${
                        isUser
                          ? 'rounded-tr-md bg-gradient-to-br from-cyan-500/90 to-blue-600/90 text-white shadow-lg shadow-[#22D3EE]/15'
                          : `${glass} rounded-tl-md text-slate-200`
                      }`}>
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="td-fade flex items-center gap-3 sm:gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-white shadow-lg shadow-[#22D3EE]/20">
                    <Bot size={17} />
                  </div>
                  <div className={`${glass} flex items-center gap-3 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-slate-300`}>
                    <span className="flex items-center gap-1" aria-hidden>
                      {[0, 1, 2].map(n => (
                        <span
                          key={n}
                          className="td-dot h-1.5 w-1.5 rounded-full bg-[#22D3EE]"
                          style={{ animationDelay: `${n * 0.15}s` }}
                        />
                      ))}
                    </span>
                    Preparing your explanation...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </section>

        <footer className="shrink-0 bg-gradient-to-t from-[#060B16] via-[#060B16]/90 to-transparent px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            {error && (
              <div className="td-pop mb-3 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
                {error}
              </div>
            )}

            <form onSubmit={handleSend} className="group relative">
              <div className="pointer-events-none absolute -inset-px rounded-[1.4rem] bg-gradient-to-r from-[#22D3EE]/0 via-violet-400/0 to-[#22D3EE]/0 opacity-0 blur-md transition-all duration-500 group-focus-within:from-[#22D3EE]/40 group-focus-within:via-violet-500/40 group-focus-within:to-[#22D3EE]/40 group-focus-within:opacity-100" />

              <div className="relative flex items-end gap-2 rounded-3xl border border-white/10 bg-[#0B1220]/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl transition-colors group-focus-within:border-[#22D3EE]/50">
                <textarea
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Ask about ${topic.name}...`}
                  rows={1}
                  className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-y bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />

                <button
                  type="submit"
                  disabled={!question.trim() || sending}
                  className="td-shine relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-white shadow-lg shadow-[#22D3EE]/25 transition-all hover:scale-105 hover:shadow-[#22D3EE]/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100"
                  aria-label="Send message"
                >
                  {sending
                    ? <Loader2 size={19} className="animate-spin" />
                    : <Send size={18} />}
                </button>
              </div>
            </form>

            <p className="mt-2.5 text-center text-xs text-slate-500">
              PDT Study · Learn with purpose
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}