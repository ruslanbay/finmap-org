// Application constants

export const APP_CONFIG = {
  name: 'finmap.org',
  version: '2.0.0',
  description: 'Global Stock Market Visualization',
  github: {
    org: 'finmap-org',
    baseUrl: 'https://raw.githubusercontent.com/finmap-org',
  },
  api: {
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
} as const;

export const CHART_CONFIG = {
  treemap: {
    padding: 2,
    borderWidth: {
      default: 2,
      highlighted: 5,
    },
    borderColor: {
      default: '#3f4351',
      highlighted: '#ceda6d',
    },
    colorScale: {
      min: -3,
      max: 3,
      colors: ['#ec3033', '#40445a', '#2aca55'],
    },
    animation: {
      duration: 300,
      easing: 'ease-in-out',
    },
  },
  histogram: {
    margin: {
      top: 20,
      right: 30,
      bottom: 40,
      left: 50,
    },
    animation: {
      duration: 500,
      easing: 'ease-in-out',
    },
  },
} as const;

export const DEFAULT_EXCHANGE = 'nasdaq' as const;
export const DEFAULT_DATA_TYPE = 'marketcap' as const;
export const DEFAULT_CHART_TYPE = 'treemap' as const;

export const HIGHLIGHT_LIST = ['AAPL', 'ASML', 'WLY', 'GCHE'] as const;

export const CURRENCY_SIGNS = {
  USD: '$',
  GBP: '£',
  RUB: '₽',
  TRY: '₺',
  EUR: '€',
} as const;

export const DATA_REPOSITORIES = {
  'data-us': ['nasdaq', 'nyse', 'amex'],
  'data-uk': ['lse'],
  'data-russia': ['moex'],
  'data-turkey': ['bist'],
  'data-tcg': ['tcg'],
  'data-currency': ['currency'],
  'data-commodity': ['commodity'],
} as const;
