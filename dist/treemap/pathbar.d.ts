import type { MarketData } from '../types.js';
export declare class PathbarComponent {
    private element;
    create(container: HTMLElement): HTMLElement;
    update(path: any[], callbacks: {
        onDrill: (node: any) => void;
        onShowTooltip: (data: MarketData, event: MouseEvent) => void;
        onHideTooltip: () => void;
    }): void;
    private getSectorDataForNode;
}
//# sourceMappingURL=pathbar.d.ts.map