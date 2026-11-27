import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmProvider';
import { supabase } from '../lib/supabase';
import { generateChatResponse } from '../lib/ai-router';
import ChatHistory from '../components/ChatHistory';

import {
  ArrowUp, ArrowLeft, BookOpen, Loader2, Copy, Check, Menu,
  Calculator, FlaskConical, Landmark, ListChecks,
  RotateCcw, AlertCircle, X, Plus, Sparkles
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyToClipboard } from 'react-copy-to-clipboard';

/* ---------- local styles (self-contained, no extra files needed) ---------- */
const glass =
  'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white';

const themeStyles = `
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
@keyframes qz-dot { 0%,80%,100% { transform: translateY(0); opacity: .35; } 40% { transform: translateY(-5px); opacity: 1; } }
.qz-orb { animation: qz-float 14s ease-in-out infinite; }
.qz-rise { animation: qz-rise .55s cubic-bezier(.2,.7,.2,1) both; }
.qz-pop { animation: qz-pop .3s cubic-bezier(.2,.7,.2,1) both; }
.qz-fade { animation: qz-fade .25s ease both; }
.qz-dot { animation: qz-dot 1.2s ease-in-out infinite; }
.qz-btn-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.3), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.qz-btn-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
.qz-scroll::-webkit-scrollbar { width: 8px; }
.qz-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 8px; }
@media (prefers-reduced-motion: reduce) {
  .qz-orb, .qz-rise, .qz-pop, .qz-fade, .qz-dot { animation: none !important; }
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

const SUGGESTIONS = [
  {
    icon: Calculator,
    title: 'Work through a problem',
    text: 'Explain quadratic equations step by step.',
    tint: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20',
    hover: 'hover:from-cyan-400/50'
  },
  {
    icon: FlaskConical,
    title: 'Compare concepts',
    text: 'What is the difference between mitosis and meiosis?',
    tint: 'text-violet-300 bg-violet-400/10 border-violet-400/20',
    hover: 'hover:from-violet-400/50'
  },
  {
    icon: Landmark,
    title: 'Understand a topic',
    text: 'Explain the causes of World War I.',
    tint: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
    hover: 'hover:from-amber-400/50'
  },
  {
    icon: ListChecks,
    title: 'Practise what you know',
    text: 'Generate a practice quiz on cell biology.',
    tint: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
    hover: 'hover:from-emerald-400/50'
  }
];

const MARKDOWN_STYLES = [
  'prose prose-invert prose-sm max-w-none',
  'prose-p:leading-7 prose-p:text-slate-300',
  'prose-headings:text-white prose-headings:font-semibold',
  'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
  'prose-strong:text-white',
  'prose-a:text-cyan-300 prose-a:no-underline hover:prose-a:underline',
  'prose-li:text-slate-300 prose-li:marker:text-cyan-400/60',
  'prose-blockquote:border-l-cyan-400 prose-blockquote:text-slate-400',
  'prose-code:text-cyan-200 prose-code:bg-white/10',
  'prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md',
  'prose-code:before:content-none prose-code:after:content-none',
  'prose-pre:bg-[#060B16]/80 prose-pre:border prose-pre:border-white/10',
  'prose-pre:rounded-xl prose-pre:text-slate-200',
  'prose-th:text-slate-100 prose-td:text-slate-300',
  'prose-hr:border-white/10'
].join(' ');

export default function Tutor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end'
    });
  }, [messages, loading]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return [];

    const { data, error } = await supabase
      .from('tutor_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    setConversations(data || []);
    return data || [];
  }, [user?.id]);

  const loadConversation = useCallback(async (id) => {
    if (!id || loading) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('tutor_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      setConversationId(id);
      setIsSidebarOpen(false);
    } catch (err) {
      setError(err.message || 'Unable to load this conversation.');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const startNewChat = useCallback(async () => {
    if (!user?.id || loading) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('tutor_conversations')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      setConversationId(data.id);
      setMessages([]);
      await fetchConversations();
      setIsSidebarOpen(false);
    } catch (err) {
      setError(err.message || 'Unable to start a new conversation.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, loading, fetchConversations]);

  useEffect(() => {
    if (!user?.id) {
      setInitializing(false);
      return;
    }

    let cancelled = false;

    async function initialise() {
      setInitializing(true);
      setError('');

      try {
        const list = await fetchConversations();
        if (cancelled) return;

        if (list.length > 0) {
          const first = list[0];

          const { data, error } = await supabase
            .from('tutor_messages')
            .select('*')
            .eq('conversation_id', first.id)
            .order('created_at', { ascending: true });

          if (error) throw error;
          if (cancelled) return;

          setConversationId(first.id);
          setMessages(data || []);
        } else {
          const { data, error } = await supabase
            .from('tutor_conversations')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (error) throw error;
          if (cancelled) return;

          setConversationId(data.id);
          setMessages([]);
          await fetchConversations();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to initialise the tutor.');
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    initialise();

    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchConversations]);

  async function send(text, baseMessages = messages) {
    const userMsg = (text ?? input).trim();

    if (!userMsg || loading || !conversationId) return;

    const activeConversation = conversationId;

    const newMessages = [
      ...baseMessages,
      { role: 'user', content: userMsg }
    ];

    setInput('');
    setError('');
    setMessages(newMessages);
    setLoading(true);

    try {
      const { error: userError } = await supabase
        .from('tutor_messages')
        .insert({
          conversation_id: activeConversation,
          role: 'user',
          content: userMsg
        });

      if (userError) throw userError;

      const aiMsg = await generateChatResponse(newMessages);

      if (typeof aiMsg !== 'string' || !aiMsg.trim()) {
        throw new Error('The tutor returned an empty response.');
      }

      const { error: assistantError } = await supabase
        .from('tutor_messages')
        .insert({
          conversation_id: activeConversation,
          role: 'assistant',
          content: aiMsg
        });

      if (assistantError) throw assistantError;

      setMessages([
        ...newMessages,
        { role: 'assistant', content: aiMsg }
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function retryLast() {
    if (loading) return;

    const lastUser = [...messages]
      .reverse()
      .find(message => message.role === 'user');

    if (!lastUser) return;

    const baseMessages = messages.slice(0, messages.length - 1);
    setMessages(baseMessages);
    send(lastUser.content, baseMessages);
  }

  async function deleteConversation(id) {
    const confirmed = await confirm({
      title: 'Delete conversation?',
      message: 'Delete this conversation? This action cannot be undone.',
      confirmText: 'Delete conversation',
      cancelText: 'Keep conversation',
      danger: true
    });

    if (!confirmed || loading) return;

    setError('');

    try {
      const { error: messageError } = await supabase
        .from('tutor_messages')
        .delete()
        .eq('conversation_id', id);

      if (messageError) throw messageError;

      const { error: conversationError } = await supabase
        .from('tutor_conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (conversationError) throw conversationError;

      const remaining = await fetchConversations();

      if (conversationId === id) {
        setMessages([]);
        setConversationId(null);

        if (remaining.length > 0) {
          const first = remaining[0];

          const { data, error } = await supabase
            .from('tutor_messages')
            .select('*')
            .eq('conversation_id', first.id)
            .order('created_at', { ascending: true });

          if (error) throw error;

          setMessages(data || []);
          setConversationId(first.id);
        } else {
          await startNewChat();
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to delete this conversation.');
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send();
  }

  function handleKeyDown(e) {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault();
      send();
    }
  }

  const canSend =
    input.trim().length > 0 &&
    !loading &&
    !!conversationId;

  return (
    <div className="qz-root fixed inset-0 z-40 flex h-[100dvh] w-full overflow-hidden bg-[#060B16] text-slate-200">
      <style>{themeStyles}</style>
      <Backdrop />

      <ChatHistory
        conversations={conversations}
        currentId={conversationId}
        onSelect={loadConversation}
        onNew={startNewChat}
        onDelete={deleteConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">

        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#060B16]/60 px-3 backdrop-blur-xl sm:px-6">

          <div className="flex min-w-0 items-center gap-3">

            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Back to Dashboard"
              title="Back to Dashboard"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:-translate-x-0.5 hover:border-cyan-400/40 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open conversation history"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white md:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-xl bg-cyan-400/40 blur-md" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white">
                <BookOpen size={19} />
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-white">
                Study Tutor
              </h1>
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                PDT Study · Online
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewChat}
            disabled={loading || initializing}
            className="qz-btn-shine relative flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white transition hover:border-cyan-400/40 hover:bg-white/10 disabled:opacity-40"
          >
            <Plus size={16} className="text-cyan-300" />
            <span className="hidden sm:inline">New discussion</span>
            <span className="sm:hidden">New</span>
          </button>
        </header>

        {/* Error notification */}
        {error && (
          <div className="qz-pop mx-3 mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3.5 text-sm text-rose-200 backdrop-blur-md sm:mx-5">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
              className="rounded-md p-0.5 text-rose-300 transition hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Conversation */}
        <section className="qz-scroll min-h-0 flex-1 overflow-y-auto">
          {initializing ? (
            <div className="flex h-full items-center justify-center">
              <div className={`${glass} flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm text-slate-300`}>
                <Loader2 size={18} className="animate-spin text-cyan-400" />
                Loading your study workspace...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">

              <div className="qz-rise mb-10">
                <div className="relative mb-6 h-16 w-16">
                  <div className="absolute inset-0 rounded-2xl bg-cyan-400/40 blur-xl" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/30">
                    <BookOpen size={29} className="text-white" />
                  </div>
                </div>

                <h2 className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                  What would you like to learn?
                </h2>

                <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                  Explore concepts, work through academic problems and
                  strengthen your understanding at your own pace.
                </p>
              </div>

              <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
                <Sparkles size={15} className="text-cyan-300" />
                Try one of these
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map(({ icon: Icon, title, text, tint, hover }, i) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => send(text)}
                    disabled={!conversationId || loading}
                    style={{ animationDelay: `${120 + i * 70}ms` }}
                    className={`qz-rise group rounded-2xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-px text-left transition-all duration-300 hover:-translate-y-1 disabled:opacity-40 disabled:hover:translate-y-0 ${hover}`}
                  >
                    <div className={`${glass} h-full rounded-2xl p-4 transition-colors group-hover:bg-white/[0.07]`}>
                      <div className="mb-3 flex items-center gap-3">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${tint}`}>
                          <Icon size={17} />
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {title}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-300">
                        {text}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-7 px-3 py-6 sm:px-6 sm:py-9">

              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isLast = idx === messages.length - 1;

                return (
                  <div
                    key={msg.id ?? idx}
                    className={`qz-rise flex gap-3 sm:gap-4 ${
                      isUser ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isUser
                        ? 'border border-white/10 bg-white/[0.08] text-white'
                        : 'bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-cyan-500/20'
                    }`}>
                      {isUser ? (
                        <span className="text-xs font-bold">You</span>
                      ) : (
                        <BookOpen size={17} />
                      )}
                    </div>

                    <div className={`min-w-0 max-w-[88%] sm:max-w-[85%] ${
                      isUser ? 'text-right' : 'flex-1'
                    }`}>
                      <p className="mb-1.5 text-xs font-medium text-slate-400">
                        {isUser ? 'You' : 'PDT Study Tutor'}
                      </p>

                      {isUser ? (
                        <div className="inline-block rounded-2xl rounded-tr-md bg-gradient-to-br from-cyan-500/90 to-blue-600/90 px-4 py-3 text-left text-sm leading-6 text-white shadow-lg shadow-cyan-500/15">
                          {msg.content}
                        </div>
                      ) : msg.isError ? (
                        <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
                            <span>{msg.content}</span>
                          </div>

                          {isLast && (
                            <button
                              type="button"
                              onClick={retryLast}
                              disabled={loading}
                              className="mt-3 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                            >
                              <RotateCcw size={13} />
                              Try again
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className={`${glass} rounded-2xl rounded-tl-md px-4 py-4 sm:px-5`}>
                          <div className={MARKDOWN_STYLES}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>

                          <CopyToClipboard
                            text={msg.content}
                            onCopy={() => {
                              setCopiedIndex(idx);

                              if (copyTimerRef.current) {
                                clearTimeout(copyTimerRef.current);
                              }

                              copyTimerRef.current = setTimeout(() => {
                                setCopiedIndex(null);
                              }, 1800);
                            }}
                          >
                            <button
                              type="button"
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check size={14} className="text-emerald-400" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={14} />
                                  Copy response
                                </>
                              )}
                            </button>
                          </CopyToClipboard>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="qz-fade flex items-center gap-3 sm:gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-cyan-500/20">
                    <BookOpen size={17} />
                  </div>
                  <div className={`${glass} flex items-center gap-3 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-slate-300`}>
                    <span className="flex items-center gap-1" aria-hidden>
                      {[0, 1, 2].map(n => (
                        <span
                          key={n}
                          className="qz-dot h-1.5 w-1.5 rounded-full bg-cyan-400"
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
          )}
        </section>

        {/* Composer */}
        <footer className="shrink-0 bg-gradient-to-t from-[#060B16] via-[#060B16]/90 to-transparent px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-5">
          <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-3xl"
          >
            <div className="group relative">
              <div className="pointer-events-none absolute -inset-px rounded-[1.4rem] bg-gradient-to-r from-cyan-400/0 via-violet-400/0 to-cyan-400/0 opacity-0 blur-md transition-all duration-500 group-focus-within:from-cyan-400/40 group-focus-within:via-violet-500/40 group-focus-within:to-cyan-400/40 group-focus-within:opacity-100" />

              <div className="relative flex items-end gap-2 rounded-3xl border border-white/10 bg-[#0B1220]/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl transition-colors group-focus-within:border-cyan-400/50">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question or enter a topic..."
                  aria-label="Message the study tutor"
                  disabled={!conversationId || initializing}
                  className="max-h-40 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="Send message"
                  className="qz-btn-shine relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 hover:shadow-cyan-400/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ArrowUp size={20} />
                  )}
                </button>
              </div>
            </div>

            <p className="mt-2.5 text-center text-xs text-slate-500">
              Press Enter to send, Shift + Enter for a new line
            </p>
          </form>
        </footer>
      </main>
    </div>
  );
}
