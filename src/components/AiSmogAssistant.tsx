import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  User,
  ShieldCheck,
  RotateCcw,
  Users,
  Info,
} from 'lucide-react';
import type {
  CADRSizingResult,
  ChatMessage,
  FamilyProfile,
  LocationAirQuality,
} from '../types';
import type { IndoorAirSimulationResult } from '../domain/iaqCalculator';
import type { AggregateImpactSummary } from '../domain/impactCalculator';
import { generateSmogAssistantAdvice } from '../services/genAiService';
import { calculateWhoMultiple, findOptimalVentilationWindows } from '../domain/airQualityEngine';
import { loadSavedChatMessages, saveChatMessages } from '../utils/chatStorage';
import { SafeMarkdownText } from './SafeMarkdownText';

interface AiSmogAssistantProps {
  location: LocationAirQuality;
  profile: FamilyProfile;
  iaqSim: IndoorAirSimulationResult;
  cadrSizing: CADRSizingResult;
  impactSummary: AggregateImpactSummary;
  sessionApiKey: string;
  isGeminiLiveAvailable?: boolean;
  onOpenFamilySettings?: () => void;
}

const QUICK_PROMPTS = [
  {
    label: '24-Hour Family Plan',
    prompt:
      'Create a 24-hour winter smog survival and low-emission daily schedule tailored to my family and city.',
  },
  {
    label: 'Protect Kids, Seniors & Pets',
    prompt:
      'How should I protect our kids, seniors, asthma members, and pets today, and what masks should we wear?',
  },
  {
    label: 'Low-Cost DIY Indoor Air Hacks',
    prompt:
      'How do I protect my children and elderly indoors today without buying expensive commercial air purifiers?',
  },
  {
    label: 'Commute & Heating Impact Science',
    prompt:
      'Explain the exact cause-and-effect science of how our winter commute and heating choices impact neighborhood thermal inversion smog.',
  },
  {
    label: 'Draft Neighborhood Clean-Air Pledge',
    prompt:
      'Draft a persuasive school-gate zero-idling and clean-air message for our neighborhood WhatsApp / RWA group.',
  },
];

export const AiSmogAssistant: React.FC<AiSmogAssistantProps> = React.memo(({
  location,
  profile,
  iaqSim,
  cadrSizing,
  impactSummary,
  sessionApiKey,
  isGeminiLiveAvailable = false,
  onOpenFamilySettings,
}) => {
  const isLiveReady = Boolean(sessionApiKey.trim()) || isGeminiLiveAvailable;
  const ventWindow = useMemo(
    () => findOptimalVentilationWindows(location.hourlyForecast),
    [location.hourlyForecast]
  );
  const whoMultiple = calculateWhoMultiple(location.pm25);

  const [messages, setMessages] = useState<ChatMessage[]>(() => loadSavedChatMessages());
  const [inputDraft, setInputDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveChatMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || isGenerating) {
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceMode: isLiveReady ? 'gemini-live' : 'expert-engine',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputDraft('');
    setIsGenerating(true);

    try {
      const response = await generateSmogAssistantAdvice(
        promptText,
        {
          location,
          profile,
          iaqSim,
          cadrSizing,
          impactSummary,
        },
        sessionApiKey
      );

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceMode: response.sourceMode,
        modelUsed: response.modelUsed,
        keyMetricsCited: response.keyMetricsCited,
        fallbackNotice: response.fallbackNotice,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSendPrompt(inputDraft);
  };

  return (
    <div className="beige-panel rounded-3xl p-5 sm:p-6 space-y-4">
      {/* Clean Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-on-brand">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-ink">
              Ask AeroGuard AI
            </h2>
            <p className="text-xs text-ink-subtle">
              Personalized clean-air answers using your live city air &amp; exact family member counts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenFamilySettings && (
            <button
              type="button"
              onClick={onOpenFamilySettings}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface-soft px-3 py-1.5 text-xs font-bold text-ink hover:bg-chip"
            >
              <Users className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
              <span>Edit Members ({profile.householdSize})</span>
            </button>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="inline-flex items-center gap-1 rounded-xl border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-chip"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Synced Context Strip (Always stays up to date when city or member counts change!) */}
      <div className="beige-inset rounded-2xl px-4 py-3 text-xs text-ink-body flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            <strong>City:</strong> {location.city} (AQI {location.usAqi}, {whoMultiple}× safe limit)
          </span>
          <span>•</span>
          <span>
            <strong>Family:</strong> {profile.adultsCount} Adults, {profile.childrenCount} Kids, {profile.seniorsCount} Seniors
            {profile.respiratoryCareCount > 0 ? `, ${profile.respiratoryCareCount} Asthma care` : ''}
            {profile.petsCount > 0 ? `, ${profile.petsCount} Pets` : ''}
          </span>
          <span>•</span>
          <span>
            <strong>Safe Window:</strong> {ventWindow.bestWindowLabel}
          </span>
        </div>
        <span className="rounded-full bg-sage-pill border border-sage-line px-2.5 py-0.5 text-[11px] font-bold text-brand-ink">
          {isLiveReady ? 'Gemini Live + Science Guard' : 'Built-in Science Engine Ready'}
        </span>
      </div>

      {/* Quick Starter Chips (Cascading Line-by-Line Reveal) */}
      <div className="stagger-children flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={isGenerating}
            onClick={() => void handleSendPrompt(item.prompt)}
            className="hover-lift rounded-full border border-sage-line bg-surface-active px-3.5 py-1.5 text-xs font-semibold text-brand-ink hover:bg-sage-pill hover:border-brand active:scale-95 transition disabled:opacity-50"
          >
            <Sparkles className="mr-1.5 inline h-3 w-3 text-brand-ink" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Conversation Log */}
      <div
        ref={chatScrollRef}
        role="log"
        aria-live="polite"
        aria-label="AI Smog Coach conversation history"
        className="beige-sand max-h-[440px] min-h-[240px] space-y-4 overflow-y-auto rounded-2xl p-4"
      >
        {/* Dynamic Always-Fresh Welcome Message */}
        <div className="animate-chat-enter flex gap-3 justify-start">
          <div
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand"
            aria-hidden="true"
          >
            <Bot className="h-4 w-4" />
          </div>
          <div className="max-w-3xl rounded-2xl border border-line bg-surface p-4 space-y-2 shadow-xs">
            <p className="text-sm font-extrabold text-brand-ink">
              Hi {profile.familyName}! How can I help your home breathe easier today?
            </p>
            <p className="text-xs text-ink-body leading-relaxed">
              I’m tracking <strong>{location.city}</strong> (AQI <strong>{location.usAqi}</strong>, safest outdoor window <strong>{ventWindow.bestWindowLabel}</strong>) for your household of <strong>{profile.householdSize}</strong> ({profile.adultsCount} adults, {profile.childrenCount} kids, {profile.seniorsCount} seniors{profile.petsCount > 0 ? `, ${profile.petsCount} pets` : ''}). Tap any button above or type your own question below!
            </p>
          </div>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`animate-chat-enter flex gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand"
                aria-hidden="true"
              >
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-3xl rounded-2xl p-4 shadow-xs ${
                msg.role === 'user'
                  ? 'bg-dark-pill text-on-brand font-medium text-xs'
                  : 'border border-line bg-surface space-y-2'
              }`}
            >
              {msg.role === 'user' ? (
                <p>{msg.content}</p>
              ) : (
                <>
                  {msg.fallbackNotice && (
                    <div className="beige-amber rounded-lg px-2.5 py-1.5 text-[11px] text-warn-ink flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{msg.fallbackNotice}</span>
                    </div>
                  )}

                  {msg.keyMetricsCited && msg.keyMetricsCited.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-b border-line-subtle pb-2">
                      {msg.keyMetricsCited.map((metric, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-chip px-2 py-0.5 text-[10px] font-semibold text-brand-ink border border-line"
                        >
                          {metric}
                        </span>
                      ))}
                    </div>
                  )}
                  <SafeMarkdownText content={msg.content} />
                  <div className="flex items-center justify-between border-t border-line-subtle pt-2 text-[10px] text-ink-subtle">
                    <span className="flex items-center gap-1 font-medium">
                      <ShieldCheck className="h-3 w-3 text-brand-ink" aria-hidden="true" />
                      {msg.sourceMode === 'gemini-live'
                        ? `Google Gemini (${msg.modelUsed ?? 'Live'})`
                        : 'AeroGuard Environmental Science Engine'}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>
                </>
              )}
            </div>

            {msg.role === 'user' && (
              <div
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-chip text-ink"
                aria-hidden="true"
              >
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-ink animate-pulse">
            <Bot className="h-4 w-4" aria-hidden="true" />
            <span>Preparing personalized advice for {profile.familyName}...</span>
          </div>
        )}
      </div>

      {/* Prompt Input Form */}
      <form onSubmit={handleSubmitForm} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="ai-prompt-input" className="sr-only">
          Ask a question about winter smog, indoor air quality hacks, or sustainable routines
        </label>
        <input
          id="ai-prompt-input"
          type="text"
          maxLength={600}
          value={inputDraft}
          onChange={(e) => setInputDraft(e.target.value)}
          placeholder={`Ask anything about ${location.city} smog, your ${profile.householdSize} family members, or indoor air...`}
          className="flex-1 rounded-xl border border-line-strong bg-surface-soft px-4 py-3 text-xs text-ink placeholder-ink-subtle focus:border-brand focus:bg-surface"
        />
        <button
          type="submit"
          disabled={isGenerating || inputDraft.trim().length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-xs font-bold text-on-brand hover:bg-brand-hover transition disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
});
AiSmogAssistant.displayName = 'AiSmogAssistant';
