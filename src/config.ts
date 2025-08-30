import type { AppConfig } from './types.js';

export const defaultConfig: AppConfig = {
  exchange: 'nasdaq',
  chartType: 'treemap',
  dataType: 'marketcap',
  date: '2025/08/01',
  currency: 'USD',
  language: 'ENG',
};

export let appConfig: AppConfig = { ...defaultConfig };

export function updateConfig(updates: Partial<AppConfig>): void {
  appConfig = { ...appConfig, ...updates };
}

export function getConfig(): Readonly<AppConfig> {
  return appConfig;
}

export function loadConfigFromURL(): void {
  const params = new URLSearchParams(window.location.search);
  const urlConfig: Partial<AppConfig> = {};
  
  if (params.has('exchange')) urlConfig.exchange = params.get('exchange') as any;
  if (params.has('chart')) urlConfig.chartType = params.get('chart') as any;
  if (params.has('data')) urlConfig.dataType = params.get('data') as any;
  if (params.has('date')) urlConfig.date = params.get('date')!;
  if (params.has('currency')) urlConfig.currency = params.get('currency') as any;
  if (params.has('lang')) urlConfig.language = params.get('lang') as any;
  
  updateConfig(urlConfig);
}

export function saveConfigToURL(): void {
  const params = new URLSearchParams();
  params.set('exchange', appConfig.exchange);
  params.set('chart', appConfig.chartType);
  params.set('data', appConfig.dataType);
  params.set('date', appConfig.date);
  params.set('currency', appConfig.currency);
  params.set('lang', appConfig.language);
  
  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, '', newURL);
}

export function loadFiltersFromStorage(): string[] {
  const stored = localStorage.getItem('finmap-filters');
  return stored ? JSON.parse(stored) : [];
}

export function saveFiltersToStorage(filters: string[]): void {
  localStorage.setItem('finmap-filters', JSON.stringify(filters));
}
