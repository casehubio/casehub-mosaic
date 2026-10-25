import type { ReactiveController, ReactiveControllerHost } from 'lit';
export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
export interface DatasetOp {
    op: 'snapshot' | 'append' | 'replace' | 'remove';
    dataset: string;
    rows?: unknown[][];
    row?: unknown[];
    key?: string;
}
export type DatasetHandler = (op: DatasetOp) => void;
export declare const ALL_TOPICS: string[];
export declare class PushController implements ReactiveController {
    connectionStatus: ConnectionStatus;
    private _handlers;
    private _host;
    constructor(host: ReactiveControllerHost);
    setConnectionStatus(status: ConnectionStatus): void;
    registerDatasetHandler(dataset: string, handler: DatasetHandler): void;
    applyOp(op: DatasetOp): void;
    hostConnected(): void;
    hostDisconnected(): void;
}
//# sourceMappingURL=push-controller.d.ts.map