import { LitElement } from 'lit';
import type { ArtefactRef, ResolvedArtifact } from './types.js';
import '@casehubio/pages-ui-components';
export declare class ChannelArtifactPanelElement extends LitElement {
    selectedArtefactRef?: ArtefactRef;
    resolveArtifact?: (ref: ArtefactRef) => Promise<ResolvedArtifact>;
    private _history;
    private _historyIndex;
    private _content?;
    private _language?;
    connectedCallback(): void;
    static readonly styles: import("lit").CSSResult;
    private _typeIcon;
    willUpdate(changed: Map<string, unknown>): void;
    private _loadContent;
    private _navigateBack;
    private _navigateForward;
    private _copyUri;
    render(): import("lit-html").TemplateResult<1>;
    private _renderContent;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-artifact-panel': ChannelArtifactPanelElement;
    }
}
//# sourceMappingURL=channel-artifact-panel.d.ts.map