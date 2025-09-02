import type {
  HistoricalDataResponse,
  HistoricalSector,
  ExchangeRateData,
  CommodityData,
} from "./types.js";
import { getConfig, EXCHANGE_INFO } from "../config.js";
export { fetchExchangeRates } from "../currency/index.js";

export async function fetchHistoricalData(): Promise<HistoricalDataResponse> {
  const config = getConfig();
  const exchangeInfo = EXCHANGE_INFO[config.exchange];
  const url = `https://raw.githubusercontent.com/finmap-org/${exchangeInfo.dataRepo}/refs/heads/main/history/${config.exchange}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch historical data: ${error}`);
  }
}

export async function fetchCommodityData(): Promise<CommodityData> {
  const url =
    "https://raw.githubusercontent.com/finmap-org/data-commodity/refs/heads/main/marketdata/brent.json";

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch commodity data:", error);
    return {};
  }
}

export function convertCurrency(
  data: HistoricalDataResponse,
  exchangeRates: ExchangeRateData,
): HistoricalDataResponse {
  if (Object.keys(exchangeRates).length === 0) return data;

  const validDates = data.dates.filter((date) => exchangeRates[date]);
  const validIndexes = data.dates
    .map((date, index) => ({ date, index }))
    .filter((item) => exchangeRates[item.date])
    .map((item) => item.index);

  return {
    dates: validDates,
    sectors: data.sectors.map((sector) => ({
      ...sector,
      marketCap: validIndexes.map((i) => {
        const date = data.dates[i];
        const rate = date ? exchangeRates[date] : undefined;
        return rate ? (sector.marketCap[i] || 0) / rate : 0;
      }),
      value: validIndexes.map((i) => {
        const date = data.dates[i];
        const rate = date ? exchangeRates[date] : undefined;
        return rate ? (sector.value[i] || 0) / rate : 0;
      }),
    })),
  };
}

export function calculateTotalValues(
  data: HistoricalDataResponse,
  dataType: string,
): number[] {
  return data.dates.map((_, index) => {
    return data.sectors.reduce((total, sector) => {
      if (sector.sectorName === "") return total;
      const value = getValueByDataType(sector, dataType, index);
      return total + value;
    }, 0);
  });
}

function getValueByDataType(
  sector: HistoricalSector,
  dataType: string,
  index: number,
): number {
  switch (dataType) {
    case "marketcap":
      return sector.marketCap[index] || 0;
    case "value":
      return sector.value[index] || 0;
    case "trades":
      return sector.tradesNumber[index] || 0;
    default:
      return sector.marketCap[index] || 0;
  }
}
