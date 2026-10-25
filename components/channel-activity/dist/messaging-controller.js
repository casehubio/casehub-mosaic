import { ChannelEventTopics } from './events.js';
export class MessagingController {
    get _base() {
        return typeof this._restBase === 'function' ? this._restBase() : this._restBase;
    }
    get _msgBase() {
        if (this._messageRestBase) {
            return typeof this._messageRestBase === 'function' ? this._messageRestBase() : this._messageRestBase;
        }
        return `${this._base}/channels`;
    }
    constructor(host, channels, config) {
        this._host = host;
        this._channels = channels;
        this._restBase = config.restBase;
        this._messageRestBase = config.messageRestBase;
        this._fetch = config.fetch ?? globalThis.fetch.bind(globalThis);
        host.addController(this);
    }
    handleEvent(topic, payload) {
        switch (topic) {
            case ChannelEventTopics.SEND_MESSAGE:
                this._sendMessage(payload);
                break;
            case ChannelEventTopics.CREATE_CHANNEL:
                this._createChannel(payload);
                break;
            case ChannelEventTopics.DELETE_CHANNEL:
                this._deleteChannel(payload.channelId);
                break;
            case ChannelEventTopics.MESSAGE_SELECTED: {
                const msg = payload.message;
                this.replyTo = { messageId: msg.inReplyTo ?? msg.id, senderName: msg.sender };
                this._host.requestUpdate();
                break;
            }
            case ChannelEventTopics.CREATE_TOPIC: {
                const cp = payload;
                this._postJson(`${this._base}/channels/${cp.channelId}/topics`, { name: cp.name });
                break;
            }
            case ChannelEventTopics.RENAME_TOPIC: {
                const rp = payload;
                this._putJson(`${this._base}/channels/${rp.channelId}/topics/${rp.topicId}`, { name: rp.newName });
                break;
            }
            case ChannelEventTopics.MERGE_TOPIC: {
                const mp = payload;
                this._postJson(`${this._base}/channels/${mp.channelId}/topics/${mp.sourceTopicId}/merge`, { targetTopicId: mp.targetTopicId });
                break;
            }
            case ChannelEventTopics.RESOLVE_TOPIC:
                this._updateTopicState(payload, 'RESOLVED');
                break;
            case ChannelEventTopics.REOPEN_TOPIC:
                this._updateTopicState(payload, 'ACTIVE');
                break;
            case ChannelEventTopics.ARCHIVE_TOPIC:
                this._updateTopicState(payload, 'ARCHIVED');
                break;
        }
    }
    async _sendMessage(payload) {
        try {
            const url = payload.inReplyTo
                ? `${this._msgBase}/${payload.channelId}/messages/${payload.inReplyTo}/replies`
                : `${this._msgBase}/${payload.channelId}/messages`;
            const body = { text: payload.content };
            if (payload.speechAct)
                body.messageType = payload.speechAct;
            if (payload.artefactRefs?.length)
                body.artefactRefs = payload.artefactRefs;
            if (payload.topicId)
                body.topicId = payload.topicId;
            else if (payload.topic)
                body.topic = payload.topic;
            await this._postJson(url, body);
            this.replyTo = undefined;
            this._host.requestUpdate();
        }
        catch (e) {
            console.error('Failed to send message:', e);
        }
    }
    async _createChannel(payload) {
        try {
            await this._postJson(`${this._restBase}/channels`, { name: payload.name });
        }
        catch (e) {
            console.error('Failed to create channel:', e);
        }
    }
    async _deleteChannel(channelId) {
        try {
            await this._fetch(`${this._base}/channels/${channelId}`, { method: 'DELETE' });
        }
        catch (e) {
            console.error('Failed to delete channel:', e);
        }
    }
    _updateTopicState(payload, state) {
        this._putJson(`${this._base}/channels/${payload.channelId}/topics/${payload.topicId}`, { state });
    }
    _postJson(url, body) {
        return this._fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }
    _putJson(url, body) {
        return this._fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }
    hostConnected() { }
    hostDisconnected() { }
}
//# sourceMappingURL=messaging-controller.js.map