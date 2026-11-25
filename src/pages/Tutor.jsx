
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { generateChatResponse } from '../lib/ai-router';
import ChatHistory from '../components/ChatHistory';

import {
  ArrowUp, ArrowLeft, BookOpen, Loader2, Copy, Check, Menu,
  Calculator, FlaskConical, Landmark, ListChecks,
  RotateCcw, AlertCircle, X
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const SUGGESTIONS = [
  {
    icon: Calculator,
    title: 'Work through a problem',
    text: 'Explain quadratic equations step by step.'
  },
  {
    icon: FlaskConical,
    title: 'Compare concepts',
    text: 'What is the difference between mitosis and meiosis?'
  },
  {
    icon: Landmark,
    title: 'Understand a topic',
    text: 'Explain the causes of World War I.'
  },
  {
    icon: ListChecks,
    title: 'Practise what you know',
    text: 'Generate a practice quiz on cell biology.'
  }
];

const MARKDOWN_STYLES = [
  'prose prose-invert prose-sm max-w-none',
  'prose-p:leading-7 prose-p:text-[#CBD5E1]',
  'prose-headings:text-white prose-headings:font-semibold',
  'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
  'prose-strong:text-white',
  'prose-a:text-[#22D3EE]',
  'prose-li:text-[#CBD5E1] prose-li:marker:text-[#64748B]',
  'prose-blockquote:border-l-[#22D3EE] prose-blockquote:text-[#94A3B8]',
  'prose-code:text-[#67E8F9] prose-code:bg-[#1E293B]',
  'prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
  'prose-code:before:content-none prose-code:after:content-none',
  'prose-pre:bg-[#0B1422] prose-pre:border prose-pre:border-[#263244]',
  'prose-pre:rounded-lg prose-pre:text-[#CBD5E1]',
  'prose-th:text-[#E2E8F0] prose-td:text-[#CBD5E1]',
  'prose-hr:border-[#263244]'
].join(' ');

export default function Tutor() {
  const { user } = useAuth();
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
    const confirmed = window.confirm(
      'Delete this conversation? This action cannot be undone.'
    );

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
    <div className="fixed inset-0 z-40 flex h-[100dvh] w-full overflow-hidden bg-[#080F1C] text-[#E2E8F0]">

      <ChatHistory
        conversations={conversations}
        currentId={conversationId}
        onSelect={loadConversation}
        onNew={startNewChat}
        onDelete={deleteConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col">

        {/* Clean workspace header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#263244] px-3 sm:px-6">

          <div className="flex min-w-0 items-center gap-3">

            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Back to Dashboard"
              title="Back to Dashboard"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#263244] text-slate-400 transition hover:border-cyan-400/40 hover:bg-[#111B2B] hover:text-white"
            >
              <ArrowLeft size={19} />
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open conversation history"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-[#111B2B] hover:text-white md:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
              <BookOpen size={19} />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                PDT Study
              </p>
              <h1 className="truncate text-sm font-semibold text-white sm:text-base">
                Study Tutor
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewChat}
            disabled={loading || initializing}
            className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[#263244] px-3 text-xs font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-white disabled:opacity-40"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">New discussion</span>
            <span className="sm:hidden">New</span>
          </button>
        </header>

        {/* Error notification */}
        {error && (
          <div className="mx-3 mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 sm:mx-5">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Main conversation */}
        <section className="min-h-0 flex-1 overflow-y-auto">
          {initializing ? (
            <div className="flex h-full items-center justify-center gap-3 text-sm text-slate-400">
              <Loader2 size={19} className="animate-spin text-cyan-400" />
              Loading your study workspace...
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">

              <div className="mb-8">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                  <BookOpen size={29} className="text-cyan-400" />
                </div>

                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Your learning space
                </p>

                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  What would you like to learn?
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                  Explore concepts, work through academic problems and
                  strengthen your understanding at your own pace.
                </p>
              </div>

              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Suggested activities
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map(({ icon: Icon, title, text }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => send(text)}
                    disabled={!conversationId || loading}
                    className="rounded-xl border border-[#263244] bg-[#111B2B] p-4 text-left transition hover:border-cyan-400/30 hover:bg-[#152235] disabled:opacity-40"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Icon size={17} className="text-cyan-400" />
                      <span className="text-sm font-semibold text-white">
                        {title}
                      </span>
                    </div>
                    <p className="text-xs leading-5 text-slate-400">
                      {text}
                    </p>
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
                    className={`flex gap-3 sm:gap-4 ${
                      isUser ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      isUser
                        ? 'bg-cyan-400/10 text-cyan-300'
                        : 'bg-[#17263A] text-cyan-400'
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
                      <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">
                        {isUser ? 'You' : 'PDT Study Tutor'}
                      </p>

                      {isUser ? (
                        <div className="inline-block rounded-2xl rounded-tr-sm bg-[#17263A] px-4 py-3 text-left text-sm leading-6 text-slate-100">
                          {msg.content}
                        </div>
                      ) : msg.isError ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={17} className="mt-0.5 shrink-0" />
                            <span>{msg.content}</span>
                          </div>

                          {isLast && (
                            <button
                              type="button"
                              onClick={retryLast}
                              disabled={loading}
                              className="mt-3 flex items-center gap-2 text-xs font-medium hover:text-white"
                            >
                              <RotateCcw size={13} />
                              Try again
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
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
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition hover:bg-[#111B2B] hover:text-white"
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
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#17263A] text-cyan-400">
                    <BookOpen size={17} />
                  </div>
                  <Loader2 size={15} className="animate-spin text-cyan-400" />
                  Preparing your explanation...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </section>

        {/* Message composer */}
        <footer className="shrink-0 border-t border-[#263244] bg-[#080F1C] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5">
          <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-3xl"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-[#263244] bg-[#111B2B] p-2 transition focus-within:border-cyan-400/50">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question or enter a topic..."
                aria-label="Message the study tutor"
                disabled={!conversationId || initializing}
                className="max-h-40 min-h-[42px] min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-slate-500 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400 text-[#080F1C] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowUp size={19} />
                )}
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-600">
              Enter to send · Shift + Enter for a new line
            </p>
          </form>
        </footer>
      </main>
    </div>
  );
}
