import { Trash2, MessageSquare, Plus, X, History } from 'lucide-react';

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
@media (prefers-reduced-motion: reduce) { .ch-shine::before { transition: none; } }
`;

const newBtnClass =
  'ch-shine relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-[#22D3EE]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#22D3EE]/40 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]';

export default function ChatHistory({
  conversations,
  currentId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onClose
}) {
  const conversationList = (
    <div className="ch-scroll flex-1 space-y-1.5 overflow-y-auto p-3">
      {conversations.map((conversation) => {
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
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] rounded-md"
              title={conversation.title || 'Untitled conversation'}
            >
              <MessageSquare
                size={15}
                className={`shrink-0 ${
                  active ? 'text-[#22D3EE]' : 'text-slate-400'
                }`}
              />

              <span className="truncate text-sm font-medium">
                {conversation.title || 'Untitled conversation'}
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

      {conversations.length === 0 && (
        <div className="px-3 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <MessageSquare size={20} className="text-slate-400" />
          </div>
          <p className="mt-3 text-sm text-slate-300">
            No previous conversations
          </p>
        </div>
      )}
    </div>
  );

  const newChatButton = (
    <button type="button" onClick={onNew} className={newBtnClass}>
      <Plus size={16} />
      New conversation
    </button>
  );

  return (
    <>
      <style>{styles}</style>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#02050B]/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r border-white/10 bg-[#0B1220]/95 shadow-[20px_0_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Conversation history"
        aria-hidden={!isOpen}
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

        <div className="border-b border-white/10 p-3">
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
        </div>

        {conversationList}
      </aside>

      {/* Desktop sidebar - always visible */}
      <aside
        className="relative z-10 hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#060B16]/70 backdrop-blur-xl md:flex"
        aria-label="Conversation history"
      >
        <div className="border-b border-white/10 p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500 shadow-lg shadow-[#22D3EE]/20">
              <History size={17} className="text-white" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">
                Study history
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Your previous conversations
              </p>
            </div>
          </div>

          {newChatButton}
        </div>

        {conversationList}
      </aside>
    </>
  );
}