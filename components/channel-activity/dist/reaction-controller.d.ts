import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { PushController } from './push-controller.js';
import type { ChannelStateController } from './channel-state-controller.js';
import type { Reaction } from './types.js';
export interface ReactionConfig {
    readonly restBase: string | (() => string);
    readonly fetch?: typeof globalThis.fetch;
}
export declare class ReactionController implements ReactiveController {
    reactions: Reaction[];
    private _host;
    private _channels;
    private _restBase;
    private _fetch;
    private get _base();
    constructor(host: ReactiveControllerHost, push: PushController, channels: ChannelStateController, config: ReactionConfig);
    filteredReactions(): Reaction[];
    handleEvent(topic: string, payload: unknown): void;
    private _addReaction;
    private _removeReaction;
    private _applyReactions;
    private _toReaction;
    hostConnected(): void;
    hostDisconnected(): void;
}
//# sourceMappingURL=reaction-controller.d.ts.map