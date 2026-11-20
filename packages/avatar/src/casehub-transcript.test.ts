import { describe, it, expect, afterEach } from 'vitest';
import type { ConversationTurn } from './types.js';
import './casehub-transcript.js';

function makeTurn(overrides: Partial<ConversationTurn> = {}): ConversationTurn {
  return { role: 'user', text: 'Hello', status: 'final', ...overrides };
}

async function createElement(turns: ConversationTurn[] = []) {
  const el = document.createElement('casehub-transcript') as any;
  el.turns = turns;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('CasehubTranscript', () => {
  it('has correct ARIA attributes', async () => {
    const el = await createElement();
    expect(el.getAttribute('role')).toBe('log');
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.getAttribute('aria-label')).toBe('Conversation transcript');
  });

  it('renders user turns right-aligned', async () => {
    const el = await createElement([makeTurn({ role: 'user', text: 'Hi' })]);
    const bubble = el.shadowRoot!.querySelector('.turn.user');
    expect(bubble).toBeTruthy();
    expect(bubble!.textContent).toContain('Hi');
  });

  it('renders avatar turns left-aligned', async () => {
    const el = await createElement([makeTurn({ role: 'avatar', text: 'Hello!' })]);
    const bubble = el.shadowRoot!.querySelector('.turn.avatar');
    expect(bubble).toBeTruthy();
    expect(bubble!.textContent).toContain('Hello!');
  });

  it('renders partial turns with partial class', async () => {
    const el = await createElement([makeTurn({ status: 'partial', text: 'Hel' })]);
    const bubble = el.shadowRoot!.querySelector('.turn.partial');
    expect(bubble).toBeTruthy();
  });

  it('renders empty state with no children', async () => {
    const el = await createElement([]);
    const bubbles = el.shadowRoot!.querySelectorAll('.turn');
    expect(bubbles.length).toBe(0);
  });

  it('updates when turns property changes', async () => {
    const el = await createElement([]);
    el.turns = [makeTurn({ text: 'New message' })];
    await el.updateComplete;
    const bubble = el.shadowRoot!.querySelector('.turn');
    expect(bubble!.textContent).toContain('New message');
  });

  it('renders tool-call turns with tool-call class', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Called life/tasks/create', type: 'tool-call',
      toolName: 'life/tasks/create', toolArgs: { title: 'Buy milk' },
      toolResult: '{"id": 42}',
    })]);
    const bubble = el.shadowRoot!.querySelector('.turn.tool-call');
    expect(bubble).toBeTruthy();
    expect(bubble!.textContent).toContain('life/tasks/create');
  });

  it('renders tool-call with collapsed args by default', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Called db/query', type: 'tool-call',
      toolName: 'db/query', toolArgs: { sql: 'SELECT 1' },
      toolResult: '[{"1": 1}]',
    })]);
    const details = el.shadowRoot!.querySelector('.tool-call details');
    expect(details).toBeTruthy();
    expect(details!.hasAttribute('open')).toBe(false);
  });

  it('renders tool-call error with error class', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Tool failed', type: 'tool-call',
      toolName: 'db/query', toolResult: 'connection refused', toolError: true,
    })]);
    const result = el.shadowRoot!.querySelector('.tool-result.error');
    expect(result).toBeTruthy();
  });

  it('tool-call turn has correct ARIA attributes', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Called life/tasks/create', type: 'tool-call',
      toolName: 'life/tasks/create', toolResult: '{"id": 42}',
    })]);
    const bubble = el.shadowRoot!.querySelector('.turn.tool-call');
    expect(bubble!.getAttribute('aria-label')).toContain('Tool call: life/tasks/create');
  });

  it('renders tool-call without args when none provided', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Called ping', type: 'tool-call',
      toolName: 'ping', toolResult: 'pong',
    })]);
    const details = el.shadowRoot!.querySelector('.tool-call details');
    expect(details).toBeNull();
  });

  it('renders pending confirmation with confirm and decline buttons', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Confirm', type: 'confirmation',
      confirmationId: 'c-1', actionDescription: 'Start case #42',
      consequences: 'Creates a new case.', confirmationStatus: 'pending',
    })]);
    const card = el.shadowRoot!.querySelector('.turn.confirmation');
    expect(card).toBeTruthy();
    expect(card!.textContent).toContain('Start case #42');
    expect(card!.textContent).toContain('Creates a new case.');
    const buttons = card!.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0]!.textContent).toContain('Confirm');
    expect(buttons[1]!.textContent).toContain('Decline');
  });

  it('dispatches confirmation-response on confirm click', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Confirm', type: 'confirmation',
      confirmationId: 'c-2', actionDescription: 'Approve payment',
      confirmationStatus: 'pending',
    })]);
    const events: CustomEvent[] = [];
    el.addEventListener('avatar:confirmation-response', (e: CustomEvent) => events.push(e));
    const btn = el.shadowRoot!.querySelector('.confirmation button.confirm') as HTMLButtonElement;
    btn.click();
    expect(events.length).toBe(1);
    expect(events[0]!.detail).toEqual({ confirmationId: 'c-2', approved: true });
  });

  it('dispatches confirmation-response on decline click', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Confirm', type: 'confirmation',
      confirmationId: 'c-3', actionDescription: 'Delete record',
      confirmationStatus: 'pending',
    })]);
    const events: CustomEvent[] = [];
    el.addEventListener('avatar:confirmation-response', (e: CustomEvent) => events.push(e));
    const btn = el.shadowRoot!.querySelector('.confirmation button.decline') as HTMLButtonElement;
    btn.click();
    expect(events.length).toBe(1);
    expect(events[0]!.detail).toEqual({ confirmationId: 'c-3', approved: false });
  });

  it('disables buttons when confirmation is not pending', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Confirmed', type: 'confirmation',
      confirmationId: 'c-4', actionDescription: 'Start case',
      confirmationStatus: 'confirmed',
    })]);
    const buttons = el.shadowRoot!.querySelectorAll('.confirmation button');
    for (const btn of buttons) {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('shows expired status on expired confirmation', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Expired', type: 'confirmation',
      confirmationId: 'c-5', actionDescription: 'Approve',
      confirmationStatus: 'expired',
    })]);
    const card = el.shadowRoot!.querySelector('.turn.confirmation');
    expect(card!.textContent).toContain('Expired');
  });

  it('confirmation card has correct ARIA attributes', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Confirm', type: 'confirmation',
      confirmationId: 'c-6', actionDescription: 'Start case #42',
      confirmationStatus: 'pending',
    })]);
    const card = el.shadowRoot!.querySelector('.turn.confirmation');
    expect(card!.getAttribute('role')).toBe('alertdialog');
    expect(card!.getAttribute('aria-label')).toContain('Confirmation required: Start case #42');
  });
});
