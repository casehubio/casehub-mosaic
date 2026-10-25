import type { QhorusMessage, MessageType, ArtefactRef } from './types.js';
export declare const ChannelEventTopics: {
    readonly SEND_MESSAGE: "channel:send-message";
    readonly REACT: "channel:react";
    readonly UNREACT: "channel:unreact";
    readonly CREATE_CHANNEL: "channel:create";
    readonly DELETE_CHANNEL: "channel:delete";
    readonly SELECT_CHANNEL: "channel:selected";
    readonly MESSAGE_SELECTED: "channel:message-selected";
    readonly CURSOR_CATCHUP: "channel:cursor-catchup";
    readonly CURSOR_RELOAD: "channel:cursor-reload";
    readonly SELECT_TOPIC: "channel:select-topic";
    readonly VIEW_MODE: "channel:view-mode";
    readonly CREATE_TOPIC: "channel:create-topic";
    readonly RESOLVE_TOPIC: "channel:resolve-topic";
    readonly REOPEN_TOPIC: "channel:reopen-topic";
    readonly ARCHIVE_TOPIC: "channel:archive-topic";
    readonly RENAME_TOPIC: "channel:rename-topic";
    readonly MERGE_TOPIC: "channel:merge-topic";
    readonly ARTEFACT_SELECTED: "channel:artefact-selected";
    readonly CREATE_SPACE: "space:create";
    readonly RENAME_SPACE: "space:rename";
    readonly DELETE_SPACE: "space:delete";
    readonly MOVE_CHANNEL_TO_SPACE: "channel:move-to-space";
    readonly CORRECT_MESSAGE: "channel:correct-message";
    readonly RETRACT_MESSAGE: "channel:retract-message";
};
export interface SendMessagePayload {
    readonly channelId: string;
    readonly content: string;
    readonly topic?: string;
    readonly topicId?: string;
    readonly inReplyTo?: string;
    readonly speechAct?: MessageType;
    readonly artefactRefs?: readonly ArtefactRef[];
}
export interface SelectTopicPayload {
    readonly channelId: string;
    readonly topicId: string | null;
}
export interface ViewModePayload {
    readonly mode: 'flat' | 'threaded' | 'topics';
}
export interface TopicActionPayload {
    readonly channelId: string;
    readonly topicId: string;
}
export interface RenameTopicPayload {
    readonly channelId: string;
    readonly topicId: string;
    readonly newName: string;
}
export interface MergeTopicPayload {
    readonly channelId: string;
    readonly sourceTopicId: string;
    readonly targetTopicId: string;
}
export interface CreateTopicPayload {
    readonly channelId: string;
    readonly name: string;
}
export interface ReactPayload {
    readonly messageId: string;
    readonly emoji: string;
}
export interface CreateChannelPayload {
    readonly name: string;
    readonly description?: string;
    readonly spaceId?: string;
    readonly semantic?: string;
}
export interface DeleteChannelPayload {
    readonly channelId: string;
}
export interface SelectChannelPayload {
    readonly channelId: string;
}
export interface MessageSelectedPayload {
    readonly message: QhorusMessage;
}
export interface CursorActionPayload {
    readonly channelId: string;
    readonly cursorId?: string;
}
export interface CreateSpacePayload {
    readonly name: string;
}
export interface RenameSpacePayload {
    readonly spaceId: string;
    readonly newName: string;
}
export interface DeleteSpacePayload {
    readonly spaceId: string;
}
export interface MoveChannelToSpacePayload {
    readonly channelId: string;
    readonly spaceId: string | null;
    readonly position?: number;
}
//# sourceMappingURL=events.d.ts.map