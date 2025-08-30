export declare function formatNumber(value: number): string;
export declare function formatPercent(value: number): string;
export declare function formatPercentChange(value: number): string;
export declare function formatCurrencyValue(value: number): string;
export declare function getColorForChange(change: number | null): string;
export declare function formatDate(dateStr: string): string;
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
export declare function clamp(value: number, min: number, max: number): number;
//# sourceMappingURL=utils.d.ts.map