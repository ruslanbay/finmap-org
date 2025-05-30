// Formatting utilities for financial data

export const formatCurrency = (
  value: number,
  currency = 'USD',
  options: Intl.NumberFormatOptions = {}
): string => {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  };

  return new Intl.NumberFormat('en-US', defaultOptions).format(value);
};

export const formatPercentage = (value: number, decimals = 2): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

export const formatMarketCap = (value: number, currency = 'USD'): string => {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000) {
    return formatCurrency(value / 1_000_000, currency) + 'T';
  } else if (absValue >= 1_000) {
    return formatCurrency(value / 1_000, currency) + 'B';
  } else {
    return formatCurrency(value, currency) + 'M';
  }
};

export const formatVolume = (value: number): string => {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  } else {
    return value.toLocaleString();
  }
};

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTicker = (ticker: string): string => {
  return ticker.toUpperCase().trim();
};

export const formatCompanyName = (name: string, maxLength = 50): string => {
  if (name.length <= maxLength) return name;
  return `${name.substring(0, maxLength - 3)}...`;
};
