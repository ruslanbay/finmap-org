// Validation utilities for financial data

import type { DataType, Exchange, MarketSecurity } from '../../types/index.ts';

export const isValidExchange = (exchange: string): exchange is Exchange => {
  return ['nasdaq', 'nyse', 'amex', 'lse', 'moex', 'bist'].includes(exchange);
};

export const isValidDataType = (dataType: string): dataType is DataType => {
  return ['marketcap', 'value', 'trades', 'nestedItems'].includes(dataType);
};

export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

export const isValidTicker = (ticker: string): boolean => {
  // Basic ticker validation: 1-10 characters, alphanumeric with dots and hyphens
  const tickerRegex = /^[A-Z0-9.-]{1,10}$/i;
  return tickerRegex.test(ticker);
};

export const validateMarketSecurity = (security: unknown): security is MarketSecurity => {
  if (typeof security !== 'object' || security === null) return false;

  const s = security as Record<string, unknown>;

  return (
    validateSecurityBasicFields(s) &&
    validateSecurityNumericFields(s) &&
    validateSecurityBusinessRules(s)
  );
};

const validateSecurityBasicFields = (s: Record<string, unknown>): boolean => {
  return (
    typeof s.ticker === 'string' &&
    typeof s.nameEng === 'string' &&
    typeof s.sector === 'string' &&
    typeof s.industry === 'string' &&
    typeof s.exchange === 'string'
  );
};

const validateSecurityNumericFields = (s: Record<string, unknown>): boolean => {
  return (
    typeof s.priceLastSale === 'number' &&
    typeof s.priceChangePct === 'number' &&
    typeof s.marketCap === 'number' &&
    typeof s.volume === 'number' &&
    typeof s.value === 'number' &&
    typeof s.numTrades === 'number'
  );
};

const validateSecurityBusinessRules = (s: Record<string, unknown>): boolean => {
  return (
    isValidTicker(s.ticker as string) &&
    (s.marketCap as number) >= 0 &&
    (s.volume as number) >= 0 &&
    (s.value as number) >= 0 &&
    (s.numTrades as number) >= 0
  );
};

export const validateMarketData = (data: unknown[]): MarketSecurity[] => {
  if (!Array.isArray(data)) {
    throw new Error('Market data must be an array');
  }

  const validSecurities = data.filter(validateMarketSecurity);

  if (validSecurities.length === 0) {
    throw new Error('No valid securities found in market data');
  }

  if (validSecurities.length !== data.length) {
    // eslint-disable-next-line no-console
    console.warn(`Filtered out ${String(data.length - validSecurities.length)} invalid securities`);
  }

  return validSecurities;
};

export const isBusinessDay = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday = 1, Friday = 5
};

export const getLatestBusinessDay = (exchange: Exchange): string => {
  const now = new Date();
  const latestDate = new Date(now);

  // Adjust for timezone (simplified - you might want more sophisticated logic)
  if (exchange === 'moex') {
    latestDate.setHours(latestDate.getHours() + 3); // Moscow time
  } else if (exchange === 'lse') {
    latestDate.setHours(latestDate.getHours() + 0); // London time
  } else if (exchange === 'bist') {
    latestDate.setHours(latestDate.getHours() + 3); // Istanbul time
  }

  // Go back to the latest business day
  while (!isBusinessDay(latestDate)) {
    latestDate.setDate(latestDate.getDate() - 1);
  }

  const formattedDate = latestDate.toISOString().split('T')[0];
  if (!formattedDate) {
    throw new Error('Failed to format date');
  }

  return formattedDate;
};
