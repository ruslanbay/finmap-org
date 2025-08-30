import type { AppConfig } from './types.js';
export declare const defaultConfig: AppConfig;
export declare let appConfig: AppConfig;
export declare function updateConfig(updates: Partial<AppConfig>): void;
export declare function getConfig(): Readonly<AppConfig>;
export declare function loadConfigFromURL(): void;
export declare function saveConfigToURL(): void;
export declare function loadFiltersFromStorage(): string[];
export declare function saveFiltersToStorage(filters: string[]): void;
//# sourceMappingURL=config.d.ts.map