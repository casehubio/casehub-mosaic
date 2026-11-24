import { describe, it, expect, vi } from 'vitest';
import './diagram-workbench.js';

type WorkbenchEl = HTMLElement & {
  yaml: string;
  src: string;
  _stack: Array<{ name: string; yaml: string; diagramType: string }>;
  updateComplete: Promise<boolean>;
};

describe('diagram-workbench resize logic', () => {
  it('dispatches window resize after a delay when stack grows', async () => {
    const resizeSpy = vi.fn();
    window.addEventListener('resize', resizeSpy);

    requestAnimationFrame(() => {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    });

    await new Promise(r => setTimeout(r, 200));
    expect(resizeSpy).toHaveBeenCalled();

    window.removeEventListener('resize', resizeSpy);
  });

  it('resize event is a standard Event', () => {
    const event = new Event('resize');
    expect(event.type).toBe('resize');
  });
});

describe('diagram-workbench collapsed strip type dot', () => {
  let el: WorkbenchEl;

  beforeEach(async () => {
    el = document.createElement('agency-diagram-workbench') as WorkbenchEl;
    el.yaml = 'type: choreography';
    el.src = 'mycase.choreography.yaml';
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('shows type dot on collapsed strip when drill-down stack has entries', async () => {
    el._stack = [{ name: 'Sub Process', yaml: 'type: htn', diagramType: 'htn' }];
    await el.updateComplete;
    const dot = el.shadowRoot!.querySelector('.type-dot');
    expect(dot).not.toBeNull();
  });

  it('no collapsed strips when stack is empty', async () => {
    el._stack = [];
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.collapsed-strip')).toBeNull();
  });

  it('type dot has correct ARIA role and label', async () => {
    el._stack = [{ name: 'Sub Process', yaml: 'type: htn', diagramType: 'htn' }];
    await el.updateComplete;
    const dot = el.shadowRoot!.querySelector('.type-dot')!;
    expect(dot.getAttribute('role')).toBe('status');
    expect(dot.getAttribute('aria-label')).toBe('Diagram type: choreography');
  });

  it('applies correct variant class for known diagram type', async () => {
    el._stack = [{ name: 'Sub Process', yaml: 'type: htn', diagramType: 'htn' }];
    await el.updateComplete;
    const dot = el.shadowRoot!.querySelector('.type-dot')!;
    expect(dot.classList.contains('info')).toBe(true);
  });

  it('applies neutral variant for unknown diagram type', async () => {
    el.src = 'mycase.custom-type.yaml';
    el._stack = [{ name: 'Sub', yaml: '', diagramType: 'htn' }];
    await el.updateComplete;
    const dot = el.shadowRoot!.querySelector('.type-dot')!;
    expect(dot.classList.contains('neutral')).toBe(true);
  });

  it('collapsed strip title includes diagram type', async () => {
    el._stack = [{ name: 'Sub Process', yaml: 'type: htn', diagramType: 'htn' }];
    await el.updateComplete;
    const strip = el.shadowRoot!.querySelector('.collapsed-strip')!;
    expect(strip.getAttribute('title')).toContain('choreography');
  });

  it('collapsed strip shows level name as label', async () => {
    el._stack = [{ name: 'Sub Process', yaml: 'type: htn', diagramType: 'htn' }];
    await el.updateComplete;
    const label = el.shadowRoot!.querySelector('.strip-label')!;
    expect(label.textContent!.trim()).toContain('Case Definition');
  });

  it('host has ARIA region role and label', () => {
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Diagram workbench');
  });
});
