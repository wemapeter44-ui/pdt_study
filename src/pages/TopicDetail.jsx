
import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Send, Bot, User, Plus,
  MessageSquare, Loader2, Menu, X, GraduationCap,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generateChatResponse } from '../lib/ai-router';

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
    <div className="flex flex-col h-full bg-[#0B1422]">
      <div className="p-5 flex items-center justify-between border-b border-[#263244]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-400/10 flex items-center justify-center">
            <GraduationCap size={20} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">PDT Study</p>
            <p className="text-slate-500 text-xs">Study workspace</p>
          </div>
        </div>
        <button
          onClick={() => setHistoryOpen(false)}
          className="lg:hidden text-slate-400 p-2"
        >
          <X size={19} />
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={startNewConversation}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 text-[#080F1C] font-semibold text-sm py-3 hover:bg-cyan-300 transition"
        >
          <Plus size={17} />
          New discussion
        </button>
      </div>

      <div className="px-4 pb-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold">
          Your discussions
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {conversations.length === 0 ? (
          <p className="text-xs text-slate-500 px-2 py-4">
            Your saved discussions will appear here.
          </p>
        ) : (
          conversations.map(conversation => (
            <button
              key={conversation.id}
              onClick={() => openConversation(conversation)}
              className={`w-full flex items-start gap-3 text-left p-3 rounded-xl transition ${
                activeConversation === conversation.id
                  ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20'
                  : 'text-slate-400 hover:bg-[#111B2B] hover:text-white border border-transparent'
              }`}
            >
              <MessageSquare size={16} className="mt-0.5 shrink-0" />
              <span className="text-xs leading-5 line-clamp-2">
                {conversation.title.replace(`${topic?.name} —`, '').trim()}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="p-4 border-t border-[#263244]">
        <Link
          to="/subjects"
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft size={15} />
          Back to subjects
        </Link>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080F1C] flex items-center justify-center text-slate-400 gap-2">
        <Loader2 size={20} className="animate-spin" />
        Loading study workspace...
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-[#080F1C] p-6 text-red-400">
        {error || 'Topic not found.'}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#080F1C] text-white flex overflow-hidden">
      {desktopSidebar && (
        <aside className="hidden lg:block w-[270px] shrink-0 border-r border-[#263244]">
          {historyPanel}
        </aside>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close discussion history"
            onClick={() => setHistoryOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <aside className="relative w-[min(85vw,300px)] h-full shadow-2xl">
            {historyPanel}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-[68px] shrink-0 border-b border-[#263244] px-3 sm:px-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setHistoryOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
              aria-label="Open discussions"
            >
              <Menu size={21} />
            </button>

            <button
              onClick={() => setDesktopSidebar(!desktopSidebar)}
              className="hidden lg:block p-2 text-slate-400 hover:text-white"
              aria-label="Toggle sidebar"
            >
              {desktopSidebar
                ? <PanelLeftClose size={20} />
                : <PanelLeftOpen size={20} />}
            </button>

            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">
                {subject?.name || 'Subject'}
              </p>
              <h1 className="font-semibold text-sm sm:text-base truncate">
                {topic.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:flex items-center gap-2 text-xs text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Topic Tutor
            </span>
            <Link
              to={`/subjects/${topic.subject_id}`}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#111B2B]"
              aria-label="Back to subject"
            >
              <ArrowLeft size={19} />
            </Link>
          </div>
        </header>

        <section className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-9">
            {messages.length === 0 && (
              <div className="min-h-[55vh] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mb-5">
                  <BookOpen size={29} className="text-cyan-400" />
                </div>
                <p className="text-cyan-300 text-xs font-semibold uppercase tracking-[0.18em] mb-3">
                  Your learning space
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Let's understand {topic.name}
                </h2>
                <p className="text-slate-400 text-sm max-w-md leading-6 mt-3">
                  Ask a question, request an explanation or explore a concept.
                  Your discussions are saved so you can continue learning later.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-8 w-full max-w-lg text-left">
                  {[
                    `Explain the basics of ${topic.name}`,
                    `Give me an example of ${topic.name}`
                  ].map(item => (
                    <button
                      key={item}
                      onClick={() => setQuestion(item)}
                      className="p-3 rounded-xl border border-[#263244] bg-[#111B2B] text-slate-300 text-xs hover:border-cyan-400/40 hover:text-white transition"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-7">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex gap-3 sm:gap-4 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-cyan-400/10 text-cyan-300'
                      : 'bg-[#17263A] text-cyan-400'
                  }`}>
                    {message.role === 'user'
                      ? <User size={16} />
                      : <Bot size={17} />}
                  </div>

                  <div className={`max-w-[88%] sm:max-w-[85%] min-w-0 ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                      {message.role === 'user' ? 'You' : 'PDT Study Tutor'}
                    </p>
                    <div className={`inline-block text-left rounded-2xl px-4 py-3 text-sm leading-7 whitespace-pre-wrap break-words ${
                      message.role === 'user'
                        ? 'bg-[#17263A] text-slate-100 rounded-tr-sm'
                        : 'bg-[#111B2B] border border-[#263244] text-slate-200 rounded-tl-sm'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex items-center gap-3 text-slate-400">
                  <div className="w-8 h-8 rounded-xl bg-[#17263A] flex items-center justify-center text-cyan-400">
                    <Bot size={17} />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Loader2 size={15} className="animate-spin" />
                    Preparing your explanation...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </section>

        <footer className="shrink-0 border-t border-[#263244] bg-[#080F1C] px-3 sm:px-6 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="max-w-3xl mx-auto">
            {error && (
              <p className="text-xs text-red-400 mb-2">{error}</p>
            )}

            <form
              onSubmit={handleSend}
              className="flex items-end gap-2 bg-[#111B2B] border border-[#263244] rounded-2xl p-2 focus-within:border-cyan-400/50 transition"
            >
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
                className="flex-1 min-w-0 max-h-32 resize-y bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none"
              />

              <button
                type="submit"
                disabled={!question.trim() || sending}
                className="w-10 h-10 shrink-0 rounded-xl bg-cyan-400 text-[#080F1C] flex items-center justify-center hover:bg-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                aria-label="Send message"
              >
                {sending
                  ? <Loader2 size={19} className="animate-spin" />
                  : <Send size={18} />}
              </button>
            </form>

            <p className="text-center text-[10px] text-slate-600 mt-2">
              PDT STUDY · LEARN WITH PURPOSE
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
