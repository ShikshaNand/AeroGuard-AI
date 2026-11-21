import React from 'react';
import { Bot, User, ShieldCheck, Info } from 'lucide-react';
import type { ChatMessage } from '../types';
import { SafeMarkdownText } from './SafeMarkdownText';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

/**
 * Renders a single user or assistant chat message with cited live metrics,
 * optional fallback notice, and XSS-free structured markdown output.
 */
export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = React.memo(({ message }) => (
  <div
    className={`animate-chat-enter flex gap-3 ${
      message.role === 'user' ? 'justify-end' : 'justify-start'
    }`}
  >
    {message.role === 'assistant' && (
      <div
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand"
        aria-hidden="true"
      >
        <Bot className="h-4 w-4" />
      </div>
    )}

    <div
      className={`max-w-3xl rounded-2xl p-4 shadow-xs ${
        message.role === 'user'
          ? 'bg-dark-pill text-on-brand font-medium text-xs'
          : 'border border-line bg-surface space-y-2'
      }`}
    >
      {message.role === 'user' ? (
        <p>{message.content}</p>
      ) : (
        <>
          {message.fallbackNotice && (
            <div className="beige-amber rounded-lg px-2.5 py-1.5 text-[11px] text-warn-ink flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{message.fallbackNotice}</span>
            </div>
          )}

          {message.keyMetricsCited && message.keyMetricsCited.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-line-subtle pb-2">
              {message.keyMetricsCited.map((metric, i) => (
                <span
                  key={i}
                  className="rounded-md bg-chip px-2 py-0.5 text-[11px] font-semibold text-brand-ink border border-line"
                >
                  {metric}
                </span>
              ))}
            </div>
          )}

          <SafeMarkdownText content={message.content} />

          <div className="flex items-center justify-between border-t border-line-subtle pt-2 text-[11px] text-ink-subtle">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="h-3 w-3 text-brand-ink" aria-hidden="true" />
              {message.sourceMode === 'gemini-live'
                ? `Google Gemini (${message.modelUsed ?? 'Live'})`
                : 'AeroGuard Environmental Science Engine'}
            </span>
            <span>{message.timestamp}</span>
          </div>
        </>
      )}
    </div>

    {message.role === 'user' && (
      <div
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-chip text-ink"
        aria-hidden="true"
      >
        <User className="h-4 w-4" />
      </div>
    )}
  </div>
));
ChatMessageBubble.displayName = 'ChatMessageBubble';
