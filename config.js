export const defaultConfig = {
    exchange: 'nasdaq',
    chartType: 'treemap',
    dataType: 'marketcap',
    date: '2025/08/01',
    currency: 'USD',
    language: 'ENG',
};
export let appConfig = { ...defaultConfig };
export function updateConfig(updates) {
    appConfig = { ...appConfig, ...updates };
}
export function getConfig() {
    return appConfig;
}
export function loadConfigFromURL() {
    const params = new URLSearchParams(window.location.search);
    const urlConfig = {};
    if (params.has('exchange'))
        urlConfig.exchange = params.get('exchange');
    if (params.has('chart'))
        urlConfig.chartType = params.get('chart');
    if (params.has('data'))
        urlConfig.dataType = params.get('data');
    if (params.has('date'))
        urlConfig.date = params.get('date');
    if (params.has('currency'))
        urlConfig.currency = params.get('currency');
    if (params.has('lang'))
        urlConfig.language = params.get('lang');
    updateConfig(urlConfig);
}
export function saveConfigToURL() {
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
export function loadFiltersFromStorage() {
    const stored = localStorage.getItem('finmap-filters');
    return stored ? JSON.parse(stored) : [];
}
export function saveFiltersToStorage(filters) {
    localStorage.setItem('finmap-filters', JSON.stringify(filters));
}
