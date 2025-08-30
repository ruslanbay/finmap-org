import * as d3 from 'd3';

const formatSI = d3.format('.1~s');
const formatPercentD3 = d3.format('+.2%');
const formatCurrency = d3.format(',.2f');

const colorScale = d3.scaleLinear<string>()
  .domain([-3, 0, 3])
  .range(['rgb(236, 48, 51)', 'rgb(64, 68, 82)', 'rgb(42, 202, 85)'])
  .clamp(true);

export function formatNumber(value: number): string {
  return formatSI(value).replace('G', 'B');
}

export function formatPercent(value: number): string {
  return formatPercentD3(value / 100);
}

export function formatPercentChange(value: number): string {
  return formatPercentD3(value / 100);
}

export function formatCurrencyValue(value: number): string {
  return formatCurrency(value);
}

export function getColorForChange(change: number | null): string {
  if (change === null || change === 0) return 'rgb(64, 68, 82)';
  return colorScale(change);
}

export function formatDate(dateStr: string): string {
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

export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func.apply(null, args), wait);
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
