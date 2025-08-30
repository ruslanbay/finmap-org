import type { MarketData, ChartRenderer } from '../types.js';
export declare class TreemapChart implements ChartRenderer {
    private container;
    private canvas;
    private context;
    private currentData;
    private hierarchy;
    private currentRoot;
    private rootNode;
    private nodes;
    private resizeObserver;
    private isTransitioning;
    private pathbar;
    private tooltip;
    private overlay;
    private renderer;
    private interactions;
    constructor();
    render(data: MarketData[], container: HTMLElement): void;
    private setupContainer;
    private setupCanvas;
    private updateCanvasSize;
    private buildHierarchyData;
    private setupComponents;
    private setupResizeObserver;
    private renderTreemap;
    private adjustNodesForSectorHeaders;
    private getValueForDataType;
    private drillTo;
    private getPathToRoot;
    private getNodeAtPosition;
    searchAndHighlight(query: string): void;
    destroy(): void;
}
export { TreemapChart as D3TreemapRenderer };
//# sourceMappingURL=index.d.ts.map