import { ChannelEventTopics } from './events.js';
export class ChannelStateController {
    constructor(host, push) {
        this.channels = [];
        this.topics = [];
        this.messages = [];
        this.selectedChannelId = '';
        this.selectedTopicId = null;
        this.viewMode = 'flat';
        this._currentUserId = '';
        this._pendingSpaces = [];
        this._host = host;
        host.addController(this);
        push.registerDatasetHandler('channels', (op) => { this._applyChannels(op); this._host.requestUpdate(); });
        push.registerDatasetHandler('topics', (op) => { this._applyTopics(op); this._host.requestUpdate(); });
        push.registerDatasetHandler('messages', (op) => { this._applyMessages(op); this._host.requestUpdate(); });
    }
    addPendingSpace(space) {
        this._pendingSpaces = [...this._pendingSpaces, space];
        this._host.requestUpdate();
    }
    removePendingSpace(spaceId) {
        this._pendingSpaces = this._pendingSpaces.filter(s => s.id !== spaceId);
        this._host.requestUpdate();
    }
    applyRenameSpace(spaceId, newName) {
        this.channels = this.channels.map(ch => ch.spaceId === spaceId ? { ...ch, spaceName: newName } : ch);
        this._pendingSpaces = this._pendingSpaces.map(s => s.id === spaceId ? { ...s, name: newName } : s);
        this._host.requestUpdate();
    }
    applyMoveChannel(channelId, spaceId, spaceName, position) {
        const channel = this.channels.find(ch => ch.id === channelId);
        if (!channel)
            return;
        let moved;
        if (spaceId) {
            moved = { ...channel, spaceId, spaceName: spaceName ?? undefined };
        }
        else {
            const { spaceId: _, spaceName: _s, parentSpaceId: _p, ...rest } = channel;
            moved = rest;
        }
        const siblings = this.channels
            .filter(ch => ch.id !== channelId && (spaceId ? ch.spaceId === spaceId : !ch.spaceId))
            .sort((a, b) => {
            const oa = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
            const ob = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
            return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
        });
        const pos = Math.min(position ?? siblings.length, siblings.length);
        siblings.splice(pos, 0, moved);
        const reordered = new Map(siblings.map((ch, i) => [ch.id, i]));
        this.channels = this.channels.map(ch => {
            const newOrder = reordered.get(ch.id);
            if (newOrder !== undefined) {
                return ch.id === channelId
                    ? { ...moved, displayOrder: newOrder }
                    : { ...ch, displayOrder: newOrder };
            }
            return ch;
        });
        this._host.requestUpdate();
    }
    applyDeleteSpace(spaceId) {
        this.channels = this.channels.map(ch => {
            if (ch.spaceId !== spaceId)
                return ch;
            const { spaceId: _, spaceName: _s, parentSpaceId: _p, ...rest } = ch;
            return rest;
        });
        this.removePendingSpace(spaceId);
    }
    get channelTree() {
        const spaceMap = new Map();
        const ungrouped = [];
        for (const ch of this.channels) {
            if (ch.spaceId && ch.spaceName) {
                let node = spaceMap.get(ch.spaceId);
                if (!node) {
                    const space = { id: ch.spaceId, name: ch.spaceName };
                    if (ch.parentSpaceId)
                        space.parentSpaceId = ch.parentSpaceId;
                    node = { space, channels: [], children: [] };
                    spaceMap.set(ch.spaceId, node);
                }
                node.channels.push(ch);
            }
            else {
                ungrouped.push(ch);
            }
        }
        const roots = [];
        for (const node of spaceMap.values()) {
            const parentId = node.space.parentSpaceId;
            const channelUnread = node.channels.reduce((sum, ch) => sum + (ch.unreadCount ?? 0), 0);
            if (parentId) {
                const parent = spaceMap.get(parentId);
                if (parent) {
                    parent.children.push({ ...node, unreadCount: channelUnread });
                    continue;
                }
            }
            roots.push({ ...node, unreadCount: channelUnread });
        }
        for (const root of roots) {
            const childrenUnread = root.children.reduce((sum, child) => sum + child.unreadCount, 0);
            root.unreadCount += childrenUnread;
        }
        for (const ps of this._pendingSpaces) {
            if (!spaceMap.has(ps.id)) {
                roots.push({ space: ps, channels: [], unreadCount: 0, children: [] });
            }
        }
        const sortByOrder = (a, b) => {
            const oa = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
            const ob = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
            if (oa !== ob)
                return oa - ob;
            return a.name.localeCompare(b.name);
        };
        for (const node of spaceMap.values()) {
            node.channels.sort(sortByOrder);
        }
        ungrouped.sort(sortByOrder);
        return { spaces: roots, ungrouped };
    }
    filteredMessages() {
        if (!this.selectedChannelId)
            return [];
        let msgs = this.messages.filter(m => m.channelId === this.selectedChannelId);
        if (this.selectedTopicId) {
            msgs = msgs.filter(m => m.topicId === this.selectedTopicId);
        }
        return msgs;
    }
    channelTopics() {
        if (!this.selectedChannelId)
            return [];
        return this.topics.filter(t => t.channelId === this.selectedChannelId && t.state !== 'MERGED');
    }
    handleEvent(topic, payload) {
        switch (topic) {
            case ChannelEventTopics.SELECT_CHANNEL: {
                const { channelId } = payload;
                this.selectedChannelId = channelId;
                this.selectedTopicId = null;
                this.channels = this.channels.map(ch => ch.id === channelId && (ch.unreadCount ?? 0) > 0 ? { ...ch, unreadCount: 0 } : ch);
                this._host.requestUpdate();
                break;
            }
            case ChannelEventTopics.VIEW_MODE: {
                this.viewMode = payload.mode;
                this._host.requestUpdate();
                break;
            }
            case ChannelEventTopics.SELECT_TOPIC: {
                this.selectedTopicId = payload.topicId;
                this._host.requestUpdate();
                break;
            }
        }
    }
    _applyChannels(op) {
        if (op.op === 'snapshot') {
            this.channels = (op.rows ?? []).map(r => this._toChannel(r));
            const channelSpaceIds = new Set(this.channels.filter(ch => ch.spaceId).map(ch => ch.spaceId));
            this._pendingSpaces = this._pendingSpaces.filter(s => !channelSpaceIds.has(s.id));
        }
        else if (op.op === 'append' && op.rows) {
            this.channels = [...this.channels, ...op.rows.map(r => this._toChannel(r))];
        }
        else if (op.op === 'replace' && op.row && op.key) {
            const existing = this.channels.find(c => c.id === op.key);
            const updated = this._toChannel(op.row);
            this.channels = this.channels.map(c => c.id === op.key
                ? { ...updated, unreadCount: existing?.unreadCount ?? updated.unreadCount ?? 0 }
                : c);
        }
        else if (op.op === 'remove' && op.key) {
            this.channels = this.channels.filter(c => c.id !== op.key);
        }
    }
    _toChannel(row) {
        const ch = { id: row[0], name: row[1], semantic: 'APPEND', paused: false, unreadCount: 0 };
        const desc = row[3];
        const spaceId = row[5];
        const spaceName = row[6];
        const parentSpaceId = row[7];
        const displayOrder = row[8];
        const unreadCount = row[9];
        if (desc)
            ch.description = desc;
        if (spaceId)
            ch.spaceId = spaceId;
        if (spaceName)
            ch.spaceName = spaceName;
        if (parentSpaceId)
            ch.parentSpaceId = parentSpaceId;
        if (displayOrder)
            ch.displayOrder = parseInt(displayOrder, 10);
        if (unreadCount)
            ch.unreadCount = parseInt(unreadCount, 10) || 0;
        return ch;
    }
    _applyTopics(op) {
        if (op.op === 'snapshot') {
            this.topics = (op.rows ?? []).map(r => this._toTopic(r));
        }
        else if (op.op === 'append' && op.rows) {
            this.topics = [...this.topics, ...op.rows.map(r => this._toTopic(r))];
        }
        else if (op.op === 'replace' && op.row && op.key) {
            this.topics = this.topics.map(t => t.id === op.key ? this._toTopic(op.row) : t);
        }
        else if (op.op === 'remove' && op.key) {
            this.topics = this.topics.filter(t => t.id !== op.key);
        }
    }
    _toTopic(row) {
        const t = {
            id: row[0], channelId: row[1], name: row[2],
            state: row[3], messageCount: Number(row[4]) || 0, createdAt: row[6],
        };
        const latest = row[5];
        if (latest)
            t.latestActivityTs = latest;
        return t;
    }
    _resolveTopicName(topicId) {
        if (!topicId)
            return '';
        const topic = this.topics.find(t => t.id === topicId);
        return topic?.name ?? '';
    }
    _applyMessages(op) {
        if (op.op === 'snapshot') {
            this.messages = (op.rows ?? []).map(r => this._toMessage(r));
        }
        else if (op.op === 'append' && op.rows) {
            const newMsgs = op.rows.map(r => this._toMessage(r));
            this.messages = [...this.messages, ...newMsgs];
            this._trackUnread(newMsgs);
        }
        else if (op.op === 'remove' && op.key) {
            this.messages = this.messages.filter(m => m.id !== op.key);
        }
        this._recomputeReplyCounts();
    }
    _trackUnread(newMessages) {
        const increments = new Map();
        for (const msg of newMessages) {
            if (msg.channelId === this.selectedChannelId)
                continue;
            if (msg.messageType === 'EVENT')
                continue;
            if (msg.sender === this._currentUserId)
                continue;
            increments.set(msg.channelId, (increments.get(msg.channelId) ?? 0) + 1);
        }
        if (increments.size > 0) {
            this.channels = this.channels.map(ch => {
                const inc = increments.get(ch.id);
                return inc ? { ...ch, unreadCount: (ch.unreadCount ?? 0) + inc } : ch;
            });
        }
    }
    _recomputeReplyCounts() {
        const counts = new Map();
        for (const m of this.messages) {
            if (m.inReplyTo) {
                counts.set(m.inReplyTo, (counts.get(m.inReplyTo) ?? 0) + 1);
            }
        }
        this.messages = this.messages.map(m => ({
            ...m,
            replyCount: counts.get(m.id) ?? 0,
        }));
    }
    _toMessage(row) {
        let artefactRefs = [];
        try {
            const refsStr = row[10];
            if (refsStr && refsStr !== '[]')
                artefactRefs = JSON.parse(refsStr);
        }
        catch { /* ignore parse errors */ }
        const msg = {
            id: row[1], channelId: row[0], sender: row[3],
            messageType: row[6] || 'EVENT',
            actorType: row[7] || 'HUMAN',
            content: row[4], topicId: row[8] || '',
            topic: this._resolveTopicName(row[8]),
            replyCount: 0, artefactRefs, createdAt: row[5],
        };
        const corr = row[9];
        const parent = row[2];
        const target = row[11];
        if (corr)
            msg.correlationId = corr;
        if (parent)
            msg.inReplyTo = parent;
        if (target)
            msg.target = target;
        return msg;
    }
    setCurrentUser(userId) {
        this._currentUserId = userId;
    }
    latestMessageId(channelId) {
        const channelMsgs = this.messages.filter(m => m.channelId === channelId);
        return channelMsgs.length > 0 ? channelMsgs[channelMsgs.length - 1].id : undefined;
    }
    hostConnected() { }
    hostDisconnected() { }
}
//# sourceMappingURL=channel-state-controller.js.map