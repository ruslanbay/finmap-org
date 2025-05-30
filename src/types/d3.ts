// D3.js type definitions for chart renderers

import * as d3 from 'd3';
import type { MarketSecurity } from './market.ts';
import type { TreemapNode } from './chart.ts';

// D3 hierarchy node with our data
export interface D3HierarchyNode extends d3.HierarchyRectangularNode<TreemapNode> {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  data: TreemapNode;
}

// Treemap specific node type
export interface TreemapLeafNode {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  data: TreemapNode;
  parent?: TreemapLeafNode;
  children?: TreemapLeafNode[];
}

// D3 Selection types for our use cases
export type D3Selection = d3.Selection<SVGSVGElement, unknown, null, undefined>;
export type D3GroupSelection = d3.Selection<SVGGElement, unknown, null, undefined>;
export type D3RectSelection = d3.Selection<SVGRectElement, D3HierarchyNode, SVGGElement, unknown>;
export type D3TextSelection = d3.Selection<SVGTextElement, D3HierarchyNode, SVGGElement, unknown>;
export type D3HistogramBarSelection = d3.Selection<SVGRectElement, MarketSecurity, SVGGElement, unknown>;

// D3 Tooltip type
export interface D3Tooltip {
  style(name: string, value?: string | number | null): D3Tooltip;
  html(value?: string): D3Tooltip;
  remove(): void;
}

// D3 Mouse/Touch event data
export interface D3EventData<T = unknown> {
  data: T;
  target: EventTarget | null;
}

// Chart event types
export interface ChartMouseEvent {
  detail?: {
    security: MarketSecurity;
    event: MouseEvent;
  };
}

// D3 scale types we use
export type D3BandScale = d3.ScaleBand<string>;
export type D3LinearScale = d3.ScaleLinear<number, number>;

// Re-export TreemapNode for convenience
export type { TreemapNode } from './chart.ts';
