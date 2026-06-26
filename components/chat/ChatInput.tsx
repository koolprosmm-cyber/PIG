'use client';

import { Send } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSend, disabled }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about your PIG³ results..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-border-light bg-surface-sunken text-ink placeholder:text-ink-faint px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-signal-teal/50 disabled:opacity-50"
        style={{ minHeight: '44px', maxHeight: '120px' }}
      />
      <button
        onClick={onSend}
        disabled={!value.trim() || disabled}
        className="p-2 bg-signal-teal text-canvas rounded-lg hover:bg-signal-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}
