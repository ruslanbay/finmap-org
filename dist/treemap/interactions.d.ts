import type { MarketData } from '../types.js';
interface InteractionCallbacks {
    onDrill: (node: any) => void;
    onShowCompany: (data: MarketData) => void;
    onShowTooltip: (data: MarketData, event: MouseEvent, node?: any) => void;
    onHideTooltip: () => void;
    onNodeAtPosition: (event: MouseEvent) => any;
    isTransitioning: () => boolean;
}
export declare class InteractionHandler {
    private canvas;
    private callbacks;
    init(canvas: HTMLCanvasElement, callbacks: InteractionCallbacks): void;
    private setupEventListeners;
}
export {};
//# sourceMappingURL=interactions.d.ts.map