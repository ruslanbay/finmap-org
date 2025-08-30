import { getConfig } from './config.js';
export const dataParser = {
    parseSecurityRow(columns, row) {
        const data = {};
        columns.forEach((col, index) => {
            data[col] = row[index];
        });
        return {
            exchange: data.exchange || '',
            country: data.country || '',
            type: data.type || 'stock',
            sector: data.sector || '',
            industry: data.industry || '',
            currencyId: data.currencyId || 'USD',
            ticker: data.ticker || '',
            nameEng: data.nameEng || '',
            nameEngShort: data.nameEngShort || '',
            nameOriginal: data.nameOriginal || '',
            nameOriginalShort: data.nameOriginalShort || '',
            priceOpen: Number(data.priceOpen) || 0,
            priceLastSale: Number(data.priceLastSale) || 0,
            priceChangePct: data.priceChangePct === null ? null : Number(data.priceChangePct) || 0,
            volume: Number(data.volume) || 0,
            value: Number(data.value) || 0,
            numTrades: Number(data.numTrades) || 0,
            marketCap: Number(data.marketCap) || 0,
            listedFrom: data.listedFrom || '',
            listedTill: data.listedTill || '',
            wikiPageIdEng: data.wikiPageIdEng || '',
            wikiPageIdOriginal: data.wikiPageIdOriginal || '',
            nestedItemsCount: Number(data.nestedItemsCount) || 0,
        };
    },
    validateDataIntegrity(data) {
        return !!(data?.securities?.columns?.length && data?.securities?.data?.length);
    },
};
export function parseMarketData(response) {
    if (!dataParser.validateDataIntegrity(response)) {
        return [];
    }
    return response.securities.data.map(row => dataParser.parseSecurityRow(response.securities.columns, row));
}
export function parseHistoricalData(response) {
    return response.sectors || [];
}
export async function fetchMarketData() {
    const config = getConfig();
    const baseUrls = {
        'nasdaq': 'https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/marketdata',
        'nyse': 'https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/marketdata',
        'amex': 'https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/marketdata',
        'us-all': 'https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/marketdata',
        'moex': 'https://raw.githubusercontent.com/finmap-org/data-russia/refs/heads/main/marketdata',
        'lse': 'https://raw.githubusercontent.com/finmap-org/data-uk/refs/heads/main/marketdata',
        'bist': 'https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/marketdata',
    };
    const baseUrl = baseUrls[config.exchange];
    const url = `${baseUrl}/${config.date}/${config.exchange}.json`;
    try {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return parseMarketData(data);
    }
    catch (error) {
        throw new Error(`Failed to fetch market data: ${error}`);
    }
}
export async function fetchHistoricalData() {
    const config = getConfig();
    const baseUrls = {
        'nasdaq': 'https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/history',
        'nyse': 'https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/history',
        'amex': 'https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/history',
        'us-all': 'https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/history',
        'moex': 'https://raw.githubusercontent.com/finmap-org/data-russia/refs/heads/main/history',
        'lse': 'https://raw.githubusercontent.com/finmap-org/data-uk/refs/heads/main/history',
        'bist': 'https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/history',
    };
    const baseUrl = baseUrls[config.exchange];
    const url = `${baseUrl}/${config.exchange}.json`;
    try {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return parseHistoricalData(data);
    }
    catch (error) {
        throw new Error(`Failed to fetch historical data: ${error}`);
    }
}
export async function fetchCompanyInfo(ticker) {
    const config = getConfig();
    const firstLetter = ticker.charAt(0).toLowerCase();
    const url = `https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/securities/${config.exchange}/${firstLetter}/${ticker}.json`;
    try {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }
    catch (error) {
        return null;
    }
}
//# sourceMappingURL=data.js.map