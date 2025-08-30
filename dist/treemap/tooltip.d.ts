import type { MarketData } from '../types.js';
export declare class TooltipComponent {
    private element;
    init(): void;
    show(data: MarketData, event: MouseEvent, node?: any): void;
    showPathbar(data: MarketData, event: MouseEvent): void;
    private position;
    hide(): void;
    destroy(): void;
}
//# sourceMappingURL=tooltip.d.ts.map