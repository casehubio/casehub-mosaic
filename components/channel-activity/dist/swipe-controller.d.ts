import type { ReactiveController, ReactiveControllerHost } from 'lit';
export interface SwipeOptions {
    drawerQuery: (side: 'left' | 'right') => HTMLElement | null;
    backdropQuery: () => HTMLElement | null;
    onOpen: (side: 'left' | 'right') => void;
    onClose?: (side: 'left' | 'right') => void;
    isOpenQuery?: (side: 'left' | 'right') => boolean;
    edgeWidth?: number;
    drawerWidth?: number;
    distanceThreshold?: number;
    velocityThreshold?: number;
}
export declare class SwipeController implements ReactiveController {
    private _host;
    private _options;
    private _tracking;
    private _side;
    private _gesture;
    private _startX;
    private _startY;
    private _intentConfirmed;
    private _pointerId;
    private _samples;
    private _attached;
    private _reducedMotion;
    private _longPressTimer;
    private _longPressStartPos;
    constructor(host: ReactiveControllerHost, options: SwipeOptions);
    hostConnected(): void;
    hostDisconnected(): void;
    private _attachListeners;
    private _detachListeners;
    private _cleanupMidDrag;
    private _onPointerDown;
    private _onPointerMove;
    private _onPointerUp;
    private _cancelDrag;
    private _computeVelocity;
    private _cancelLongPress;
    private _onTouchStart;
    private _onTouchMove;
    private _onTouchEnd;
}
//# sourceMappingURL=swipe-controller.d.ts.map