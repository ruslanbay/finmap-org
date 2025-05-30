// Chart and visualization types

import type { DataType, Exchange, MarketSecurity } from './market.ts';

export interface TreemapNode {
  readonly id: string;
  readonly name: string;
  readonly value: number;
  readonly color: string;
  readonly parent?: string;
  readonly children?: TreemapNode[];
  readonly security?: MarketSecurity;
  readonly x0?: number;
  readonly y0?: number;
  readonly x1?: number;
  readonly y1?: number;
}

export interface ChartData {
  readonly securities: MarketSecurity[];
  readonly hierarchicalData: TreemapNode[];
  readonly exchange: Exchange;
  readonly date: string;
  readonly dataType: DataType;
  readonly totalValue: number;
  readonly currency: string;
}

export interface ChartDimensions {
  readonly width: number;
  readonly height: number;
  readonly margin: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
}

export interface TooltipData {
  readonly ticker: string;
  readonly name: string;
  readonly price: number;
  readonly priceChange: number;
  readonly marketCap: number;
  readonly volume: number;
  readonly sector: string;
  readonly industry: string;
  readonly exchange: string;
  readonly x: number;
  readonly y: number;
}

export interface SearchResult {
  readonly ticker: string;
  readonly name: string;
  readonly exchange: Exchange;
  readonly sector: string;
  readonly marketCap: number;
}

export interface ChartConfig {
  readonly colorScale: {
    readonly min: number;
    readonly max: number;
    readonly colors: readonly string[];
  };
  readonly animation: {
    readonly duration: number;
    readonly easing: string;
  };
  readonly interaction: {
    readonly zoom: boolean;
    readonly pan: boolean;
    readonly hover: boolean;
  };
}
