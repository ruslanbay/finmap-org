import { getConfig } from '../config.js';
export function prepareHierarchyData(data) {
    const isPortfolioMode = localStorage.getItem('filterCsv') !== null;
    const securities = data.filter(item => item.type !== 'sector');
    const sectors = data.filter(item => item.type === 'sector' && item.sector !== "");
    const root = data.find(item => item.type === 'sector' && item.sector === "");
    const children = sectors.map(sector => ({
        data: sector,
        children: securities
            .filter(s => s.sector === sector.sector)
            .map(security => ({ data: security }))
    }));
    const defaultRoot = {
        exchange: '',
        country: '',
        type: 'sector',
        sector: '',
        industry: '',
        currencyId: '',
        ticker: 'root',
        nameEng: 'Market',
        nameEngShort: '',
        nameOriginal: '',
        nameOriginalShort: '',
        priceOpen: 0,
        priceLastSale: 0,
        priceChangePct: 0,
        volume: 0,
        value: 0,
        numTrades: 0,
        marketCap: 0,
        listedFrom: '',
        listedTill: '',
        wikiPageIdEng: '',
        wikiPageIdOriginal: '',
        nestedItemsCount: 0
    };
    return {
        data: root || defaultRoot,
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
export function addParentReferences(node) {
    if (node.children) {
        node.children.forEach((child) => {
            child.data.parent = node.data;
            addParentReferences(child);
        });
    }
}
//# sourceMappingURL=data.js.map