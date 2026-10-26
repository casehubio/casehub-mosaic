import { describe, it, expect, afterEach } from 'vitest';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from './shared-styles.js';

@customElement('test-pattern-view')
class TestPatternView extends PatternViewMixin(LitElement) {
  static override styles = [patternViewStyles];
  override render() {
    if (!this.spec) return this.renderEmptyState();
    return html`<div class="content">${this.spec.category}/${this.spec.type}</div>`;
  }
}

function fixture(): DeliberationPatternCategory {
  return { category: 'deliberation', type: 'voting', name: 'test-vote' };
}

describe('PatternViewMixin', () => {
  let el: TestPatternView;

  afterEach(() => el?.remove());

  it('sets role="region" on connect', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    el.spec = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
  });

  it('sets aria-label from category', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    el.spec = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toBe('deliberation view');
  });

  it('sets aria-label to "pattern view" when spec is undefined', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toBe('pattern view');
  });

  it('setLoading updates aria-busy', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    el.spec = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
    (el as any).setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
    (el as any).setLoading(false);
    expect(el.getAttribute('aria-busy')).toBe('false');
  });

  it('renderEmptyState renders default message', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.empty-state')?.textContent).toBe('No pattern data');
  });

  it('renders content when spec is set', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    el.spec = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.content')?.textContent).toBe('deliberation/voting');
  });
});

describe('patternViewStyles', () => {
  it('is a CSSResult', () => {
    expect(patternViewStyles).toBeDefined();
    expect(patternViewStyles.cssText).toContain('display: block');
    expect(patternViewStyles.cssText).toContain('border-radius');
  });
});
