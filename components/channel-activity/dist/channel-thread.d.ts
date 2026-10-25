import { LitElement, nothing, type TemplateResult } from 'lit';
import type { QhorusMessage, CommitmentState, Reaction, ActorType } from './types.js';
import './channel-message.js';
import '@casehubio/pages-ui-components';
export declare class ChannelThreadElement extends LitElement {
    rootMessage: QhorusMessage;
    replies: QhorusMessage[];
    reactions: Reaction[];
    collapsed: boolean;
    commitmentState?: CommitmentState;
    selectedMessageId?: string;
    renderContent?: (message: QhorusMessage) => TemplateResult | undefined;
    formatSender: (sender: string, actorType: ActorType) => string;
    currentActorId?: string;
    static readonly styles: import("lit").CSSResult;
    willUpdate(changed: Map<string, unknown>): void;
    private _toggle;
    private _summary;
    private _lastActivityAge;
    render(): typeof nothing | TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-thread': ChannelThreadElement;
    }
}
//# sourceMappingURL=channel-thread.d.ts.map