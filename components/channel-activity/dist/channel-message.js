var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { messageTypeCategory, isObligationCreating } from './types.js';
function speechActBorderColor(type) {
    const cat = messageTypeCategory(type);
    switch (cat) {
        case 'info': return 'var(--pages-info-9, #2563eb)';
        case 'obligation': return 'var(--pages-accent-9, #7c3aed)';
        case 'success': return 'var(--pages-success-9, #16a34a)';
        case 'danger': return 'var(--pages-danger-9, #dc2626)';
        case 'warning': return 'var(--pages-warning-9, #d97706)';
        case 'transfer': return 'var(--pages-info-7, #38bdf8)';
        case 'telemetry': return 'var(--pages-neutral-7, #a3a3a3)';
    }
}
import { renderMarkdown } from './markdown.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { ChannelEventTopics } from './events.js';
import '@casehubio/pages-ui-components';
let ChannelMessageElement = class ChannelMessageElement extends LitElement {
    constructor() {
        super(...arguments);
        this.reactions = [];
        this.showSpeechAct = true;
        this.showActorBadge = true;
        this._expanded = false;
        this._onKeydown = (e) => {
            if (e.key === 'Escape' && this._expanded) {
                this._expanded = false;
            }
        };
    }
    _displaySender(sender, actorType) {
        return this.formatSender ? this.formatSender(sender, actorType) : sender;
    }
    static { this.styles = css `
    :host {
      display: block;
      padding: var(--pages-space-2, 8px) var(--pages-space-4, 16px);
    }
    :host(:hover) {
      background: var(--pages-neutral-2, #f5f5f5);
    }
    .message-container {
      border-left-width: 3px;
      border-left-style: solid;
      padding-left: var(--pages-space-3, 12px);
    }
    .message-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      margin-bottom: var(--pages-space-1, 4px);
    }
    .actor-icon {
      font-size: var(--pages-font-size-sm, 13px);
    }
    .sender {
      font-weight: var(--pages-font-weight-semibold, 600);
      font-size: var(--pages-font-size-sm, 13px);
      color: var(--pages-neutral-12, #111);
    }
    time {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-neutral-8, #888);
    }


    .content {
      font-size: var(--pages-font-size-base, 14px);
      line-height: var(--pages-line-height-base, 20px);
      color: var(--pages-neutral-11, #333);
    }
    .content :first-child { margin-top: 0; }
    .content :last-child { margin-bottom: 0; }
    .delegation-indicator {
      display: flex;
      align-items: center;
      gap: var(--pages-space-1, 4px);
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-info-9, #2563eb);
      margin-top: var(--pages-space-1, 4px);
    }
    .artefact-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--pages-space-1, 4px);
      font-size: var(--pages-font-size-xs, 11px);
      padding: 2px 8px;
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-neutral-2, #f5f5f5);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      cursor: pointer;
      margin-top: var(--pages-space-1, 4px);
      margin-right: var(--pages-space-1, 4px);
    }
    .artefact-chip:hover { background: var(--pages-neutral-3, #e5e5e5); }
    .expand-toggle {
      background: none; border: none; cursor: pointer;
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-neutral-8, #888);
      padding: 2px 4px; border-radius: var(--pages-radius-sm, 4px); line-height: 1;
    }
    .expand-toggle:hover { background: var(--pages-neutral-3, #e5e5e5); color: var(--pages-neutral-11, #333); }
    .expanded-section {
      margin-top: var(--pages-space-2, 8px);
      padding: var(--pages-space-2, 8px);
      border-top: 1px solid var(--pages-neutral-4, #e5e5e5);
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-neutral-9, #737373);
    }
    .correlation-context {
      margin-bottom: var(--pages-space-2, 8px);
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border-left: 2px solid var(--pages-neutral-5, #d4d4d4);
    }
    .correlation-context .parent-sender { font-weight: var(--pages-font-weight-semibold, 600); color: var(--pages-neutral-11, #333); }
    .artefact-detail {
      display: flex; align-items: center; gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-1, 4px) 0;
    }
    .artefact-detail .artefact-uri { color: var(--pages-neutral-8, #888); }
    .artefact-detail .artefact-scope { color: var(--pages-info-9, #2563eb); }
    .commitment-details { margin-bottom: var(--pages-space-2, 8px); }
    .commitment-details .detail-row { display: flex; gap: var(--pages-space-2, 8px); padding: 2px 0; }
    .commitment-details .detail-label { color: var(--pages-neutral-8, #888); }
    .metadata {
      display: flex; gap: var(--pages-space-3, 12px);
      margin-bottom: var(--pages-space-2, 8px);
    }
    .metadata .meta-item { display: flex; gap: var(--pages-space-1, 4px); }
    .metadata .meta-label { color: var(--pages-neutral-8, #888); }
    .action-bar {
      display: flex; gap: var(--pages-space-2, 8px);
      margin-top: var(--pages-space-2, 8px);
      padding-top: var(--pages-space-2, 8px);
      border-top: 1px solid var(--pages-neutral-4, #e5e5e5);
    }
    .reply-btn {
      display: inline-flex; align-items: center; gap: var(--pages-space-1, 4px);
      font-size: var(--pages-font-size-xs, 11px); padding: 4px 10px;
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-neutral-2, #f5f5f5);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      cursor: pointer; color: var(--pages-neutral-11, #333);
    }
    .reply-btn:hover { background: var(--pages-neutral-3, #e5e5e5); }
    .corrected-marker {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-neutral-8, #888);
      font-style: italic;
    }
    .retraction-tombstone {
      font-size: var(--pages-font-size-sm, 13px);
      color: var(--pages-neutral-8, #888);
      font-style: italic;
      padding: var(--pages-space-1, 4px) 0;
    }
    .correction-history {
      margin-bottom: var(--pages-space-2, 8px);
      padding: var(--pages-space-1, 4px) 0;
    }
    .correction-history .detail-row {
      display: flex; gap: var(--pages-space-2, 8px); padding: 2px 0;
    }
    .correction-history .detail-label {
      color: var(--pages-neutral-8, #888); white-space: nowrap;
    }
    @media (prefers-reduced-motion: reduce) {
      .expanded-section { transition: none; }
    }
  `; }
    _formatTime(iso) {
        const date = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1)
            return 'now';
        if (diffMin < 60)
            return `${diffMin}m`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24)
            return `${diffHr}h`;
        return `${Math.floor(diffHr / 24)}d`;
    }
    _actorIcon(type) {
        switch (type) {
            case 'HUMAN': return '\u{1F464}';
            case 'AGENT': return '\u{1F916}';
            case 'SYSTEM': return '⚙';
            default: return '?';
        }
    }
    connectedCallback() {
        super.connectedCallback();
        this.addEventListener('keydown', this._onKeydown);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('keydown', this._onKeydown);
    }
    get _hasExpandableContent() {
        const m = this.message;
        if (!m)
            return false;
        return !!((m.artefactRefs && m.artefactRefs.length > 0) ||
            m.commitmentId ||
            m.correlationId ||
            m._corrections?.length);
    }
    _toggle() {
        this._expanded = !this._expanded;
    }
    _onReply() {
        emitPagesEvent(this, ChannelEventTopics.MESSAGE_SELECTED, { message: this.message });
    }
    _truncate(text, maxLen) {
        if (text.length <= maxLen)
            return text;
        return text.slice(0, maxLen) + '…';
    }
    _renderExpanded() {
        const m = this.message;
        return html `
      <div class="expanded-section">
        ${this.parentMessage ? html `
          <div class="correlation-context">
            In reply to <span class="parent-sender">${this._displaySender(this.parentMessage.sender, this.parentMessage.actorType)}</span>:
            ${this._truncate(this.parentMessage.content, 80)}
          </div>
        ` : nothing}
        ${m.artefactRefs?.length ? html `
          ${m.artefactRefs.map(ref => html `
            <div class="artefact-detail">
              <span data-type=${ref.type}>${ref.label}</span>
              <span class="artefact-uri">${ref.uri}</span>
              ${ref.scope?.startLine != null ? html `
                <span class="artefact-scope">L${ref.scope.startLine}${ref.scope.endLine != null ? `-${ref.scope.endLine}` : ''}</span>
              ` : nothing}
            </div>
          `)}
        ` : nothing}
        ${this.commitmentState && isObligationCreating(m.messageType) ? html `
          <div class="commitment-details">
            <div class="detail-row">
              <span class="detail-label">State:</span>
              <pages-status-badge domain="commitment" .state=${this.commitmentState}></pages-status-badge>
            </div>
            ${m.deadline ? html `
              <div class="detail-row">
                <span class="detail-label">Deadline:</span>
                <span>${this._formatTime(m.deadline)}</span>
              </div>
            ` : nothing}
            ${m.acknowledgedAt ? html `
              <div class="detail-row">
                <span class="detail-label">Acknowledged:</span>
                <span>${this._formatTime(m.acknowledgedAt)}</span>
              </div>
            ` : nothing}
          </div>
        ` : nothing}
        ${m._corrections?.length ? html `
          <div class="correction-history">
            <div class="detail-row">
              <span class="detail-label">Original:</span>
              <span>${m.content}</span>
            </div>
            ${m._corrections.map((c) => html `
              <div class="detail-row">
                <span class="detail-label">Corrected (${this._formatTime(c.createdAt)}):</span>
                <span>${c.content}</span>
              </div>
            `)}
          </div>
        ` : nothing}
        <div class="metadata">
          ${m.topic ? html `
            <span class="meta-item"><span class="meta-label">Topic:</span> ${m.topic}</span>
          ` : nothing}
          ${this.channelName ? html `
            <span class="meta-item"><span class="meta-label">Channel:</span> ${this.channelName}</span>
          ` : nothing}
        </div>

      </div>
    `;
    }
    render() {
        if (!this.message)
            return nothing;
        const m = this.message;
        const displaySender = this._displaySender(m.sender, m.actorType);
        return html `
      <div class="message-container"
        style="border-left-color: ${speechActBorderColor(m.messageType)}"
        aria-label="${m.messageType} message from ${displaySender}"
        title="${m.messageType}">
        <div class="message-header">
          ${this.showActorBadge ? html `
            <span class="actor-icon" data-actor=${m.actorType}>${this._actorIcon(m.actorType)}</span>
          ` : nothing}
          <span class="sender">${displaySender}</span>
          <time datetime=${m.createdAt}>${this._formatTime(m.createdAt)}</time>
          ${m._corrected ? html `<span class="corrected-marker">(corrected)</span>` : nothing}
          ${this._hasExpandableContent ? html `
            <pages-button class="expand-toggle" variant="ghost" size="sm" @click=${this._toggle} aria-expanded=${this._expanded}>
              ${this._expanded ? '▼' : '▶'}
            </pages-button>
          ` : nothing}
        </div>
        ${m._retracted ? html `
          <div class="retraction-tombstone">[Retracted by ${displaySender} at ${this._formatTime(m.createdAt)}]</div>
        ` : html `
          <div class="content">${this.renderContent?.(m) ?? unsafeHTML(renderMarkdown(m.content))}</div>
        `}
      ${m.messageType === 'HANDOFF' && m.target ? html `
        <div class="delegation-indicator">
          ↳ Delegated to <strong>${m.target}</strong>
        </div>
      ` : nothing}
      ${m.artefactRefs?.length ? html `
        <div class="artefact-chips">
          ${m.artefactRefs.map(ref => html `
            <span class="artefact-chip" data-type=${ref.type}
              @click=${(e) => { e.stopPropagation(); emitPagesEvent(this, ChannelEventTopics.ARTEFACT_SELECTED, { artefactRef: ref }); }}
            >${this._artefactIcon(ref.type)} ${ref.label}</span>
          `)}
        </div>
      ` : nothing}
      ${this._expanded ? this._renderExpanded() : nothing}
      <agency-channel-reaction-bar .reactions=${this.reactions} .messageId=${m.id} .currentActorId=${this.currentActorId}></agency-channel-reaction-bar>
      </div>
    `;
    }
    _artefactIcon(type) {
        switch (type) {
            case 'DOCUMENT': return '📄';
            case 'CODE': return '🔧';
            case 'CASE': return '📋';
            case 'WORK_ITEM': return '✅';
            case 'CHANNEL':
            case 'MESSAGE': return '💬';
            case 'DEBATE': return '🗣️';
            case 'EXTERNAL': return '🔗';
            default: return '📎';
        }
    }
};
__decorate([
    property({ type: Object })
], ChannelMessageElement.prototype, "message", void 0);
__decorate([
    property({ type: Array })
], ChannelMessageElement.prototype, "reactions", void 0);
__decorate([
    property({ type: Boolean })
], ChannelMessageElement.prototype, "showSpeechAct", void 0);
__decorate([
    property({ type: Boolean })
], ChannelMessageElement.prototype, "showActorBadge", void 0);
__decorate([
    property({ type: String })
], ChannelMessageElement.prototype, "commitmentState", void 0);
__decorate([
    property({ type: Object })
], ChannelMessageElement.prototype, "parentMessage", void 0);
__decorate([
    property({ type: String })
], ChannelMessageElement.prototype, "channelName", void 0);
__decorate([
    property({ attribute: false })
], ChannelMessageElement.prototype, "formatSender", void 0);
__decorate([
    property({ attribute: false })
], ChannelMessageElement.prototype, "renderContent", void 0);
__decorate([
    property({ type: String })
], ChannelMessageElement.prototype, "currentActorId", void 0);
__decorate([
    state()
], ChannelMessageElement.prototype, "_expanded", void 0);
ChannelMessageElement = __decorate([
    customElement('agency-channel-message')
], ChannelMessageElement);
export { ChannelMessageElement };
//# sourceMappingURL=channel-message.js.map