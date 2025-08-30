import type { MarketData, TreemapNode } from '../types.js';
export declare function prepareHierarchyData(data: MarketData[]): TreemapNode;
export declare function buildHierarchy(data: MarketData[]): any;
export declare function getValueForDataType(item: MarketData | TreemapNode): number;
export declare function calculateSectorAverageChange(children: TreemapNode[]): number;
export declare function addParentReferences(node: any): void;
//# sourceMappingURL=data.d.ts.map