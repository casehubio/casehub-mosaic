import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { PushController } from './push-controller.js';
import type { ChannelStateController } from './channel-state-controller.js';
import type { CommitmentRecord } from '@casehubio/mosaic-core';
export declare class CommitmentController implements ReactiveController {
    commitments: Map<string, CommitmentRecord>;
    selectedMessageId?: string;
    private _host;
    private _channels;
    constructor(host: ReactiveControllerHost, push: PushController, channels: ChannelStateController);
    handleEvent(topic: string, payload: unknown): void;
    private _applyCommitments;
    private _parseRow;
    hostConnected(): void;
    hostDisconnected(): void;
}
//# sourceMappingURL=commitment-controller.d.ts.map