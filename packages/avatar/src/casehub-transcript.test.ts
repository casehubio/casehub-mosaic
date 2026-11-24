import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
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

  it('ARIA label reflects confirmed status', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Confirm', type: 'confirmation',
      confirmationId: 'c-7', actionDescription: 'Start case #42',
      confirmationStatus: 'confirmed',
    })]);
    const card = el.shadowRoot!.querySelector('.turn.confirmation');
    expect(card!.getAttribute('aria-label')).toBe('Confirmation approved: Start case #42');
  });

  it('ARIA label reflects declined status', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Confirm', type: 'confirmation',
      confirmationId: 'c-8', actionDescription: 'Start case #42',
      confirmationStatus: 'declined',
    })]);
    const card = el.shadowRoot!.querySelector('.turn.confirmation');
    expect(card!.getAttribute('aria-label')).toBe('Confirmation declined: Start case #42');
  });

  it('ARIA label reflects expired status', async () => {
    const el = await createElement([makeTurn({
      role: 'avatar', text: 'Confirm', type: 'confirmation',
      confirmationId: 'c-9', actionDescription: 'Start case #42',
      confirmationStatus: 'expired',
    })]);
    const card = el.shadowRoot!.querySelector('.turn.confirmation');
    expect(card!.getAttribute('aria-label')).toBe('Confirmation expired: Start case #42');
  });

  describe('auto-expiry timer', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('expires a pending confirmation whose expiresAt has passed', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const el = await createElement([makeTurn({
        role: 'avatar', text: 'Confirm', type: 'confirmation',
        confirmationId: 'c-exp-1', actionDescription: 'Approve payment',
        confirmationStatus: 'pending', expiresAt: pastDate,
      })]);
      await vi.advanceTimersByTimeAsync(1000);
      await el.updateComplete;
      const card = el.shadowRoot!.querySelector('.turn.confirmation');
      expect(card!.textContent).toContain('Expired');
      const buttons = card!.querySelectorAll('button');
      for (const btn of buttons) {
        expect((btn as HTMLButtonElement).disabled).toBe(true);
      }
    });

    it('does not expire a pending confirmation whose expiresAt is in the future', async () => {
      const futureDate = new Date(Date.now() + 60_000).toISOString();
      const el = await createElement([makeTurn({
        role: 'avatar', text: 'Confirm', type: 'confirmation',
        confirmationId: 'c-exp-2', actionDescription: 'Approve payment',
        confirmationStatus: 'pending', expiresAt: futureDate,
      })]);
      await vi.advanceTimersByTimeAsync(1000);
      await el.updateComplete;
      const buttons = el.shadowRoot!.querySelectorAll('.confirmation button');
      for (const btn of buttons) {
        expect((btn as HTMLButtonElement).disabled).toBe(false);
      }
    });

    it('dispatches avatar:confirmation-expired event on auto-expiry', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const el = await createElement([makeTurn({
        role: 'avatar', text: 'Confirm', type: 'confirmation',
        confirmationId: 'c-exp-3', actionDescription: 'Start case',
        confirmationStatus: 'pending', expiresAt: pastDate,
      })]);
      const events: CustomEvent[] = [];
      el.addEventListener('avatar:confirmation-expired', (e: CustomEvent) => events.push(e));
      await vi.advanceTimersByTimeAsync(1000);
      await el.updateComplete;
      expect(events.length).toBe(1);
      expect(events[0]!.detail).toEqual({ confirmationId: 'c-exp-3' });
    });

    it('does not dispatch expired event for already-expired confirmations', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const el = await createElement([makeTurn({
        role: 'avatar', text: 'Expired', type: 'confirmation',
        confirmationId: 'c-exp-4', actionDescription: 'Approve',
        confirmationStatus: 'expired', expiresAt: pastDate,
      })]);
      const events: CustomEvent[] = [];
      el.addEventListener('avatar:confirmation-expired', (e: CustomEvent) => events.push(e));
      await vi.advanceTimersByTimeAsync(1000);
      await el.updateComplete;
      expect(events.length).toBe(0);
    });

    it('does not expire confirmations without expiresAt', async () => {
      const el = await createElement([makeTurn({
        role: 'avatar', text: 'Confirm', type: 'confirmation',
        confirmationId: 'c-exp-5', actionDescription: 'Approve',
        confirmationStatus: 'pending',
      })]);
      await vi.advanceTimersByTimeAsync(1000);
      await el.updateComplete;
      const buttons = el.shadowRoot!.querySelectorAll('.confirmation button');
      for (const btn of buttons) {
        expect((btn as HTMLButtonElement).disabled).toBe(false);
      }
    });

    it('expires multiple pending confirmations in a single tick', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const el = await createElement([
        makeTurn({
          role: 'avatar', text: 'Confirm', type: 'confirmation',
          confirmationId: 'c-multi-1', actionDescription: 'First',
          confirmationStatus: 'pending', expiresAt: pastDate,
        }),
        makeTurn({
          role: 'avatar', text: 'Confirm', type: 'confirmation',
          confirmationId: 'c-multi-2', actionDescription: 'Second',
          confirmationStatus: 'pending', expiresAt: pastDate,
        }),
      ]);
      const events: CustomEvent[] = [];
      el.addEventListener('avatar:confirmation-expired', (e: CustomEvent) => events.push(e));
      await vi.advanceTimersByTimeAsync(1000);
      await el.updateComplete;
      expect(events.length).toBe(2);
      expect(events.map((e: CustomEvent) => e.detail.confirmationId)).toEqual(['c-multi-1', 'c-multi-2']);
      const cards = el.shadowRoot!.querySelectorAll('.turn.confirmation');
      for (const card of cards) {
        expect(card.textContent).toContain('Expired');
      }
    });

    it('cleans up timer on disconnect', async () => {
      const futureDate = new Date(Date.now() + 500).toISOString();
      const el = await createElement([makeTurn({
        role: 'avatar', text: 'Confirm', type: 'confirmation',
        confirmationId: 'c-exp-6', actionDescription: 'Approve',
        confirmationStatus: 'pending', expiresAt: futureDate,
      })]);
      el.remove();
      await vi.advanceTimersByTimeAsync(2000);
      expect(el.turns[0].confirmationStatus).toBe('pending');
    });
  });
});
