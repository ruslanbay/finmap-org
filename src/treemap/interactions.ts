import { TRANSITIONS } from './constants.js';
import type { MarketData } from '../types.js';

declare const d3: any;

interface InteractionCallbacks {
  onDrill: (node: any) => void;
  onShowCompany: (data: MarketData) => void;
  onShowTooltip: (data: MarketData, event: MouseEvent, node?: any) => void;
  onHideTooltip: () => void;
  onNodeAtPosition: (event: MouseEvent) => any;
  isTransitioning: () => boolean;
}

export class InteractionHandler {
  private canvas: HTMLCanvasElement | null = null;
  private callbacks: InteractionCallbacks | null = null;

  init(canvas: HTMLCanvasElement, callbacks: InteractionCallbacks): void {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.canvas || !this.callbacks) return;

    const canvasSelection = d3.select(this.canvas);

    this.canvas.addEventListener('click', (event) => {
      if (this.callbacks!.isTransitioning()) return;

      const node = this.callbacks!.onNodeAtPosition(event);
      if (!node?.data) return;

      if (node.children?.length > 0) {
        this.callbacks!.onDrill(node.data);
      } else if (node.data.data) {
        this.callbacks!.onShowCompany(node.data.data as MarketData);
      }
    });

    this.canvas.addEventListener('mouseenter', () => {
      if (!this.callbacks!.isTransitioning()) {
        canvasSelection
          .transition()
          .duration(TRANSITIONS.HOVER)
          .style('filter', 'brightness(1.05)');
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      canvasSelection
        .transition()
        .duration(TRANSITIONS.HOVER)
        .style('filter', 'brightness(1)')
        .style('cursor', 'default');
      this.callbacks!.onHideTooltip();
    });

    this.canvas.addEventListener('mousemove', (event) => {
      if (this.callbacks!.isTransitioning()) return;

      const node = this.callbacks!.onNodeAtPosition(event);
      if (!node?.data) {
        this.callbacks!.onHideTooltip();
        canvasSelection.style('cursor', 'default');
        return;
      }

      const isLeaf = !node.children?.length;
      const tooltipData = isLeaf ? node.data.data as MarketData : node.data as MarketData;

      if (tooltipData) {
        this.callbacks!.onShowTooltip(tooltipData, event, node);
        canvasSelection.style('cursor', 'pointer');
      }
    });
  }
}
