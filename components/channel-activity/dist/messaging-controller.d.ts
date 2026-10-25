import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { ChannelStateController } from './channel-state-controller.js';
export interface MessagingConfig {
    readonly restBase: string | (() => string);
    readonly messageRestBase?: string | (() => string);
    readonly fetch?: typeof globalThis.fetch;
}
export declare class MessagingController implements ReactiveController {
    replyTo: {
        messageId: string;
        senderName: string;
    } | undefined;
    private _host;
    private _channels;
    private _restBase;
    private _messageRestBase;
    private _fetch;
    private get _base();
    private get _msgBase();
    constructor(host: ReactiveControllerHost, channels: ChannelStateController, config: MessagingConfig);
    handleEvent(topic: string, payload: unknown): void;
    private _sendMessage;
    private _createChannel;
    private _deleteChannel;
    private _updateTopicState;
    private _postJson;
    private _putJson;
    hostConnected(): void;
    hostDisconnected(): void;
}
//# sourceMappingURL=messaging-controller.d.ts.map