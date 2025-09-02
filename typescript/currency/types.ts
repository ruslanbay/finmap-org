export type Currency = "USD" | "RUB" | "EUR" | "GBP" | "TRY";

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  position: "before" | "after";
}

export type ExchangeRates = Record<string, number>;
