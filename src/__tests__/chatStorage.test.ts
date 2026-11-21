import { describe, it, expect, beforeEach } from 'vitest';
import { loadSavedChatMessages, saveChatMessages } from '../utils/chatStorage';
import type { ChatMessage } from '../types';

describe('chatStorage safe persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('recovers cleanly from malformed JSON and sanitizes stored messages', () => {
    window.localStorage.setItem('aeroguard_chat_history_v1', '{broken-json');
    expect(loadSavedChatMessages()).toEqual([]);

    window.localStorage.setItem(
      'aeroguard_chat_history_v1',
      JSON.stringify([
        {
          id: '<b>m1</b>',
          role: 'assistant',
          content: '<script>evil()</script>Safe advice',
          timestamp: '14:00',
          sourceMode: 'expert-engine',
          keyMetricsCited: ['<img src=x>AQI 346'],
        },
        { id: 'invalid', role: 'system', content: 'should be filtered out' },
      ])
    );

    const loaded = loadSavedChatMessages();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('m1');
    expect(loaded[0].content).not.toContain('<script>');
    expect(loaded[0].content).toContain('Safe advice');
    expect(loaded[0].keyMetricsCited?.[0]).toBe('AQI 346');
  });

  it('bounds saved chat history to the 20 most recent messages and clears when empty', () => {
    const many: ChatMessage[] = Array.from({ length: 25 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message #${i}`,
      timestamp: '14:00',
      sourceMode: 'expert-engine',
    }));

    saveChatMessages(many);
    const loaded = loadSavedChatMessages();
    expect(loaded).toHaveLength(20);
    expect(loaded[0].id).toBe('msg-5');
    expect(loaded[19].id).toBe('msg-24');

    saveChatMessages([]);
    expect(loadSavedChatMessages()).toEqual([]);
  });
});
