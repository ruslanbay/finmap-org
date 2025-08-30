const formatSI = d3.format('.1~s');
const formatPercentD3 = d3.format('+.2%');
const formatCurrency = d3.format(',.2f');
const colorScale = d3.scaleLinear()
    .domain([-3, 0, 3])
    .range(['rgb(236, 48, 51)', 'rgb(64, 68, 82)', 'rgb(42, 202, 85)'])
    .clamp(true);
export function formatNumber(value) {
    return formatSI(value).replace('G', 'B');
}
export function formatPercent(value) {
    return formatPercentD3(value / 100);
}
export function formatPercentChange(value) {
    return formatPercentD3(value / 100);
}
export function formatCurrencyValue(value) {
    return formatCurrency(value);
}
export function getColorForChange(change) {
    if (change === null || change === 0)
        return 'rgb(64, 68, 82)';
    return colorScale(change);
}
export function formatDate(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    return dateStr;
}
export function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(null, args), wait);
    };
}
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
