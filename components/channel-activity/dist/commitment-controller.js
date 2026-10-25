import { ChannelEventTopics } from './events.js';
export class CommitmentController {
    constructor(host, push, channels) {
        this.commitments = new Map();
        this._host = host;
        this._channels = channels;
        host.addController(this);
        push.registerDatasetHandler('commitments', (op) => { this._applyCommitments(op); this._host.requestUpdate(); });
    }
    handleEvent(topic, payload) {
        if (topic === ChannelEventTopics.MESSAGE_SELECTED) {
            this.selectedMessageId = payload.message.id;
            this._host.requestUpdate();
        }
    }
    _applyCommitments(op) {
        if (op.op === 'snapshot') {
            this.commitments = new Map();
            for (const r of op.rows ?? []) {
                this.commitments.set(r[0], this._parseRow(r));
            }
        }
        else if (op.op === 'replace' && op.row) {
            this.commitments = new Map(this.commitments);
            this.commitments.set(op.row[0], this._parseRow(op.row));
        }
        else if (op.op === 'append' && op.rows) {
            this.commitments = new Map(this.commitments);
            for (const r of op.rows) {
                this.commitments.set(r[0], this._parseRow(r));
            }
        }
    }
    _parseRow(r) {
        const resolvedAt = r[5] || undefined;
        const acknowledgedAt = r[4] || undefined;
        const createdAt = r[6];
        const timestamps = [resolvedAt, acknowledgedAt, createdAt].filter((t) => t != null);
        const updatedAt = timestamps.reduce((a, b) => a > b ? a : b, createdAt);
        const record = {
            state: r[2],
            createdAt,
            updatedAt,
        };
        if (r[3])
            record.deadline = r[3];
        if (acknowledgedAt)
            record.acknowledgedAt = acknowledgedAt;
        if (resolvedAt)
            record.resolvedAt = resolvedAt;
        return record;
    }
    hostConnected() { }
    hostDisconnected() { }
}
//# sourceMappingURL=commitment-controller.js.map