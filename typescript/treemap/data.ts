import type {
  MarketData,
  MarketDataResponse,
  TreemapNode,
  HierarchyNode,
} from "./types.js";
import { parseMarketData, getNodeData } from "./types.js";
import { getConfig, EXCHANGE_INFO } from "../config.js";
import { convertCurrencyValues } from "../currency/data.js";

declare const d3: any;

export function buildHierarchy(data: MarketData[]): HierarchyNode {
  const securitiesMap = new Map<string, MarketData[]>();
  const sectors = new Map<string, MarketData>();
  let rootSector: MarketData | null = null;

  for (const item of data) {
    if (item.type === "sector") {
      if (item.sector === "") {
        rootSector = item;
      } else {
        sectors.set(item.ticker, item);
      }
    } else {
      const existing = securitiesMap.get(item.sector) || [];
      existing.push(item);
      securitiesMap.set(item.sector, existing);
    }
  }

  if (!rootSector) {
    throw new Error("Root sector not found in data");
  }

  const children: TreemapNode[] = Array.from(sectors.entries()).map(
    ([sectorTicker, sectorData]) => ({
      data: sectorData,
      children: (securitiesMap.get(sectorTicker) || []).map((security) => ({
        data: security,
      })),
    }),
  );

  const hierarchyData = { data: rootSector, children };

  return d3
    .hierarchy(hierarchyData)
    .sum((d: any) => (d.children ? 0 : getValueForDataType(d.data)))
    .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
}

export function getValueForDataType(item: MarketData): number {
  if (!item) return 0;

  const config = getConfig();
  switch (config.dataType) {
    case "marketcap":
      return item.marketCap || 0;
    case "value":
      return item.value || 0;
    case "trades":
      return item.numTrades || 0;
    case "nestedItems":
      return item.nestedItemsCount || 0;
    default:
      return item.marketCap || 0;
  }
}

export async function fetchMarketData(): Promise<MarketData[]> {
  const config = getConfig();
  const exchangeInfo = EXCHANGE_INFO[config.exchange];

  if (!exchangeInfo) {
    throw new Error(`Unknown exchange: ${config.exchange}`);
  }

  const url = `https://raw.githubusercontent.com/finmap-org/${exchangeInfo.dataRepo}/refs/heads/main/marketdata/${config.date}/${config.exchange}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data: MarketDataResponse = await response.json();
    let marketData = parseMarketData(data);

    if (config.currency !== exchangeInfo.nativeCurrency) {
      marketData = await convertCurrencyValues(
        marketData,
        exchangeInfo.nativeCurrency,
        config.currency,
        config.date,
      );
    }

    return marketData;
  } catch (error) {
    throw new Error(`Failed to fetch market data: ${error}`);
  }
}
