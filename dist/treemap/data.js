import { getConfig } from '../config.js';
export function prepareHierarchyData(data) {
    const securities = data.filter(item => item.type !== 'sector');
    const sectors = data.filter(item => item.type === 'sector' && item.sector !== "");
    const root = data.find(item => item.type === 'sector' && item.sector === "");
    const children = sectors.map(sector => ({
        data: sector,
        children: securities
            .filter(s => s.sector === sector.ticker)
            .map(security => ({ data: security }))
    }));
    return {
        data: root,
        children,
    };
}
export function buildHierarchy(data) {
    const hierarchyData = prepareHierarchyData(data);
    const hierarchy = d3.hierarchy(hierarchyData)
        .sum((d) => d.children ? 0 : getValueForTreemapNode(d))
        .sort((a, b) => (b.value || 0) - (a.value || 0));
    addParentReferences(hierarchy);
    return hierarchy;
}
export function getValueForDataType(item) {
    if (!item)
        return 0;
    const config = getConfig();
    const data = 'data' in item ? item.data : item;
    if (!data)
        return 0;
    const marketData = data;
    switch (config.dataType) {
        case 'marketcap': return marketData.marketCap;
        case 'value': return marketData.value;
        case 'trades': return marketData.numTrades;
        case 'nestedItems': return marketData.nestedItemsCount;
        default: return marketData.marketCap;
    }
}
export function getValueForTreemapNode(node) {
    if (!node || !node.data)
        return 0;
    return getValueForDataType(node.data);
}
export function addParentReferences(node) {
    if (node.children) {
        node.children.forEach((child) => {
            child.data.parent = node.data;
            addParentReferences(child);
        });
    }
}
//# sourceMappingURL=data.js.map