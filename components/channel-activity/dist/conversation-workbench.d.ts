import { LitElement } from 'lit';
import type { SendMessagePayload, QhorusChannel } from './index.js';
import type { ConnectionStatus } from './push-controller.js';
export interface LayoutState {
    splits: Record<string, number>;
    docks: Record<string, boolean>;
    panels: Record<string, unknown>;
}
export interface PushConnection {
    close(): void;
}
export interface ConnectPushOptions {
    onOp: (op: unknown) => void;
    onStatusChange: (status: ConnectionStatus) => void;
    topics: string[];
}
export interface ConversationWorkbenchConfig {
    fetch: (url: string, init?: RequestInit) => Promise<Response>;
    currentActorId: string;
    restBase: string;
    connectPush: (options: ConnectPushOptions) => PushConnection;
    channelFilter?: (channel: QhorusChannel) => boolean;
    sendMessage: (payload: SendMessagePayload) => Promise<void>;
    markRead?: (channelId: string, lastReadMessageId: string) => Promise<void>;
    createSpace?: (name: string) => Promise<void>;
    renameSpace?: (spaceId: string, newName: string) => Promise<void>;
    deleteSpace?: (spaceId: string) => Promise<void>;
    moveChannelToSpace?: (channelId: string, spaceId: string, position?: number) => Promise<void>;
    correctMessage?: (channelId: string, messageId: string, content: string) => Promise<void>;
    retractMessage?: (channelId: string, messageId: string, reason?: string) => Promise<void>;
    layoutStore?: {
        load(key: string): Promise<LayoutState | null>;
        save(key: string, state: LayoutState): Promise<void>;
    };
}
export declare class ConversationWorkbenchElement extends LitElement {
    config: ConversationWorkbenchConfig;
    private _push;
    private _channels;
    private _messaging;
    private _members;
    private _reactions;
    private _commitments;
    private _layoutState;
    private _mode;
    private _tabletTab;
    private _drawerOpen;
    private _compactDensity;
    private _navWidth;
    private _memberWidth;
    private _selectedArtefactRef?;
    private static readonly DOCK_ITEMS;
    private _swipeController;
    private _pushConn?;
    private _mqTablet?;
    private _mqDesktop?;
    static readonly styles: import("lit").CSSResult;
    connectedCallback(): void;
    private _loadLayout;
    firstUpdated(): void;
    disconnectedCallback(): void;
    private _setupMediaQueries;
    private _onMediaChange;
    private _updateMode;
    private _toggleDock;
    private _isDockOpen;
    private _closeDrawer;
    private _saveLayout;
    private _onDragStart;
    private _filteredChannels;
    private _onChatEvent;
    private _sendMessage;
    willUpdate(): void;
    private _renderNav;
    private _renderMembers;
    private _renderConnectionBanner;
    private _renderChat;
    private _renderDockStrip;
    private _renderPanel;
    private _renderSettings;
    render(): import("lit-html").TemplateResult<1>;
    private _renderDesktop;
    private _tabletCount;
    private _renderTablet;
    private _renderPhone;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-conversation-workbench': ConversationWorkbenchElement;
    }
}
//# sourceMappingURL=conversation-workbench.d.ts.map