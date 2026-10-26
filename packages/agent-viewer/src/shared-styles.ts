import { css, html, type CSSResult, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import type { LitElement } from 'lit';
import type { PatternCategory } from '@casehubio/mosaic-core';

type Constructor<T = {}> = new (...args: any[]) => T;

export const patternViewStyles: CSSResult = css`
  :host {
    display: block;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    overflow: hidden;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #cdd6f4;
  }

  .empty-state {
    padding: 32px;
    text-align: center;
    color: #7f849c;
    font-size: 13px;
  }
`;

export const PatternViewMixin = <T extends Constructor<LitElement>>(Base: T) => {
  class PatternViewHost extends Base {
    @property({ attribute: false }) spec!: PatternCategory;

    override connectedCallback() {
      super.connectedCallback();
      this.setAttribute('role', 'region');
      this.setAttribute('aria-label', `${this.spec?.category ?? 'pattern'} view`);
    }

    protected setLoading(loading: boolean) {
      this.setAttribute('aria-busy', String(loading));
    }

    protected renderEmptyState(message = 'No pattern data'): TemplateResult {
      return html`<div class="empty-state">${message}</div>`;
    }
  }
  return PatternViewHost as Constructor<PatternViewHost> & T;
};
