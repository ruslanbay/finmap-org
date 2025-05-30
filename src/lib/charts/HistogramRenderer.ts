// Modern D3.js histogram renderer for financial data

import * as d3 from 'd3';
import type { 
  ChartData, 
  ChartDimensions, 
  MarketSecurity,
  D3Selection,
  D3Tooltip
} from '../../types/index.ts';
import { formatCurrency, formatPercentage } from '../utils/index.ts';

export class HistogramRenderer {
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
   * Render histogram with the provided data
   */
  public render(data: ChartData): void {
    this.currentData = data;
    this.dimensions = this.calculateDimensions();
    
    // Clear existing chart
    this.clear();
    
    // Create SVG
    this.svg = this.createSvg();
    
    // Setup chart components
    this.renderChart(data);
  }

  private createSvg(): D3Selection {
    return d3.select(this.container)
      .append('svg')
      .attr('width', this.dimensions.width)
      .attr('height', this.dimensions.height)
      .style('font-family', 'Arial, sans-serif');
  }

  private renderChart(data: ChartData): void {
    if (!this.svg) return;

    // Create margins and dimensions
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = this.dimensions.width - margin.left - margin.right;
    const height = this.dimensions.height - margin.top - margin.bottom;

    const g = this.svg.append('g')
      .attr('transform', `translate(${String(margin.left)},${String(margin.top)})`);

    // Prepare data and scales
    const sortedSecurities = this.prepareSortedData(data);
    const { xScale, yScale } = this.createScales(sortedSecurities, data, width, height);

    // Render chart components
    this.renderBars(g, sortedSecurities, data, xScale, yScale, height);
    this.renderAxes(g, xScale, yScale, height, data);
    this.renderTitle(data);
  }

  private prepareSortedData(data: ChartData): MarketSecurity[] {
    return [...data.securities]
      .sort((a, b) => this.getSecurityValue(b, data.dataType) - this.getSecurityValue(a, data.dataType))
      .slice(0, 50); // Show top 50 for performance
  }

  private createScales(sortedSecurities: MarketSecurity[], data: ChartData, width: number, height: number): { xScale: d3.ScaleBand<string>, yScale: d3.ScaleLinear<number, number> } {
    const xScale = d3.scaleBand()
      .domain(sortedSecurities.map(s => s.ticker))
      .range([0, width])
      .padding(0.1);    const yScale = d3.scaleLinear()
      .domain([0, d3.max(sortedSecurities, d => this.getSecurityValue(d, data.dataType)) || 0])
      .range([height, 0]);

    return { xScale, yScale };
  }

  private renderBars(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    sortedSecurities: MarketSecurity[],
    data: ChartData,
    xScale: d3.ScaleBand<string>,
    yScale: d3.ScaleLinear<number, number>,
    height: number
  ): void {
    g.selectAll('.bar')
      .data(sortedSecurities)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', (d: unknown) => xScale((d as MarketSecurity).ticker) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', (d: unknown) => yScale(this.getSecurityValue(d as MarketSecurity, data.dataType)))
      .attr('height', (d: unknown) => height - yScale(this.getSecurityValue(d as MarketSecurity, data.dataType)))
      .attr('fill', (d: unknown) => this.getColorFromPriceChange((d as MarketSecurity).priceChangePct))
      .style('cursor', 'pointer')
      .on('mouseover', (event: MouseEvent, d: MarketSecurity) => { this.showTooltip(event, d); })
      .on('mousemove', (event: MouseEvent) => { this.moveTooltip(event); })
      .on('mouseout', () => { this.hideTooltip(); })
      .on('click', (event: MouseEvent, d: MarketSecurity) => { this.handleClick(event, d); });
  }

  private renderAxes(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    xScale: d3.ScaleBand<string>,
    yScale: d3.ScaleLinear<number, number>,
    height: number,
    data: ChartData
  ): void {
    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${String(height)})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '10px')
      .style('fill', '#fff');

    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => this.formatYAxisLabel(d as number, data.dataType)))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#fff');

    // Add axis lines
    g.selectAll('.domain, .tick line')
      .style('stroke', '#666');
  }

  private renderTitle(data: ChartData): void {
    if (!this.svg) return;

    // Add chart title
    this.svg.append('text')
      .attr('x', this.dimensions.width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', '#fff')
      .text(`Top 50 ${data.exchange.toUpperCase()} Securities by ${this.getDataTypeLabel(data.dataType)}`);
  }

  /**
   * Update chart with new data
   */
  public update(data: ChartData): void {
    this.render(data);
  }

  /**
   * Highlight specific securities
   */
  public highlightSecurities(tickers: string[]): void {
    if (!this.svg) return;

    this.svg.selectAll('.bar')
      .style('stroke-width', (d: unknown) => {
        const security = d as MarketSecurity;
        return tickers.includes(security.ticker) ? '2px' : '0px';
      })
      .style('stroke', '#fff');
  }

  /**
   * Search and highlight a specific security
   */
  public searchAndHighlight(query: string): boolean {
    if (!this.svg || !this.currentData) return false;

    const security = this.currentData.securities.find(s => 
      s.ticker.toLowerCase() === query.toLowerCase() ||
      s.nameEng.toLowerCase().includes(query.toLowerCase())
    );

    if (security) {
      this.highlightSecurities([security.ticker]);
      return true;
    }

    return false;
  }

  private showTooltip(event: MouseEvent, security: MarketSecurity): void {
    if (!this.tooltip || !this.currentData) return;

    const tooltipContent = `
      <div class="tooltip-header">
        <strong>${security.ticker}</strong>
      </div>
      <div class="tooltip-body">
        <div>${security.nameEng}</div>
        <div>Price: ${formatCurrency(security.priceLastSale, this.currentData.currency)}</div>
        <div>Change: ${formatPercentage(security.priceChangePct)}</div>
        <div>${this.getDataTypeLabel(this.currentData.dataType)}: ${this.formatValue(this.getSecurityValue(security, this.currentData.dataType), this.currentData.dataType)}</div>
        <div>Sector: ${security.sector}</div>
        <div>Exchange: ${security.exchange.toUpperCase()}</div>
      </div>
    `;

    this.tooltip
      .style('opacity', 1)
      .html(tooltipContent);

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

  private handleClick(event: MouseEvent, security: MarketSecurity): void {
    // Emit custom event for external handling
    this.container.dispatchEvent(new CustomEvent('securityClick', {
      detail: { security, event }
    }));
  }

  private getSecurityValue(security: MarketSecurity, dataType: string): number {
    switch (dataType) {
      case 'marketcap': return security.marketCap;
      case 'value': return security.value;
      case 'trades': return security.numTrades;
      case 'nestedItems': return security.nestedItemsCount;
      default: return security.marketCap;
    }
  }

  private getColorFromPriceChange(priceChangePct: number): string {
    const normalizedChange = Math.max(-3, Math.min(3, priceChangePct));
    
    if (normalizedChange < -1) return '#ec3033'; // Red for losses
    if (normalizedChange > 1) return '#2aca55';  // Green for gains
    return '#40445a'; // Gray for neutral
  }

  private getDataTypeLabel(dataType: string): string {
    switch (dataType) {
      case 'marketcap': return 'Market Cap';
      case 'value': return 'Trading Value';
      case 'trades': return 'Number of Trades';
      case 'nestedItems': return 'Nested Items';
      default: return 'Market Cap';
    }
  }

  private formatValue(value: number, dataType: string): string {
    switch (dataType) {
      case 'marketcap':
      case 'value':
        return value > 1e9 ? `$${(value / 1e9).toFixed(1)}B` : 
               value > 1e6 ? `$${(value / 1e6).toFixed(1)}M` : 
               `$${value.toLocaleString()}`;
      case 'trades':
      case 'nestedItems':
        return value.toLocaleString();
      default:
        return value.toLocaleString();
    }
  }

  private formatYAxisLabel(value: number, dataType: string): string {
    switch (dataType) {
      case 'marketcap':
      case 'value':
        return value > 1e9 ? `${(value / 1e9).toFixed(0)}B` : 
               value > 1e6 ? `${(value / 1e6).toFixed(0)}M` : 
               `${(value / 1e3).toFixed(0)}K`;
      case 'trades':
      case 'nestedItems':
        return value > 1e6 ? `${(value / 1e6).toFixed(0)}M` : 
               value > 1e3 ? `${(value / 1e3).toFixed(0)}K` : 
               value.toString();
      default:
        return value.toString();
    }
  }

  private calculateDimensions(): ChartDimensions {
    const rect = this.container.getBoundingClientRect();
    return {
      width: rect.width || 800,
      height: rect.height || 600,
      margin: { top: 20, right: 30, bottom: 40, left: 50 },
    };
  }

  private setupTooltip(): void {
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'histogram-tooltip')
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
