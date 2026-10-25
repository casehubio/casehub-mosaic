import { LitElement } from 'lit';
import type { QhorusMessage } from './types.js';
import type { CommitmentRecord } from './commitment.js';
import '@casehubio/pages-ui-components';
export declare class ChannelTaskPanelElement extends LitElement {
    messages: QhorusMessage[];
    commitments: Map<string, CommitmentRecord>;
    selectedMessageId?: string;
    connectedCallback(): void;
    static readonly styles: import("lit").CSSResult;
    private _commands;
    private _isOverdue;
    private _isTerminal;
    private _formatTime;
    private _onRowClick;
    render(): import("lit-html").TemplateResult<1>;
    private _renderRow;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-task-panel': ChannelTaskPanelElement;
    }
}
//# sourceMappingURL=channel-task-panel.d.ts.map