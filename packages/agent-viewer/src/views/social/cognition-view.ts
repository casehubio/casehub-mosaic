import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { SocialPatternCategory, CognitionConfig } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';

const SECTION_META: Record<string, { label: string; icon: string }> = {
  drive: { label: 'Drive', icon: '⚡' },
  mood: { label: 'Mood', icon: '🎭' },
  personalityEvolution: { label: 'Personality Evolution', icon: '🔄' },
  userModel: { label: 'User Model', icon: '👤' },
  strategyLearning: { label: 'Strategy Learning', icon: '📈' },
  mentalModel: { label: 'Mental Model', icon: '🧠' },
  narrative: { label: 'Narrative', icon: '📖' },
  goalProposal: { label: 'Goal Proposal', icon: '🎯' },
  goalEscalation: { label: 'Goal Escalation', icon: '⬆' },
  normDetection: { label: 'Norm Detection', icon: '📏' },
  collectiveGoal: { label: 'Collective Goal', icon: '🤝' },
  retention: { label: 'Retention', icon: '💾' },
  cognitiveGoal: { label: 'Cognitive Goal', icon: '💡' },
};

@customElement('agency-social-cognition-view')
export class CognitionView extends PatternViewMixin(LitElement) {

  static override styles = [patternViewStyles, css`
    .header {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-label {
      font-size: 12px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-name {
      font-size: 13px;
      font-weight: 500;
      color: #f0f4ff;
    }
    .type-badge {
      padding: 1px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(245, 194, 231, 0.2);
      color: #f5c2e7;
    }
    .header-desc {
      margin-left: auto;
      font-size: 11px;
      color: #7f849c;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .body { padding: 24px 16px; }
    .sections-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
    }
    .section-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .section-card.active {
      border-color: rgba(245, 194, 231, 0.25);
      background: rgba(245, 194, 231, 0.04);
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-icon { font-size: 14px; }
    .section-name {
      font-size: 12px;
      font-weight: 600;
      color: #cdd6f4;
    }
    .section-status {
      margin-left: auto;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-active {
      background: rgba(166, 227, 161, 0.15);
      color: #a6e3a1;
    }
    .status-inactive {
      background: rgba(255, 255, 255, 0.05);
      color: #585b70;
    }
    .section-keys {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .key-tag {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.05);
      color: #7f849c;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .summary {
      text-align: center;
      font-size: 11px;
      color: #7f849c;
      margin-top: 12px;
    }
    .no-cognition {
      text-align: center;
      color: #7f849c;
      font-size: 12px;
      font-style: italic;
      padding: 24px;
    }
  `];

  override render() {
    const p = this.spec as SocialPatternCategory;
    if (!p) return this.renderEmptyState();
    return html`
      <div class="header">
        <span class="header-label">PATTERN</span>
        ${p.name ? html`<span class="header-name">${p.name}</span>` : nothing}
        <span class="type-badge">${p.type}</span>
        ${p.description ? html`<span class="header-desc">${p.description}</span>` : nothing}
      </div>
      <div class="body">
        ${p.cognition ? this.renderCognition(p.cognition) : html`<div class="no-cognition">No cognition configuration</div>`}
      </div>
    `;
  }

  private renderCognition(cognition: CognitionConfig): TemplateResult {
    const allKeys = Object.keys(SECTION_META);
    const activeCount = allKeys.filter(k => cognition[k as keyof CognitionConfig] != null).length;
    return html`
      <div class="sections-grid">
        ${allKeys.map(key => this.renderSection(key, cognition[key as keyof CognitionConfig]))}
      </div>
      <div class="summary">${activeCount} of ${allKeys.length} cognitive modules configured</div>
    `;
  }

  private renderSection(key: string, value: unknown): TemplateResult {
    const meta = SECTION_META[key] ?? { label: key, icon: '•' };
    const active = value != null;
    const configKeys = active && typeof value === 'object' ? Object.keys(value as object) : [];
    return html`
      <div class="section-card ${active ? 'active' : ''}">
        <div class="section-header">
          <span class="section-icon">${meta.icon}</span>
          <span class="section-name">${meta.label}</span>
          <span class="section-status ${active ? 'status-active' : 'status-inactive'}">${active ? 'on' : 'off'}</span>
        </div>
        ${configKeys.length > 0 ? html`
          <div class="section-keys">
            ${configKeys.map(k => html`<span class="key-tag">${k}</span>`)}
          </div>
        ` : nothing}
      </div>
    `;
  }
}
