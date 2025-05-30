// Core financial data types for finmap.org

export type Exchange = 'nasdaq' | 'nyse' | 'amex' | 'lse' | 'moex' | 'bist';
export type DataType = 'marketcap' | 'value' | 'trades' | 'nestedItems';
export type ChartType = 'treemap' | 'histogram';

export interface MarketSecurity {
  readonly exchange: string;
  readonly country: string;
  readonly type: string;
  readonly sector: string;
  readonly industry: string;
  readonly currencyId: string;
  readonly ticker: string;
  readonly nameEng: string;
  readonly nameEngShort: string;
  readonly nameRus: string;
  readonly nameRusShort: string;
  readonly priceOpen: number;
  readonly priceLastSale: number;
  readonly priceChangePct: number;
  readonly volume: number;
  readonly value: number;
  readonly numTrades: number;
  readonly marketCap: number;
  readonly listedFrom: string;
  readonly listedTill: string;
  readonly wikiPageIdEng?: number;
  readonly wikiPageIdOriginal?: number;
  readonly nestedItemsCount: number;
}

// Branded types for financial precision
export type USD = number & { readonly __brand: 'USD' };
export type Percentage = number & { readonly __brand: 'Percentage' };
export type MarketCapMillions = number & { readonly __brand: 'MarketCapMillions' };

export const createUSD = (value: number): USD => value as USD;
export const createPercentage = (value: number): Percentage => {
  if (value < -100 || value > 1000) {
    throw new Error(`Invalid percentage value: ${String(value)}`);
  }
  return value as Percentage;
};
export const createMarketCap = (value: number): MarketCapMillions => {
  if (value < 0) {
    throw new Error(`Invalid market cap value: ${String(value)}`);
  }
  return value as MarketCapMillions;
};

export interface ExchangeConfig {
  readonly name: string;
  readonly currency: string;
  readonly currencySign: string;
  readonly timezone: string;
  readonly dataRepo: string;
}

export const EXCHANGE_CONFIGS: Record<Exchange, ExchangeConfig> = {
  nasdaq: {
    name: 'NASDAQ',
    currency: 'USD',
    currencySign: '$',
    timezone: 'America/New_York',
    dataRepo: 'data-us',
  },
  nyse: {
    name: 'NYSE',
    currency: 'USD',
    currencySign: '$',
    timezone: 'America/New_York',
    dataRepo: 'data-us',
  },
  amex: {
    name: 'AMEX',
    currency: 'USD',
    currencySign: '$',
    timezone: 'America/New_York',
    dataRepo: 'data-us',
  },
  lse: {
    name: 'London Stock Exchange',
    currency: 'GBP',
    currencySign: '£',
    timezone: 'Europe/London',
    dataRepo: 'data-uk',
  },
  moex: {
    name: 'Moscow Exchange',
    currency: 'RUB',
    currencySign: '₽',
    timezone: 'Europe/Moscow',
    dataRepo: 'data-russia',
  },
  bist: {
    name: 'Borsa Istanbul',
    currency: 'TRY',
    currencySign: '₺',
    timezone: 'Europe/Istanbul',
    dataRepo: 'data-turkey',
  },
};
