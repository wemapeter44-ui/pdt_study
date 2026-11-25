
import { Trash2, MessageSquare, Plus, X } from 'lucide-react';

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
    <div className="flex-1 space-y-1 overflow-y-auto p-3">
      {conversations.map((conversation) => {
        const active = currentId === conversation.id;

        return (
          <div
            key={conversation.id}
            className={`group flex items-center gap-2 rounded-md border px-3 py-2.5 transition ${
              active
                ? 'border-[#263244] bg-[#172438] text-white'
                : 'border-transparent text-[#94A3B8] hover:border-[#263244] hover:bg-[#111B2B] hover:text-white'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
              title={conversation.title || 'Untitled conversation'}
            >
              <MessageSquare
                size={15}
                className={`shrink-0 ${
                  active ? 'text-[#22D3EE]' : 'text-[#64748B]'
                }`}
              />

              <span className="truncate text-xs font-medium">
                {conversation.title || 'Untitled conversation'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onDelete(conversation.id)}
              aria-label="Delete conversation"
              title="Delete conversation"
              className="shrink-0 rounded p-1.5 text-[#64748B] opacity-100 transition hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}

      {conversations.length === 0 && (
        <p className="px-3 py-6 text-center text-xs text-[#64748B]">
          No previous conversations
        </p>
      )}
    </div>
  );

  const newChatButton = (
    <button
      type="button"
      onClick={onNew}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-[#334155] bg-[#111B2B] py-2.5 text-sm font-medium text-white transition hover:border-[#22D3EE] hover:bg-[#172438] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
    >
      <Plus size={16} className="text-[#22D3EE]" />
      New conversation
    </button>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[#263244] bg-[#080F1C] transition-transform duration-200 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Conversation history"
        aria-hidden={!isOpen}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#263244] px-4">
          <span className="text-sm font-semibold text-white">
            Conversations
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close conversation history"
            className="rounded-md p-2 text-[#94A3B8] hover:bg-[#172438] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-[#263244] p-3">
          <button
            type="button"
            onClick={() => {
              onNew();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-[#334155] bg-[#111B2B] py-2.5 text-sm font-medium text-white transition hover:border-[#22D3EE] hover:bg-[#172438]"
          >
            <Plus size={16} className="text-[#22D3EE]" />
            New conversation
          </button>
        </div>

        {conversationList}
      </aside>

      {/* Desktop sidebar - always visible */}
      <aside
        className="hidden w-64 shrink-0 flex-col border-r border-[#263244] bg-[#080F1C] md:flex"
        aria-label="Conversation history"
      >
        <div className="border-b border-[#263244] p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-white">
              Study history
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Your previous conversations
            </p>
          </div>

          {newChatButton}
        </div>

        {conversationList}
      </aside>
    </>
  );
}
