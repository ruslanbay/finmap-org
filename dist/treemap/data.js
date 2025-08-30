import { getConfig } from '../config.js';
export function prepareHierarchyData(data) {
    const securities = data.filter(item => item.type === 'stock' || item.type === 'etf');
    const sectors = d3.group(securities, (d) => d.sector || 'Other');
    const sectorData = data.filter(item => item.type === 'sector');
    const isPortfolioMode = localStorage.getItem('filterCsv') !== null;
    const children = [];
    sectors.forEach((sectorSecurities, sectorName) => {
        const sectorChildren = sectorSecurities.map((security) => ({
            ticker: security.ticker,
            name: security.nameEng,
            value: getValueForDataType(security),
            change: security.priceChangePct || 0,
            data: security,
        }));
        // Use precalculated sector data if available, otherwise calculate
        const precalculatedSector = sectorData.find(s => s.sector === sectorName || s.nameEng === sectorName);
        const sectorTotalValue = precalculatedSector ? getValueForDataType(precalculatedSector) :
            sectorChildren.reduce((sum, child) => sum + child.value, 0);
        const sectorChange = precalculatedSector ? (precalculatedSector.priceChangePct || 0) :
            calculateSectorAverageChange(sectorChildren);
        children.push({
            ticker: sectorName,
            name: sectorName,
            value: sectorTotalValue,
            change: sectorChange,
            children: sectorChildren,
        });
    });
    return {
        ticker: 'root',
        name: isPortfolioMode ? 'Portfolio' : 'Market',
        value: 0,
        change: 0,
        children,
    };
}
export function buildHierarchy(data) {
    const hierarchyData = prepareHierarchyData(data);
    const hierarchy = d3.hierarchy(hierarchyData)
        .sum((d) => d.children ? 0 : getValueForDataType(d))
        .sort((a, b) => (b.value || 0) - (a.value || 0));
    addParentReferences(hierarchy);
    return hierarchy;
}
export function getValueForDataType(item) {
    const config = getConfig();
    if ('marketCap' in item) {
        switch (config.dataType) {
            case 'marketcap': return item.marketCap;
            case 'value': return item.value;
            case 'trades': return item.numTrades;
            case 'nestedItems': return item.nestedItemsCount;
            default: return item.marketCap;
        }
    }
    return item.value;
}
export function calculateSectorAverageChange(children) {
    const validChanges = children
        .map(child => child.change)
        .filter(change => !isNaN(change));
    return validChanges.length > 0 ? d3.mean(validChanges) || 0 : 0;
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