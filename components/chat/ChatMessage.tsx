'use client';

// NOTE: the original draft imported `Message` from '@/types', a path/type
// that does not exist anywhere in this project (only `ChatMessage` exists,
// in lib/pig3/types.ts, with a different shape). That import was dead code
// even in the original draft. This component now defines its own local
// interface that matches exactly what app/(dashboard)/chat/page.tsx actually
// constructs and passes in.

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Props {
  message: Message;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-3xl rounded-lg px-4 py-3
          ${isUser ? 'bg-signal-teal text-canvas' : 'bg-surface text-ink border border-border'}
        `}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        <div className={`text-xs mt-1 ${isUser ? 'text-canvas/70' : 'text-ink-muted'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
