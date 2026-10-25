import { LitElement } from 'lit';
import type { Reaction } from './types.js';
import '@casehubio/pages-ui-components';
export declare class ChannelReactionBarElement extends LitElement {
    reactions: Reaction[];
    messageId: string;
    currentActorId?: string;
    connectedCallback(): void;
    static readonly styles: import("lit").CSSResult;
    private _grouped;
    private _toggleReaction;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-reaction-bar': ChannelReactionBarElement;
    }
}
//# sourceMappingURL=channel-reaction-bar.d.ts.map