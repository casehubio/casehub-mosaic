import { describe, it, expect } from 'vitest';
import type { VisemeFrame, ConversationTurn, AvatarMessage } from './types.js';

describe('Avatar types', () => {
  it('VisemeFrame has required fields', () => {
    const frame: VisemeFrame = { viseme: 'aa', startMs: 0, endMs: 80 };
    expect(frame.viseme).toBe('aa');
    expect(frame.startMs).toBe(0);
    expect(frame.endMs).toBe(80);
    expect(frame.weight).toBeUndefined();
  });

  it('VisemeFrame accepts optional weight', () => {
    const frame: VisemeFrame = { viseme: 'PP', startMs: 0, endMs: 80, weight: 0.8 };
    expect(frame.weight).toBe(0.8);
  });

  it('ConversationTurn has role, text, status', () => {
    const turn: ConversationTurn = { role: 'user', text: 'hello', status: 'final' };
    expect(turn.role).toBe('user');
    expect(turn.status).toBe('final');
  });

  it('ConversationTurn supports tool-call type', () => {
    const turn: ConversationTurn = {
      role: 'avatar', text: 'Called life/tasks/create', status: 'final',
      type: 'tool-call', toolName: 'life/tasks/create',
      toolArgs: { title: 'Buy milk' }, toolResult: '{"id": 42}',
    };
    expect(turn.type).toBe('tool-call');
    expect(turn.toolName).toBe('life/tasks/create');
    expect(turn.toolArgs).toEqual({ title: 'Buy milk' });
    expect(turn.toolResult).toBe('{"id": 42}');
    expect(turn.toolError).toBeUndefined();
  });

  it('ConversationTurn tool-call supports error flag', () => {
    const turn: ConversationTurn = {
      role: 'avatar', text: 'Tool failed', status: 'final',
      type: 'tool-call', toolName: 'db/query',
      toolResult: 'connection refused', toolError: true,
    };
    expect(turn.toolError).toBe(true);
  });

  it('ConversationTurn without type defaults to message', () => {
    const turn: ConversationTurn = { role: 'user', text: 'hello', status: 'final' };
    expect(turn.type).toBeUndefined();
  });

  it('ConversationTurn supports confirmation type', () => {
    const turn: ConversationTurn = {
      role: 'avatar', text: 'Confirm action', status: 'final',
      type: 'confirmation', confirmationId: 'c-123',
      actionDescription: 'Start case #42',
      consequences: 'This will create a new case and assign it to you.',
      confirmationStatus: 'pending',
    };
    expect(turn.type).toBe('confirmation');
    expect(turn.confirmationId).toBe('c-123');
    expect(turn.actionDescription).toBe('Start case #42');
    expect(turn.confirmationStatus).toBe('pending');
  });

  it('ConversationTurn confirmation supports expiry', () => {
    const turn: ConversationTurn = {
      role: 'avatar', text: 'Confirm', status: 'final',
      type: 'confirmation', confirmationId: 'c-456',
      actionDescription: 'Delete record',
      confirmationStatus: 'expired',
      expiresAt: '2026-11-20T12:00:00Z',
    };
    expect(turn.confirmationStatus).toBe('expired');
    expect(turn.expiresAt).toBe('2026-11-20T12:00:00Z');
  });

  it('AvatarMessage discriminates on type field', () => {
    const msg: AvatarMessage = { type: 'partial', text: 'hello' };
    if (msg.type === 'partial') {
      expect(msg.text).toBe('hello');
    }
  });
});
