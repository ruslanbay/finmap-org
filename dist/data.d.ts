import type { MarketDataResponse, MarketData, HistoricalDataResponse, HistoricalSector, DataParser } from './types.js';
export declare const dataParser: DataParser;
export declare function parseMarketData(response: MarketDataResponse): MarketData[];
export declare function parseHistoricalData(response: HistoricalDataResponse): HistoricalSector[];
export declare function fetchMarketData(): Promise<MarketData[]>;
export declare function fetchHistoricalData(): Promise<HistoricalSector[]>;
export declare function fetchCompanyInfo(ticker: string): Promise<any>;
//# sourceMappingURL=data.d.ts.map