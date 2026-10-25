export class MembershipController {
    constructor(host, push, channels) {
        this.members = [];
        this.presence = [];
        this._host = host;
        this._channels = channels;
        host.addController(this);
        push.registerDatasetHandler('members', (op) => { this._applyMembers(op); this._host.requestUpdate(); });
        push.registerDatasetHandler('presence', (op) => { this._applyPresence(op); this._host.requestUpdate(); });
    }
    filteredMembers() {
        if (!this._channels.selectedChannelId)
            return [];
        return this.members.filter(m => m.channelId === this._channels.selectedChannelId);
    }
    _applyMembers(op) {
        if (op.op === 'snapshot') {
            this.members = (op.rows ?? []).map(r => this._toMember(r));
        }
        else if (op.op === 'append' && op.rows) {
            this.members = [...this.members, ...op.rows.map(r => this._toMember(r))];
        }
        else if (op.op === 'remove' && op.key) {
            const sep = op.key.indexOf(':');
            if (sep >= 0) {
                const chId = op.key.substring(0, sep);
                const memId = op.key.substring(sep + 1);
                this.members = this.members.filter(m => !(m.channelId === chId && m.memberId === memId));
            }
            else {
                this.members = this.members.filter(m => m.memberId !== op.key);
            }
        }
    }
    _toMember(row) {
        return {
            channelId: row[1],
            memberId: row[2],
            displayName: row[3],
            role: row[4] || 'PARTICIPANT',
        };
    }
    _applyPresence(op) {
        if (op.op === 'snapshot') {
            this.presence = (op.rows ?? []).map(r => this._toPresence(r));
        }
        else if (op.op === 'replace' && op.row) {
            this.presence = this.presence.map(p => p.memberId === op.row[0]
                ? this._toPresence(op.row)
                : p);
        }
    }
    _toPresence(row) {
        const p = {
            memberId: row[0],
            status: row[1],
        };
        const lastSeen = row[2];
        if (lastSeen)
            p.lastSeenAt = lastSeen;
        return p;
    }
    hostConnected() { }
    hostDisconnected() { }
}
//# sourceMappingURL=membership-controller.js.map