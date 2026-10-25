import { ChannelEventTopics } from './events.js';
export class ReactionController {
    get _base() {
        return typeof this._restBase === 'function' ? this._restBase() : this._restBase;
    }
    constructor(host, push, channels, config) {
        this.reactions = [];
        this._host = host;
        this._channels = channels;
        this._restBase = config.restBase;
        this._fetch = config.fetch ?? globalThis.fetch.bind(globalThis);
        host.addController(this);
        push.registerDatasetHandler('reactions', (op) => { this._applyReactions(op); this._host.requestUpdate(); });
    }
    filteredReactions() {
        if (!this._channels.selectedChannelId)
            return [];
        const channelMessageIds = new Set(this._channels.messages
            .filter(m => m.channelId === this._channels.selectedChannelId)
            .map(m => m.id));
        return this.reactions.filter(r => channelMessageIds.has(r.messageId));
    }
    handleEvent(topic, payload) {
        switch (topic) {
            case ChannelEventTopics.REACT:
                this._addReaction(payload);
                break;
            case ChannelEventTopics.UNREACT:
                this._removeReaction(payload);
                break;
        }
    }
    async _addReaction(payload) {
        const msg = this._channels.messages.find(m => m.id === payload.messageId);
        if (!msg)
            return;
        try {
            await this._fetch(`${this._base}/channels/${msg.channelId}/messages/${payload.messageId}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji: payload.emoji }) });
        }
        catch (e) {
            console.error('Failed to add reaction:', e);
        }
    }
    async _removeReaction(payload) {
        const msg = this._channels.messages.find(m => m.id === payload.messageId);
        if (!msg)
            return;
        try {
            await this._fetch(`${this._base}/channels/${msg.channelId}/messages/${payload.messageId}/reactions/${encodeURIComponent(payload.emoji)}`, { method: 'DELETE' });
        }
        catch (e) {
            console.error('Failed to remove reaction:', e);
        }
    }
    _applyReactions(op) {
        if (op.op === 'snapshot') {
            this.reactions = (op.rows ?? []).map(r => this._toReaction(r));
        }
        else if (op.op === 'append' && op.rows) {
            this.reactions = [...this.reactions, ...op.rows.map(r => this._toReaction(r))];
        }
        else if (op.op === 'remove' && op.key) {
            const sep = op.key.indexOf(':');
            if (sep >= 0) {
                const msgId = op.key.substring(0, sep);
                const emoji = op.key.substring(sep + 1);
                this.reactions = this.reactions.filter(r => !(r.messageId === msgId && r.emoji === emoji));
            }
            else {
                this.reactions = this.reactions.filter(r => r.messageId !== op.key);
            }
        }
    }
    _toReaction(r) {
        return { messageId: r[0], emoji: r[1], actorId: '', createdAt: '' };
    }
    hostConnected() { }
    hostDisconnected() { }
}
//# sourceMappingURL=reaction-controller.js.map