import { LitElement, type TemplateResult } from 'lit';
import type { PushController } from './push-controller.js';
import type { MessagingConfig } from './messaging-controller.js';
import type { ReactionConfig } from './reaction-controller.js';
import { ChannelStateController } from './channel-state-controller.js';
import { MessagingController } from './messaging-controller.js';
import { MembershipController } from './membership-controller.js';
import { ReactionController } from './reaction-controller.js';
import { CommitmentController } from './commitment-controller.js';
import type { QhorusChannel, QhorusMessage, QhorusTopic, ChannelMember, PresenceState, Reaction, ActorType, ArtefactRef, MessageType } from './types.js';
import type { CommitmentRecord } from '@casehubio/mosaic-core';
import type { ChannelTree } from './channel-state-controller.js';
import './channel-feed.js';
import './channel-nav.js';
import './channel-input.js';
import './channel-topic-bar.js';
import '@casehubio/pages-ui-components/split-workbench';
declare const Base: (new (...args: any[]) => {
    registerShortcut(key: string, handler: () => void, opts: {
        description: string;
        requiresModifier?: boolean;
    }): void;
    unregisterShortcut(key: string): void;
    getShortcuts(): Array<{
        key: string;
        description: string;
    }>;
}) & (new (...args: any[]) => {
    announce(message: string, priority?: "polite" | "assertive"): void;
}) & typeof LitElement;
export interface ChannelActivityProps {
    selectionTopic: string;
    channelNavLayout: 'sidebar' | 'dropdown';
    sidebarOpen: boolean;
    currentActorId?: string;
    autoScroll: boolean;
    staleCursorMinutes: number;
    terminalDimming: boolean;
    eventStyling: boolean;
    viewMode: 'flat' | 'threaded' | 'topics';
    selectedMessageId?: string;
    showTypeSelector: boolean;
    showTopicSelector: boolean;
    showCreate: boolean;
    showDelete: boolean;
}
export declare class BlocksChannelActivityElement extends Base {
    selectionTopic: string;
    channelNavLayout: 'sidebar' | 'dropdown';
    sidebarOpen: boolean;
    currentActorId?: string;
    pushController?: PushController;
    messagingConfig?: MessagingConfig;
    reactionConfig?: ReactionConfig;
    channels: QhorusChannel[];
    messages: QhorusMessage[];
    members: ChannelMember[];
    presence: PresenceState[];
    reactions: Reaction[];
    commitments: Map<string, CommitmentRecord>;
    channelTree?: ChannelTree;
    topics: QhorusTopic[];
    autoScroll: boolean;
    staleCursorMinutes: number;
    terminalDimming: boolean;
    eventStyling: boolean;
    viewMode: 'flat' | 'threaded' | 'topics';
    selectedMessageId?: string;
    messageHighlights: Record<string, string>;
    renderContextHeader?: () => TemplateResult;
    renderContent?: (message: QhorusMessage) => TemplateResult | undefined;
    formatSender?: (sender: string, actorType: ActorType) => string;
    showTypeSelector: boolean;
    showTopicSelector: boolean;
    messageTypes?: MessageType[];
    allowedTypes?: MessageType[];
    deniedTypes?: MessageType[];
    renderError?: (error: string) => TemplateResult;
    showCreate: boolean;
    showDelete: boolean;
    resolveArtifact?: (ref: ArtefactRef) => Promise<unknown>;
    _selectedChannelId: string;
    _selectedChannelName: string | undefined;
    _selectedTopicId: string | null;
    _replyTo: {
        messageId: string;
        senderName: string;
    } | undefined;
    _activeSidebarTab: string;
    _selectedArtefactRef?: ArtefactRef;
    _channels: ChannelStateController | undefined;
    _messaging: MessagingController | undefined;
    _membership: MembershipController | undefined;
    _reactions: ReactionController | undefined;
    _commitmentCtrl: CommitmentController | undefined;
    _unsubs: (() => void)[];
    _sidebarPanels: Map<string, HTMLElement>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    updated(changed: Map<string, unknown>): void;
    configure(props: Partial<ChannelActivityProps>): void;
    private get _navChannels();
    private get _navChannelTree();
    private get _feedMessages();
    private get _feedReactions();
    private get _feedTopics();
    private _setupControllers;
    private _teardownControllers;
    private _wireEventRouting;
    private _handleKeydown;
    private static readonly SIDEBAR_TABS;
    private _renderSidebar;
    private _renderSidebarPanel;
    private _wireSidebarPanel;
    static styles: import("lit").CSSResult;
    render(): TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'blocks-channel-activity': BlocksChannelActivityElement;
    }
}
export {};
//# sourceMappingURL=blocks-channel-activity.d.ts.map