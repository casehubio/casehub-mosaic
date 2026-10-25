import { LitElement } from 'lit';
import type { ChannelMember, PresenceState } from './types.js';
import '@casehubio/pages-ui-components';
export declare class ChannelMemberPanelElement extends LitElement {
    static readonly styles: import("lit").CSSResult;
    members: ChannelMember[];
    presence: PresenceState[];
    private getPresence;
    private getSortedMembers;
    private groupMembers;
    private getPresenceVariant;
    private getRoleBadge;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-member-panel': ChannelMemberPanelElement;
    }
}
//# sourceMappingURL=channel-member-panel.d.ts.map