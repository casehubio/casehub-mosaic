import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { PushController } from './push-controller.js';
import type { ChannelStateController } from './channel-state-controller.js';
import type { ChannelMember, PresenceState } from './types.js';
export declare class MembershipController implements ReactiveController {
    members: ChannelMember[];
    presence: PresenceState[];
    private _host;
    private _channels;
    constructor(host: ReactiveControllerHost, push: PushController, channels: ChannelStateController);
    filteredMembers(): ChannelMember[];
    private _applyMembers;
    private _toMember;
    private _applyPresence;
    private _toPresence;
    hostConnected(): void;
    hostDisconnected(): void;
}
//# sourceMappingURL=membership-controller.d.ts.map