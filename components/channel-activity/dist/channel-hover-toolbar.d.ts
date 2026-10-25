import { LitElement, nothing } from 'lit';
import type { QhorusMessage } from './types.js';
import './channel-emoji-picker.js';
export declare class ChannelHoverToolbarElement extends LitElement {
    message?: QhorusMessage;
    currentActorId: string;
    private _overflowOpen;
    private _retractConfirming;
    private _emojiPickerOpen;
    static readonly styles: import("lit").CSSResult;
    private get _isOwnMessage();
    private get _isSystemMessage();
    render(): typeof nothing | import("lit-html").TemplateResult<1>;
    private _onReact;
    private _positionPicker;
    private _onEmojiSelected;
    private _onReply;
    private _toggleOverflow;
    private _renderOverflow;
    private _onCorrect;
    private _onRetract;
    private _confirmRetract;
    private _cancelRetract;
    private _renderRetractConfirm;
    private _onViewDetails;
    private _onCopy;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-hover-toolbar': ChannelHoverToolbarElement;
    }
}
//# sourceMappingURL=channel-hover-toolbar.d.ts.map