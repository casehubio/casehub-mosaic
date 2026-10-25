import { LitElement, type TemplateResult } from 'lit';
import { type MessageType, type QhorusTopic, type QhorusMessage } from './types.js';
import '@casehubio/pages-ui-components';
export declare class ChannelInputElement extends LitElement {
    channelId: string;
    replyTo?: {
        messageId: string;
        senderName: string;
    } | undefined;
    showTypeSelector: boolean;
    messageTypes: MessageType[];
    allowedTypes?: MessageType[];
    deniedTypes?: MessageType[];
    renderError?: (error: string) => TemplateResult;
    topic: string;
    topicId: string;
    topics: QhorusTopic[];
    showTopicSelector: boolean;
    correctionTarget?: Pick<QhorusMessage, 'id' | 'content' | 'sender' | 'createdAt'> | undefined;
    private _text;
    private _error;
    private _selectedType;
    private _textarea;
    static readonly styles: import("lit").CSSResult;
    computeAvailableTypes(): MessageType[];
    private get _hasContent();
    private _handleKeydown;
    private _handleInput;
    private _autoResize;
    private _send;
    private _cancelReply;
    private _cancelCorrection;
    private _onTypeChange;
    setError(error: string): void;
    updated(changed: Map<string, unknown>): void;
    render(): TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-input': ChannelInputElement;
    }
}
//# sourceMappingURL=channel-input.d.ts.map