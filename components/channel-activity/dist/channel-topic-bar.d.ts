import { LitElement } from 'lit';
import type { QhorusTopic } from './types.js';
import '@casehubio/pages-ui-components';
export declare class ChannelTopicBarElement extends LitElement {
    topics: QhorusTopic[];
    selectedTopicId: string | null;
    viewMode: 'flat' | 'threaded' | 'topics';
    private _showArchived;
    static readonly styles: import("lit").CSSResult;
    private _sortedTopics;
    private _hasArchived;
    private _onPillClick;
    private _onModeClick;
    private _toggleArchived;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-topic-bar': ChannelTopicBarElement;
    }
}
//# sourceMappingURL=channel-topic-bar.d.ts.map