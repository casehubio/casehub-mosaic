import { LitElement } from 'lit';
import type { QhorusMessage } from './types.js';
import type { CommitmentRecord } from './commitment.js';
import '@casehubio/pages-ui-components';
export declare class ChannelCorrelationPanelElement extends LitElement {
    messages: QhorusMessage[];
    commitments: Map<string, CommitmentRecord>;
    selectedMessageId?: string;
    connectedCallback(): void;
    static readonly styles: import("lit").CSSResult;
    private _actorIcon;
    private _formatDuration;
    private _formatTime;
    private _getChain;
    private _onNodeClick;
    render(): import("lit-html").TemplateResult<1>;
    private _renderConnector;
    private _renderNode;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-correlation-panel': ChannelCorrelationPanelElement;
    }
}
//# sourceMappingURL=channel-correlation-panel.d.ts.map