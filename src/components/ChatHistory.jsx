import { useMemo, useState } from 'react';
import { Trash2, MessageSquare, Plus, X, History, Search } from 'lucide-react';

// Colours use exact hex values so they work even if the Tailwind cyan palette is customised.
const styles = `
.ch-scroll::-webkit-scrollbar { width: 6px; }
.ch-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 6px; }
.ch-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.ch-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
@keyframes ch-drawer { from { transform: translateX(-100%); } to { transform: none; } }
@keyframes ch-fade { from { opacity: 0; } to { opacity: 1; } }
.ch-drawer { animation: ch-drawer .3s cubic-bezier(.2,.8,.2,1) both; }
.ch-fade { animation: ch-fade .2s ease both; }
@media (prefers-reduced-motion: reduce) {
  .ch-shine::before { transition: none; }
  .ch-drawer, .ch-fade { animation: none !important; }
}
`;

const newBtnClass =
  'ch-shine relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-[#22D3EE]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#22D3EE]/40 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]';

function groupConversations(list) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const day = 24 * 60 * 60 * 1000;
  const today = startOfToday.getTime();

  const groups = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Older', items: [] }
  ];

  list.forEach((conversation) => {
    const time = new Date(conversation.created_at).getTime();

    if (!time || time >= today) groups[0].items.push(conversation);
    else if (time >= today - day) groups[1].items.push(conversation);
    else if (time >= today - 7 * day) groups[2].items.push(conversation);
    else groups[3].items.push(conversation);
  });

  return groups.filter((group) => group.items.length > 0);
}

export default function ChatHistory({
  conversations,
  currentId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onClose
}) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const visible = needle
      ? conversations.filter((conversation) =>
          (conversation.title || 'New conversation').toLowerCase().includes(needle)
        )
      : conversations;

    return groupConversations(visible);
  }, [conversations, query]);

  const searchBox = (
    <div className="relative">
      <Search
        size={15}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search conversations"
        aria-label="Search conversations"
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-all [color-scheme:dark] placeholder:text-slate-500 focus:border-[#22D3EE]/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#22D3EE]/10"
      />
    </div>
  );

  const conversationList = (
    <div className="ch-scroll flex-1 overflow-y-auto px-3 pb-4">
      {groups.map((group) => (
        <div key={group.label} className="mb-3">
          <p className="px-3 pb-1.5 pt-2 text-xs font-semibold text-slate-400">
            {group.label}
          </p>

          <div className="space-y-1">
            {group.items.map((conversation) => {
              const active = currentId === conversation.id;

              return (
                <div
                  key={conversation.id}
                  className={`group relative flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${
                    active
                      ? 'border-white/10 bg-gradient-to-r from-[#22D3EE]/15 to-violet-500/10 text-white'
                      : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {active && (
                    <span className="absolute inset-y-2.5 -left-3 w-1 rounded-full bg-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                  )}

                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
                    title={conversation.title || 'New conversation'}
                  >
                    <MessageSquare
                      size={15}
                      className={`shrink-0 ${active ? 'text-[#22D3EE]' : 'text-slate-400'}`}
                    />

                    <span className="truncate text-sm font-medium">
                      {conversation.title || 'New conversation'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(conversation.id)}
                    aria-label="Delete conversation"
                    title="Delete conversation"
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 opacity-100 transition hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {groups.length === 0 && (
        <div className="px-3 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <MessageSquare size={20} className="text-slate-400" />
          </div>
          <p className="mt-3 text-sm text-slate-300">
            {query ? 'No matching conversations' : 'No previous conversations'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{styles}</style>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="ch-fade fixed inset-0 z-40 bg-[#02050B]/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      {isOpen && (
        <aside
          className="ch-drawer fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r border-white/10 bg-[#0B1220] shadow-[20px_0_60px_rgba(0,0,0,0.5)] md:hidden"
          aria-label="Conversation history"
        >
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
            <span className="flex items-center gap-2.5 text-base font-semibold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500">
                <History size={16} />
              </span>
              Conversations
            </span>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close conversation history"
              className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 p-3">
            <button
              type="button"
              onClick={() => {
                onNew();
                onClose();
              }}
              className={newBtnClass}
            >
              <Plus size={16} />
              New conversation
            </button>

            {searchBox}
          </div>

          {conversationList}
        </aside>
      )}

      {/* Desktop sidebar - always visible */}
      <aside
        className="relative z-10 hidden w-72 shrink-0 flex-col border-r border-white/10 bg-[#060B16]/70 backdrop-blur-xl md:flex"
        aria-label="Conversation history"
      >
        <div className="space-y-4 border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500 shadow-lg shadow-[#22D3EE]/20">
              <History size={17} className="text-white" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Study history</p>
              <p className="mt-0.5 text-xs text-slate-400">Your previous conversations</p>
            </div>
          </div>

          <button type="button" onClick={onNew} className={newBtnClass}>
            <Plus size={16} />
            New conversation
          </button>

          {searchBox}
        </div>

        <div className="pt-2" />

        {conversationList}
      </aside>
    </>
  );
}