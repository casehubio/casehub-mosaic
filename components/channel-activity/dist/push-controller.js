export const ALL_TOPICS = [
    'chat:channels', 'chat:topics', 'chat:messages',
    'chat:members', 'chat:presence', 'chat:reactions', 'chat:commitments',
];
export class PushController {
    constructor(host) {
        this.connectionStatus = 'disconnected';
        this._handlers = new Map();
        this._host = host;
        host.addController(this);
    }
    setConnectionStatus(status) {
        this.connectionStatus = status;
        this._host.requestUpdate();
    }
    registerDatasetHandler(dataset, handler) {
        const list = this._handlers.get(dataset) ?? [];
        list.push(handler);
        this._handlers.set(dataset, list);
    }
    applyOp(op) {
        const handlers = this._handlers.get(op.dataset);
        if (handlers)
            for (const h of handlers)
                h(op);
    }
    hostConnected() { }
    hostDisconnected() { }
}
//# sourceMappingURL=push-controller.js.map