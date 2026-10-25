import { LitElement, type TemplateResult } from 'lit';
import type { QhorusMessage, QhorusTopic, Reaction, ActorType } from './types.js';
import { type RovingDirection } from '@casehubio/pages-primitives/a11y';
import './channel-message.js';
import './channel-thread.js';
import './channel-hover-toolbar.js';
import '@casehubio/pages-ui-components';
declare const ChannelFeedBase: (new (...args: any[]) => {
    rovingSelector: string;
    rovingDirection: RovingDirection;
    rovingIndex: number;
    navigateRoving(direction: "next" | "prev" | "first" | "last"): void;
}) & (new (...args: any[]) => {
    registerShortcut(key: string, handler: () => void, opts: {
        description: string;
        requiresModifier?: boolean;
    }): void;
    unregisterShortcut(key: string): void;
    getShortcuts(): {
        key: string;
        description: string;
    }[];
}) & (new (...args: any[]) => {
    announce(message: string, priority?: "polite" | "assertive"): void;
}) & (new (...args: any[]) => {
    trapFocus(container: HTMLElement): void;
    releaseFocus(): void;
}) & typeof LitElement;
export declare class ChannelFeedElement extends ChannelFeedBase {
    rovingSelector: string;
    rovingDirection: RovingDirection;
    messages: QhorusMessage[];
    reactions: Reaction[];
    channelId: string;
    channelName?: string;
    terminalDimming: boolean;
    eventStyling: boolean;
    autoScroll: boolean;
    staleCursorMinutes: number;
    renderContextHeader?: () => TemplateResult;
    viewMode: 'flat' | 'threaded' | 'topics';
    topics: QhorusTopic[];
    selectedMessageId?: string;
    renderContent?: (message: QhorusMessage) => TemplateResult | undefined;
    formatSender?: (sender: string, actorType: ActorType) => string;
    currentActorId?: string;
    messageHighlights: Record<string, string>;
    private _prevMessageCount;
    private _showStalePrompt;
    private _staleCursorId?;
    _scrolledUp: boolean;
    _unreadCount: number;
    private _hoveredMessageId;
    private _isHoveringToolbar;
    private _hoverLeaveTimer;
    private _correctionMap;
    private _retractedIds;
    static readonly styles: import("lit").CSSResult;
    private _loadCursors;
    private _checkStaleCursor;
    private _onCatchUp;
    private _onReload;
    private _applyCorrections;
    _separateRootsAndReplies(): {
        roots: QhorusMessage[];
        repliesByParent: Map<string, QhorusMessage[]>;
    };
    private _groupFlat;
    private _buildReactionIndex;
    private _threadReactions;
    private _highlightStyle;
    private _messageItemClasses;
    willUpdate(changed: Map<string, unknown>): void;
    updated(changed: Map<string, unknown>): void;
    private _scrollToSelected;
    connectedCallback(): void;
    firstUpdated(): void;
    disconnectedCallback(): void;
    private _onFeedKeydown;
    private _onFeedScroll;
    private _onMessageEnter;
    private _onMessageLeave;
    private _onToolbarEnter;
    private _onToolbarLeave;
    private _renderHoverToolbar;
    private _scrollToBottom;
    render(): TemplateResult<1>;
    private _renderFeed;
    private _renderTopics;
    private _renderFlat;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-feed': ChannelFeedElement;
    }
}
export {};
//# sourceMappingURL=channel-feed.d.ts.map