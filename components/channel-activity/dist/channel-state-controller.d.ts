import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { PushController } from './push-controller.js';
import type { QhorusChannel, QhorusMessage, QhorusTopic } from './types.js';
export interface Space {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly parentSpaceId?: string;
}
export interface SpaceNode {
    readonly space: Space;
    readonly channels: QhorusChannel[];
    readonly unreadCount: number;
    readonly children: SpaceNode[];
}
export interface ChannelTree {
    readonly spaces: SpaceNode[];
    readonly ungrouped: QhorusChannel[];
}
export declare class ChannelStateController implements ReactiveController {
    channels: QhorusChannel[];
    topics: QhorusTopic[];
    messages: QhorusMessage[];
    selectedChannelId: string;
    selectedTopicId: string | null;
    viewMode: 'flat' | 'threaded' | 'topics';
    private _host;
    private _currentUserId;
    private _pendingSpaces;
    constructor(host: ReactiveControllerHost, push: PushController);
    addPendingSpace(space: Space): void;
    removePendingSpace(spaceId: string): void;
    applyRenameSpace(spaceId: string, newName: string): void;
    applyMoveChannel(channelId: string, spaceId: string | null, spaceName: string | null, position?: number): void;
    applyDeleteSpace(spaceId: string): void;
    get channelTree(): ChannelTree;
    filteredMessages(): QhorusMessage[];
    channelTopics(): QhorusTopic[];
    handleEvent(topic: string, payload: unknown): void;
    private _applyChannels;
    private _toChannel;
    private _applyTopics;
    private _toTopic;
    private _resolveTopicName;
    private _applyMessages;
    private _trackUnread;
    private _recomputeReplyCounts;
    private _toMessage;
    setCurrentUser(userId: string): void;
    latestMessageId(channelId: string): string | undefined;
    hostConnected(): void;
    hostDisconnected(): void;
}
//# sourceMappingURL=channel-state-controller.d.ts.map