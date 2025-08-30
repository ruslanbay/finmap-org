import type { MarketData, TreemapNode } from '../types.js';
import { getConfig } from '../config.js';

declare const d3: any;

export function prepareHierarchyData(data: MarketData[]): TreemapNode {
  const isPortfolioMode = localStorage.getItem('filterCsv') !== null;
  const securities = data.filter(item => item.type !== 'sector');
  const sectors = data.filter(item => item.type === 'sector' && item.sector !== "");
  const root = data.find(item => item.type === 'sector' && item.sector === "");

  console.log('Data length:', data.length);
  console.log('Securities count:', securities.length);
  console.log('Sectors count:', sectors.length);
  console.log('Root found:', !!root);

  const children: TreemapNode[] = sectors.map(sector => ({
    data: sector,
    children: securities
      .filter(s => s.sector === sector.sector)
      .map(security => ({ data: security }))
  }));

  console.log('Children count:', children.length);
  console.log('Children with securities:', children.filter(c => c.children && c.children.length > 0).length);

  const defaultRoot: MarketData = {
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

export function buildHierarchy(data: MarketData[]): any {
  const hierarchyData = prepareHierarchyData(data);
  const hierarchy = d3.hierarchy(hierarchyData)
    .sum((d: any) => d.children ? 0 : getValueForTreemapNode(d))
    .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
  
  addParentReferences(hierarchy);
  return hierarchy;
}

export function getValueForDataType(item: MarketData | TreemapNode): number {
  if (!item) return 0;
  
  const config = getConfig();
  const data = 'data' in item ? item.data : item;
  if (!data) return 0;
  
  const marketData = data as MarketData;
  switch (config.dataType) {
    case 'marketcap': return marketData.marketCap;
    case 'value': return marketData.value;
    case 'trades': return marketData.numTrades;
    case 'nestedItems': return marketData.nestedItemsCount;
    default: return marketData.marketCap;
  }
}

export function getValueForTreemapNode(node: TreemapNode): number {
  if (!node || !node.data) return 0;
  return getValueForDataType(node.data);
}

export function addParentReferences(node: any): void {
  if (node.children) {
    node.children.forEach((child: any) => {
      child.data.parent = node.data;
      addParentReferences(child);
    });
  }
}
