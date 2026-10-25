import { LitElement } from 'lit';
import 'emoji-picker-element';
export declare class ChannelEmojiPickerElement extends LitElement {
    skinToneEmoji?: string;
    connectedCallback(): void;
    static readonly styles: import("lit").CSSResult;
    private _onEmojiClick;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-emoji-picker': ChannelEmojiPickerElement;
    }
}
//# sourceMappingURL=channel-emoji-picker.d.ts.map