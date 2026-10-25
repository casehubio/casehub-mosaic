var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import 'emoji-picker-element';
let ChannelEmojiPickerElement = class ChannelEmojiPickerElement extends LitElement {
    constructor() {
        super(...arguments);
        this._onEmojiClick = (e) => {
            const detail = e.detail;
            const unicode = detail.unicode ?? detail.emoji?.unicode;
            if (!unicode)
                return;
            this.dispatchEvent(new CustomEvent('emoji-selected', {
                bubbles: true,
                composed: true,
                detail: { emoji: unicode },
            }));
        };
    }
    connectedCallback() {
        super.connectedCallback();
        this.setAttribute('role', 'group');
        this.setAttribute('aria-label', 'Emoji picker');
    }
    static { this.styles = css `
    :host {
      display: block;
    }
    emoji-picker {
      --background: var(--pages-neutral-1, #fff);
      --border-color: var(--pages-neutral-5, #d4d4d4);
      --text-color: var(--pages-neutral-12, #111);
      --secondary-text-color: var(--pages-neutral-8, #888);
      --indicator-color: var(--pages-accent-9, #6366f1);
      --input-border-color: var(--pages-neutral-5, #d4d4d4);
      --button-hover-background: var(--pages-neutral-3, #e5e5e5);
      --button-active-background: var(--pages-neutral-4, #d4d4d4);
      --category-font-size: var(--pages-font-size-xs, 11px);
      --font-family: var(--pages-font-family, 'Inter', system-ui, sans-serif);
      --font-size: var(--pages-font-size-base, 14px);
    }
  `; }
    render() {
        return html `<emoji-picker
      skin-tone-emoji=${this.skinToneEmoji ?? '🖐️'}
      @emoji-click=${this._onEmojiClick}></emoji-picker>`;
    }
};
__decorate([
    property({ type: String })
], ChannelEmojiPickerElement.prototype, "skinToneEmoji", void 0);
ChannelEmojiPickerElement = __decorate([
    customElement('agency-channel-emoji-picker')
], ChannelEmojiPickerElement);
export { ChannelEmojiPickerElement };
//# sourceMappingURL=channel-emoji-picker.js.map