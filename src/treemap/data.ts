import type { MarketData, TreemapNode } from '../types.js';
import { getConfig } from '../config.js';

declare const d3: any;

export function prepareHierarchyData(data: MarketData[]): TreemapNode {
  const securities = data.filter(item => item.type === 'stock' || item.type === 'etf');
  const sectors = d3.group(securities, (d: MarketData) => d.sector || 'Other');
  const isPortfolioMode = localStorage.getItem('filterCsv') !== null;
  
  // ToDo: No need for re-calulculation for each sector - values already in datafiles
  const children: TreemapNode[] = [];
  sectors.forEach((sectorSecurities: MarketData[], sectorName: string) => {
    const sectorChildren = sectorSecurities.map((security: MarketData) => ({
      ticker: security.ticker,
      name: security.nameEng,
      value: getValueForDataType(security),
      change: security.priceChangePct || 0,
      data: security,
    }));
    
    const sectorTotalValue = sectorChildren.reduce((sum, child) => sum + child.value, 0);
    
    children.push({
      ticker: sectorName,
      name: sectorName,
      value: sectorTotalValue,
      change: calculateSectorAverageChange(sectorChildren),
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

export function buildHierarchy(data: MarketData[]): any {
  const hierarchyData = prepareHierarchyData(data);
  const hierarchy = d3.hierarchy(hierarchyData)
    .sum((d: any) => d.children ? 0 : getValueForDataType(d))
    .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
  
  addParentReferences(hierarchy);
  return hierarchy;
}

export function getValueForDataType(item: MarketData | TreemapNode): number {
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

export function calculateSectorAverageChange(children: TreemapNode[]): number {
  const validChanges = children
    .map(child => child.change)
    .filter(change => !isNaN(change));
  
  return validChanges.length > 0 ? d3.mean(validChanges) || 0 : 0;
}

export function addParentReferences(node: any): void {
  if (node.children) {
    node.children.forEach((child: any) => {
      child.data.parent = node.data;
      addParentReferences(child);
    });
  }
}
