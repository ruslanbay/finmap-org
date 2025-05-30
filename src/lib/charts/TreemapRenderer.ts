// Modern D3.js treemap renderer for financial data

import * as d3 from 'd3';
import type { ChartData, ChartDimensions, TreemapNode } from '../../types/chart.ts';
import type { D3Selection, D3Tooltip } from '../../types/d3.ts';
import type { MarketSecurity } from '../../types/market.ts';
import { CHART_CONFIG, HIGHLIGHT_LIST } from '../utils/constants.ts';
import { formatCurrency, formatMarketCap, formatPercentage } from '../utils/index.ts';

export class TreemapRenderer {
  private readonly container: HTMLElement;
  private svg: D3Selection | null = null;
  private tooltip: D3Tooltip | null = null;
  private dimensions: ChartDimensions;
  private currentData: ChartData | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.dimensions = this.calculateDimensions();
    this.setupTooltip();
    this.setupResizeHandler();
  }

  /**
   * Render treemap with the provided data
   */
  public render(data: ChartData): void {
    this.currentData = data;
    this.dimensions = this.calculateDimensions();

    // Clear existing chart
    this.clear();

    // Create SVG
    this.svg = d3
      .select(this.container)
      .append('svg')
      .attr('width', this.dimensions.width)
      .attr('height', this.dimensions.height)
      .style('font-family', 'Arial, sans-serif');

    // Create treemap layout
    const treemap = d3
      .treemap<TreemapNode>()
      .size([this.dimensions.width, this.dimensions.height])
      .padding(CHART_CONFIG.treemap.padding)
      .round(true);

    // Build hierarchy from data
    const hierarchy = this.buildHierarchy(data);
    const root = d3
      .hierarchy(hierarchy)
      .sum(d => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Calculate treemap layout
    treemap(root);

    // Render nodes
    const leaves = root.leaves() as d3.HierarchyRectangularNode<TreemapNode>[];
    this.renderNodes(leaves);
    this.renderLabels();
  }

  /**
   * Update chart with new data (optimized for performance)
   */
  public update(data: ChartData): void {
    if (!this.svg || !this.currentData) {
      this.render(data);
      return;
    }

    this.currentData = data;

    // Update existing nodes instead of full re-render
    // This is much faster for data updates
    this.updateNodes(data);
  }

  /**
   * Highlight specific securities
   */
  public highlightSecurities(tickers: string[]): void {
    if (!this.svg) return;

    this.svg
      .selectAll('.treemap-leaf')
      .style('stroke-width', (d: unknown) => {
        const node = d as d3.HierarchyRectangularNode<TreemapNode>;
        const security = node.data.security as MarketSecurity;
        return tickers.includes(security.ticker)
          ? CHART_CONFIG.treemap.borderWidth.highlighted
          : CHART_CONFIG.treemap.borderWidth.default;
      })
      .style('stroke', (d: unknown) => {
        const node = d as d3.HierarchyRectangularNode<TreemapNode>;
        const security = node.data.security as MarketSecurity;
        return tickers.includes(security.ticker)
          ? CHART_CONFIG.treemap.borderColor.highlighted
          : CHART_CONFIG.treemap.borderColor.default;
      });
  }

  /**
   * Search and highlight a specific security
   */
  public searchAndHighlight(query: string): boolean {
    if (!this.svg || !this.currentData) return false;

    const security = this.currentData.securities.find(
      s =>
        s.ticker.toLowerCase() === query.toLowerCase() ||
        s.nameEng.toLowerCase().includes(query.toLowerCase())
    );

    if (security) {
      this.highlightSecurities([security.ticker]);
      return true;
    }

    return false;
  }

  private buildHierarchy(data: ChartData): TreemapNode {
    // Group by sector like the original implementation
    const sectors = new Map<string, MarketSecurity[]>();

    data.securities.forEach(security => {
      const sector = security.sector || 'Other';
      if (!sectors.has(sector)) {
        sectors.set(sector, []);
      }
      sectors.get(sector)?.push(security);
    });

    const children: TreemapNode[] = Array.from(sectors.entries()).map(([sector, securities]) => ({
      id: sector,
      name: sector,
      value: securities.reduce((sum, s) => sum + this.getSecurityValue(s, data.dataType), 0),
      color: '#666',
      children: securities.map(security => ({
        id: security.ticker,
        name: security.nameEng,
        value: this.getSecurityValue(security, data.dataType),
        color: this.getColorFromPriceChange(security.priceChangePct),
        security,
      })),
    }));

    return {
      id: 'root',
      name: 'Market',
      value: data.totalValue,
      color: '#333',
      children,
    };
  }

  private renderNodes(leaves: d3.HierarchyRectangularNode<TreemapNode>[]): void {
    if (!this.svg) return;

    const leaf = this.svg
      .selectAll('.treemap-leaf')
      .data(leaves)
      .enter()
      .append('g')
      .attr('class', 'treemap-leaf')
      .attr('transform', d => `translate(${String(d.x0)},${String(d.y0)})`);

    // Add rectangles
    leaf
      .append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => d.data.color)
      .attr('stroke', CHART_CONFIG.treemap.borderColor.default)
      .attr('stroke-width', d => {
        const security = d.data.security;
        return security && (HIGHLIGHT_LIST as readonly string[]).includes(security.ticker)
          ? CHART_CONFIG.treemap.borderWidth.highlighted
          : CHART_CONFIG.treemap.borderWidth.default;
      })
      .style('cursor', 'pointer')
      .on('mouseover', (event: MouseEvent, d: d3.HierarchyRectangularNode<TreemapNode>) => {
        this.showTooltip(event, d);
      })
      .on('mousemove', (event: MouseEvent) => {
        this.moveTooltip(event);
      })
      .on('mouseout', () => {
        this.hideTooltip();
      })
      .on('click', (event: MouseEvent, d: d3.HierarchyRectangularNode<TreemapNode>) => {
        this.handleClick(event, d);
      });
  }

  private renderLabels(): void {
    if (!this.svg) return;

    const leaf = this.svg.selectAll('.treemap-leaf');

    // Add text labels
    leaf
      .append('text')
      .attr('x', 4)
      .attr('y', 16)
      .text((d: unknown) => {
        const node = d as d3.HierarchyRectangularNode<TreemapNode>;
        const width = node.x1 - node.x0;
        const height = node.y1 - node.y0;

        // Only show text if rectangle is large enough
        if (width < 50 || height < 20) return '';

        const security = node.data.security;
        if (!security) return node.data.name;

        return security.ticker;
      })
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .style('pointer-events', 'none');

    // Add secondary labels for larger rectangles
    leaf
      .append('text')
      .attr('x', 4)
      .attr('y', 30)
      .text((d: unknown) => {
        const node = d as d3.HierarchyRectangularNode<TreemapNode>;
        const width = node.x1 - node.x0;
        const height = node.y1 - node.y0;

        if (width < 100 || height < 40) return '';

        const security = node.data.security;
        if (!security) return '';

        return formatPercentage(security.priceChangePct);
      })
      .attr('font-size', '10px')
      .attr('fill', 'white')
      .style('pointer-events', 'none');
  }

  private showTooltip(event: MouseEvent, d: d3.HierarchyRectangularNode<TreemapNode>): void {
    if (!this.tooltip || !this.currentData) return;

    const security = d.data.security;
    if (!security) return;

    const tooltipContent = `
      <div class="tooltip-header">
        <strong>${security.ticker}</strong>
      </div>
      <div class="tooltip-body">
        <div>${security.nameEng}</div>
        <div>Price: ${formatCurrency(security.priceLastSale, this.currentData.currency)}</div>
        <div>Change: ${formatPercentage(security.priceChangePct)}</div>
        <div>Market Cap: ${formatMarketCap(security.marketCap, this.currentData.currency)}</div>
        <div>Volume: ${security.volume.toLocaleString()}</div>
        <div>Sector: ${security.sector}</div>
        <div>Exchange: ${security.exchange.toUpperCase()}</div>
      </div>
    `;

    this.tooltip.style('opacity', 1).html(tooltipContent);

    this.moveTooltip(event);
  }

  private moveTooltip(event: MouseEvent): void {
    if (!this.tooltip) return;

    this.tooltip
      .style('left', `${String(event.pageX + 10)}px`)
      .style('top', `${String(event.pageY - 28)}px`);
  }

  private hideTooltip(): void {
    if (!this.tooltip) return;
    this.tooltip.style('opacity', 0);
  }

  private handleClick(event: MouseEvent, d: d3.HierarchyRectangularNode<TreemapNode>): void {
    const security = d.data.security;
    if (!security) return;

    // Emit custom event for external handling
    this.container.dispatchEvent(
      new CustomEvent('securityClick', {
        detail: { security, event },
      })
    );
  }

  private updateNodes(data: ChartData): void {
    // Implement efficient update logic here
    // For now, just re-render - you can optimize this later
    this.render(data);
  }

  private getSecurityValue(security: MarketSecurity, dataType: string): number {
    switch (dataType) {
      case 'marketcap':
        return security.marketCap;
      case 'value':
        return security.value;
      case 'trades':
        return security.numTrades;
      case 'nestedItems':
        return security.nestedItemsCount;
      default:
        return security.marketCap;
    }
  }

  private getColorFromPriceChange(priceChangePct: number): string {
    const normalizedChange = Math.max(-3, Math.min(3, priceChangePct));

    if (normalizedChange < -1) return CHART_CONFIG.treemap.colorScale.colors[0]; // Red
    if (normalizedChange > 1) return CHART_CONFIG.treemap.colorScale.colors[2]; // Green
    return CHART_CONFIG.treemap.colorScale.colors[1]; // Gray
  }

  private calculateDimensions(): ChartDimensions {
    const rect = this.container.getBoundingClientRect();
    return {
      width: rect.width || 800,
      height: rect.height || 600,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    };
  }

  private setupTooltip(): void {
    this.tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'treemap-tooltip')
      .style('position', 'absolute')
      .style('opacity', 0)
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '10px')
      .style('border-radius', '5px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000') as D3Tooltip;
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      if (this.currentData) {
        this.render(this.currentData);
      }
    });
  }

  private clear(): void {
    d3.select(this.container).selectAll('*').remove();
  }

  public destroy(): void {
    this.clear();
    if (this.tooltip) {
      this.tooltip.remove();
    }
  }
}
