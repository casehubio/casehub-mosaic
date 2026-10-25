import { LitElement, nothing, type TemplateResult } from 'lit';
import type { QhorusMessage, Reaction, CommitmentState, ActorType } from './types.js';
import '@casehubio/pages-ui-components';
export declare class ChannelMessageElement extends LitElement {
    message: QhorusMessage;
    reactions: Reaction[];
    showSpeechAct: boolean;
    showActorBadge: boolean;
    commitmentState?: CommitmentState;
    parentMessage?: QhorusMessage;
    channelName?: string;
    formatSender?: (sender: string, actorType: ActorType) => string;
    private _displaySender;
    renderContent?: (message: QhorusMessage) => TemplateResult | undefined;
    currentActorId?: string;
    private _expanded;
    static readonly styles: import("lit").CSSResult;
    private _formatTime;
    private _actorIcon;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _onKeydown;
    private get _hasExpandableContent();
    private _toggle;
    private _onReply;
    private _truncate;
    private _renderExpanded;
    render(): typeof nothing | TemplateResult<1>;
    private _artefactIcon;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-message': ChannelMessageElement;
    }
}
//# sourceMappingURL=channel-message.d.ts.map