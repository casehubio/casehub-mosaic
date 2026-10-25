var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { ChannelEventTopics } from './events.js';
import '@casehubio/pages-ui-components';
let ChannelReactionBarElement = class ChannelReactionBarElement extends LitElement {
    constructor() {
        super(...arguments);
        this.reactions = [];
        this.messageId = '';
    }
    connectedCallback() {
        super.connectedCallback();
        this.setAttribute('role', 'group');
        this.setAttribute('aria-label', 'Message reactions');
    }
    static { this.styles = css `
    :host { display: flex; gap: var(--pages-space-1, 4px); flex-wrap: wrap; margin-top: var(--pages-space-1, 4px); }
    .reaction-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px;
      border-radius: 9999px;
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      background: var(--pages-neutral-1, #fafafa);
      font-size: var(--pages-font-size-xs, 11px);
      cursor: pointer;
      user-select: none;
    }
    .reaction-pill:hover { background: var(--pages-neutral-3, #e5e5e5); }
    .reaction-pill.reacted {
      border-color: var(--pages-accent-7, #818cf8);
      background: var(--pages-accent-2, #eef2ff);
    }
    .count { color: var(--pages-neutral-9, #737373); }

  `; }
    _grouped() {
        const map = new Map();
        for (const r of this.reactions) {
            const entry = map.get(r.emoji) ?? { actors: [] };
            entry.actors.push(r.actorId);
            map.set(r.emoji, entry);
        }
        return [...map.entries()].map(([emoji, { actors }]) => ({
            emoji,
            count: actors.length,
            actors,
            userReacted: this.currentActorId != null && actors.includes(this.currentActorId),
        }));
    }
    _toggleReaction(emoji, userReacted) {
        const topic = userReacted ? ChannelEventTopics.UNREACT : ChannelEventTopics.REACT;
        emitPagesEvent(this, topic, { messageId: this.messageId, emoji });
    }
    render() {
        const groups = this._grouped();
        return html `
      ${groups.map(g => html `
        <pages-button class="reaction-pill ${g.userReacted ? 'reacted' : ''}"
                @click=${() => this._toggleReaction(g.emoji, g.userReacted)}>
          <span class="emoji">${g.emoji}</span>
          <span class="count">${g.count}</span>
        </pages-button>
      `)}
    `;
    }
};
__decorate([
    property({ type: Array })
], ChannelReactionBarElement.prototype, "reactions", void 0);
__decorate([
    property({ type: String })
], ChannelReactionBarElement.prototype, "messageId", void 0);
__decorate([
    property({ type: String })
], ChannelReactionBarElement.prototype, "currentActorId", void 0);
ChannelReactionBarElement = __decorate([
    customElement('agency-channel-reaction-bar')
], ChannelReactionBarElement);
export { ChannelReactionBarElement };
//# sourceMappingURL=channel-reaction-bar.js.map