export function formatNumber(value) {
    if (value >= 1e12)
        return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9)
        return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6)
        return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3)
        return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
}
export function formatPercent(value) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
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
export function getColorForChange(change) {
    if (change === null || change === 0)
        return 'rgb(64, 68, 82)';
    const normalizedChange = Math.max(-3, Math.min(3, change));
    const t = (normalizedChange + 3) / 6;
    if (t <= 0.5) {
        const localT = t * 2;
        const r = Math.round(236 + (64 - 236) * localT);
        const g = Math.round(48 + (68 - 48) * localT);
        const b = Math.round(51 + (82 - 51) * localT);
        return `rgb(${r}, ${g}, ${b})`;
    }
    else {
        const localT = (t - 0.5) * 2;
        const r = Math.round(64 + (42 - 64) * localT);
        const g = Math.round(68 + (202 - 68) * localT);
        const b = Math.round(82 + (85 - 82) * localT);
        return `rgb(${r}, ${g}, ${b})`;
    }
}
