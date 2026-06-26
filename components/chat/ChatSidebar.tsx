'use client';

import { Plus } from 'lucide-react';

interface Props {
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

export function ChatSidebar({ onSelectSession, onNewSession }: Props) {
  return (
    <div className="w-56 bg-surface-sunken border-r border-border flex flex-col flex-shrink-0">
      <div className="p-3 border-b border-border">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-signal-teal text-canvas rounded-lg hover:bg-signal-teal/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-3 py-8 text-xs text-ink-faint text-center leading-relaxed">
          Session history will appear here.
        </p>
      </div>
    </div>
  );
}
