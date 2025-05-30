// Market data service for fetching and processing financial data

import type { MarketSecurity, Exchange, ChartData, DataType, TreemapNode } from '../../types/index.ts';
import { validateMarketData, isValidDate, getLatestBusinessDay } from '../utils/index.ts';
import { APP_CONFIG } from '../utils/constants.ts';
import { EXCHANGE_CONFIGS } from '../../types/market.ts';
import { MockDataService } from './MockDataService.ts';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MarketDataService {
  const cache = new Map<string, MarketSecurity[]>();

  /**
   * Fetch market data for a specific exchange and date
   */
  export async function fetchMarketData(
    exchange: Exchange,
    date?: string
  ): Promise<MarketSecurity[]> {
    const targetDate = date || getLatestBusinessDay(exchange);
    
    if (!isValidDate(targetDate)) {
      throw new Error(`Invalid date format: ${targetDate}`);
    }

    const cacheKey = `${exchange}-${targetDate}`;
    
    // Check cache first
    if (cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    return fetchAndCacheData(exchange, targetDate, cacheKey);
  }

  async function fetchAndCacheData(
    exchange: Exchange, 
    targetDate: string, 
    cacheKey: string
  ): Promise<MarketSecurity[]> {
    try {
      const data = await fetchRealData(exchange, targetDate);
      cache.set(cacheKey, data);
      cleanCache();
      return data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to fetch real market data for ${exchange} on ${targetDate}:`, error);
      // eslint-disable-next-line no-console
      console.log('Falling back to mock data for development...');
      
      return fetchMockDataFallback(exchange, cacheKey);
    }
  }

  async function fetchRealData(exchange: Exchange, targetDate: string): Promise<MarketSecurity[]> {
    const exchangeConfig = EXCHANGE_CONFIGS[exchange];
    const url = buildDataUrl(exchangeConfig.dataRepo, targetDate);
    
    const response = await fetchWithRetry(url);
    const rawData = await response.json() as unknown;
    
    return validateMarketData(rawData as MarketSecurity[]);
  }

  async function fetchMockDataFallback(exchange: Exchange, cacheKey: string): Promise<MarketSecurity[]> {
    try {
      const mockData = await MockDataService.getMockData(exchange);
      const validatedData = validateMarketData(mockData);
      
      // Cache the mock data (but don't clean cache to avoid overriding real data)
      cache.set(cacheKey, validatedData);
      
      return validatedData;
    } catch (mockError) {
      // eslint-disable-next-line no-console
      console.error(`Mock data fallback failed:`, mockError);
      throw new Error(`Unable to load market data for ${exchange} (both real and mock data failed)`);
    }
  }

  /**
   * Process market data into chart-ready format
   */
  export function processChartData(
    securities: MarketSecurity[],
    dataType: DataType,
    exchange: Exchange,
    date: string
  ): ChartData {
    const processedSecurities = securities.map(security => ({
      ...security,
      // Ensure consistent data format
      priceChangePct: Number(security.priceChangePct),
      marketCap: Number(security.marketCap),
      volume: Number(security.volume),
      value: Number(security.value),
      numTrades: Number(security.numTrades),
    }));

    const hierarchicalData = buildHierarchicalData(processedSecurities, dataType);
    const totalValue = calculateTotalValue(processedSecurities, dataType);
    const exchangeConfig = EXCHANGE_CONFIGS[exchange];

    return {
      securities: processedSecurities,
      hierarchicalData,
      exchange,
      date,
      dataType,
      totalValue,
      currency: exchangeConfig.currency,
    };
  }

  /**
   * Search securities by ticker or name
   */
  export function searchSecurities(
    securities: MarketSecurity[],
    query: string
  ): MarketSecurity[] {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase().trim();
    
    return securities.filter(security => 
      security.ticker.toLowerCase().includes(searchTerm) ||
      security.nameEng.toLowerCase().includes(searchTerm) ||
      security.nameEngShort.toLowerCase().includes(searchTerm)
    ).slice(0, 50); // Limit results for performance
  }

  function buildDataUrl(repo: string, date: string): string {
    return `${APP_CONFIG.github.baseUrl}/${repo}/main/${date}.json`;
  }

  async function fetchWithRetry(
    url: string,
    retries = APP_CONFIG.api.retryAttempts
  ): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => { controller.abort(); }, APP_CONFIG.api.timeout);
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
        }
        
        return response;
      } catch (error) {
        if (i === retries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => 
          setTimeout(resolve, APP_CONFIG.api.retryDelay * (i + 1))
        );
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  function buildHierarchicalData(
    securities: MarketSecurity[],
    dataType: DataType
  ): TreemapNode[] {
    // Group securities by sector
    const sectorGroups = new Map<string, MarketSecurity[]>();
    
    securities.forEach(security => {
      const sector = security.sector || 'Other';
      if (!sectorGroups.has(sector)) {
        sectorGroups.set(sector, []);
      }
      sectorGroups.get(sector)?.push(security);
    });

    // Convert to hierarchical format
    return Array.from(sectorGroups.entries()).map(([sector, sectorSecurities]) => ({
      id: sector,
      name: sector,
      value: getSectorValue(sectorSecurities, dataType),
      color: '#666', // Default sector color
      children: sectorSecurities.map(security => ({
        id: security.ticker,
        name: security.nameEng,
        value: getSecurityValue(security, dataType),
        security,
        color: getColorFromPriceChange(security.priceChangePct),
      })),
    }));
  }

  function getSectorValue(securities: MarketSecurity[], dataType: DataType): number {
    return securities.reduce((sum, security) => 
      sum + getSecurityValue(security, dataType), 0
    );
  }

  function getSecurityValue(security: MarketSecurity, dataType: DataType): number {
    switch (dataType) {
      case 'marketcap':
        return security.marketCap;
      case 'value':
        return security.value;
      case 'trades':
        return security.numTrades;
      case 'nestedItems':
        return security.nestedItemsCount;
      default:
        return security.marketCap;
    }
  }

  function getColorFromPriceChange(priceChangePct: number): string {
    // Normalize to -3 to +3 scale like the original
    const normalizedChange = Math.max(-3, Math.min(3, priceChangePct));
    
    if (normalizedChange < -1) return '#ec3033'; // Red for losses
    if (normalizedChange > 1) return '#2aca55';  // Green for gains
    return '#40445a'; // Gray for neutral
  }

  function calculateTotalValue(securities: MarketSecurity[], dataType: DataType): number {
    return securities.reduce((sum, security) => 
      sum + getSecurityValue(security, dataType), 0
    );
  }

  function cleanCache(): void {
    // Simple cache cleanup - in a real app you'd want TTL-based cleanup
    if (cache.size > 50) {
      const entries = Array.from(cache.entries());
      entries.slice(0, 25).forEach(([key]) => cache.delete(key));
    }
  }

  /**
   * Clear all cached data
   */
  export function clearCache(): void {
    cache.clear();
  }
}
