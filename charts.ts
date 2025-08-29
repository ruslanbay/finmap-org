declare const d3: any;

import type { MarketData, ChartRenderer, TreemapNode, PathbarItem, HistogramDataPoint } from './types.js';
import { getConfig } from './config.js';
import { formatNumber, formatPercent, getColorForChange } from './utils.js';

export class D3TreemapRenderer implements ChartRenderer {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private pathbar: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;
  private currentData: MarketData[] = [];
  private hierarchy: any = null;
  private currentRoot: TreemapNode | null = null;
  private rootNode: TreemapNode | null = null;
  private nodes: any[] = [];
  private resizeObserver: ResizeObserver | null = null;

  render(data: MarketData[], container: HTMLElement): void {
    this.container = container;
    this.currentData = data;
    this.setupCanvas();
    this.setupPathbar();
    this.setupTooltip();
    this.buildHierarchy();
    this.setupInteractions();
    this.setupResizeObserver();
    this.renderTreemap();
  }

  private setupCanvas(): void {
    if (!this.container) return;
    
    this.container.innerHTML = '';
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = 'calc(100vh - 110px)';
    this.canvas.style.display = 'block';
    this.canvas.style.cursor = 'pointer';
    
    this.updateCanvasSize();
    this.container.appendChild(this.canvas);
  }

  private setupPathbar(): void {
    if (!this.container) return;

    this.pathbar = document.createElement('div');
    this.pathbar.style.height = '40px';
    this.pathbar.style.backgroundColor = '#414554';
    this.pathbar.style.display = 'flex';
    this.pathbar.style.alignItems = 'center';
    this.pathbar.style.padding = '0 10px';
    this.pathbar.style.color = 'white';
    this.pathbar.style.fontSize = '14px';
    this.pathbar.style.borderBottom = '1px solid #555';
    this.pathbar.style.overflowX = 'auto';
    this.pathbar.style.whiteSpace = 'nowrap';
    this.container.appendChild(this.pathbar);
  }

  private setupTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.style.position = 'absolute';
    this.tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
    this.tooltip.style.color = 'white';
    this.tooltip.style.padding = '8px 12px';
    this.tooltip.style.borderRadius = '4px';
    this.tooltip.style.fontSize = '12px';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.opacity = '0';
    this.tooltip.style.transition = 'opacity 0.2s';
    this.tooltip.style.zIndex = '1000';
    this.tooltip.style.lineHeight = '1.4';
    this.tooltip.style.maxWidth = '300px';
    document.body.appendChild(this.tooltip);
  }

  private updateCanvasSize(): void {
    if (!this.canvas || !this.container) return;
    
    const rect = this.container.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = (rect.height - 40) * devicePixelRatio;
    
    this.context = this.canvas.getContext('2d');
    if (this.context) {
      this.context.scale(devicePixelRatio, devicePixelRatio);
    }
  }

  private setupResizeObserver(): void {
    if (!this.container) return;
    
    this.resizeObserver = new ResizeObserver(() => {
      this.updateCanvasSize();
      this.renderTreemap();
    });
    this.resizeObserver.observe(this.container);
  }

  private buildHierarchy(): void {
    const hierarchyData = this.prepareHierarchyData(this.currentData);
    this.hierarchy = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.children ? 0 : this.getValueForDataType(d))
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
    
    this.rootNode = this.hierarchy.data;
    this.currentRoot = this.rootNode;
    this.addParentReferences(this.hierarchy);
  }

  private addParentReferences(node: any): void {
    if (node.children) {
      node.children.forEach((child: any) => {
        child.data.parent = node.data;
        this.addParentReferences(child);
      });
    }
  }

  private renderTreemap(): void {
    if (!this.canvas || !this.context || !this.container || !this.hierarchy) return;
    
    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height - 40;
    
    const currentHierarchy = this.currentRoot === this.rootNode 
      ? this.hierarchy 
      : d3.hierarchy(this.currentRoot)
          .sum((d: any) => d.children ? 0 : this.getValueForDataType(d))
          .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
    
    const treemap = d3.treemap()
      .size([width, height])
      .paddingTop((d: any) => d.parent && d.children ? 24 : 0)
      .paddingRight(1)
      .paddingBottom(1)
      .paddingLeft(1)
      .round(true);
    
    treemap(currentHierarchy);
    this.nodes = currentHierarchy.descendants();
    
    this.context.clearRect(0, 0, width, height);
    this.updatePathbar();
    
    this.nodes.forEach((node: any) => {
      if (!node.parent) return;
      
      const width = node.x1 - node.x0;
      const height = node.y1 - node.y0;
      
      if (width < 1 || height < 1) return;
      
      if (node.children) {
        this.renderParentNode(node, width, height);
      } else {
        this.renderLeafNode(node, width, height);
      }
    });
  }

  private renderParentNode(node: any, width: number, height: number): void {
    if (!this.context) return;
    
    this.context.fillStyle = '#34495E';
    this.context.fillRect(node.x0, node.y0, width, height);
    
    this.context.fillStyle = '#2C3E50';
    this.context.fillRect(node.x0, node.y0, width, 24);
    
    if (width > 80) {
      this.context.fillStyle = '#fff';
      this.context.font = 'bold 12px Arial';
      this.context.textBaseline = 'middle';
      this.context.textAlign = 'left';
      
      const text = this.getTruncatedText(node.data.name, width - 10);
      this.context.fillText(text, node.x0 + 5, node.y0 + 12);
    }
  }

  private renderLeafNode(node: any, width: number, height: number): void {
    if (!this.context) return;
    
    const data = node.data.data as MarketData;
    const change = data?.priceChangePct || 0;
    
    this.context.fillStyle = getColorForChange(change);
    this.context.fillRect(node.x0, node.y0, width, height);
    
    if (width > 40 && height > 30) {
      this.context.fillStyle = '#fff';
      this.context.textAlign = 'center';
      this.context.textBaseline = 'middle';
      
      const centerX = node.x0 + width / 2;
      const centerY = node.y0 + height / 2;
      
      const fontSize = Math.min(width / 8, height / 6, 14);
      this.context.font = `bold ${fontSize}px Arial`;
      
      const ticker = this.getTruncatedText(node.data.ticker, width - 4);
      this.context.fillText(ticker, centerX, centerY - fontSize / 2);
      
      if (height > 50) {
        this.context.font = `${Math.max(fontSize - 2, 8)}px Arial`;
        this.context.fillText(formatPercent(change), centerX, centerY + fontSize / 2 + 2);
      }
    }
  }

  private getTruncatedText(text: string, maxWidth: number): string {
    if (!this.context) return text;
    
    let truncated = text;
    while (this.context.measureText(truncated).width > maxWidth && truncated.length > 3) {
      truncated = truncated.slice(0, -1);
    }
    return truncated !== text ? truncated + '...' : truncated;
  }

  private updatePathbar(): void {
    if (!this.pathbar || !this.currentRoot) return;
    
    const path = this.getPathToRoot(this.currentRoot);
    this.pathbar.innerHTML = '';
    
    path.forEach((item, index) => {
      if (index > 0) {
        const separator = document.createElement('span');
        separator.textContent = ' > ';
        separator.style.color = '#888';
        separator.style.margin = '0 5px';
        this.pathbar!.appendChild(separator);
      }
      
      const link = document.createElement('a');
      link.textContent = item.name;
      link.style.color = index === path.length - 1 ? '#ccc' : '#fff';
      link.style.textDecoration = 'none';
      link.style.cursor = index === path.length - 1 ? 'default' : 'pointer';
      link.style.padding = '5px';
      
      if (index < path.length - 1) {
        link.addEventListener('click', () => {
          this.drillTo(item.node);
        });
        link.addEventListener('mouseenter', () => {
          link.style.textDecoration = 'underline';
        });
        link.addEventListener('mouseleave', () => {
          link.style.textDecoration = 'none';
        });
      }
      
      this.pathbar!.appendChild(link);
    });
  }

  private getPathToRoot(node: TreemapNode): PathbarItem[] {
    const path: PathbarItem[] = [];
    let current: TreemapNode | null = node;
    
    while (current) {
      path.unshift({
        name: current.name || 'Market',
        node: current
      });
      current = current.parent || null;
    }
    
    return path;
  }

  private prepareHierarchyData(data: MarketData[]): TreemapNode {
    const securities = data.filter(item => item.type === 'stock' || item.type === 'etf');
    const sectors = d3.group(securities, (d: MarketData) => d.sector || 'Other');
    
    const children: TreemapNode[] = [];
    sectors.forEach((sectorSecurities: MarketData[], sectorName: string) => {
      const sectorChildren = sectorSecurities.map((security: MarketData) => ({
        ticker: security.ticker,
        name: security.nameEng,
        value: this.getValueForDataType(security),
        change: security.priceChangePct || 0,
        color: getColorForChange(security.priceChangePct || 0),
        data: security,
      }));
      
      children.push({
        ticker: sectorName,
        name: sectorName,
        value: 0,
        change: d3.mean(sectorChildren, (d: TreemapNode) => d.change) || 0,
        color: '#666',
        children: sectorChildren,
      });
    });
    
    return {
      ticker: 'root',
      name: 'Market',
      value: 0,
      change: 0,
      color: '#666',
      children,
    };
  }

  private getValueForDataType(item: MarketData | TreemapNode): number {
    const config = getConfig();
    if ('marketCap' in item) {
      switch (config.dataType) {
        case 'marketcap': return item.marketCap;
        case 'value': return item.value;
        case 'trades': return item.numTrades;
        case 'nestedItems': return item.nestedItemsCount;
        default: return item.marketCap;
      }
    }
    return item.value;
  }

  private setupInteractions(): void {
    if (!this.canvas) return;
    
    this.canvas.addEventListener('click', (event) => {
      const node = this.getNodeAtPosition(event);
      if (node) {
        if (node.children) {
          this.drillTo(node.data);
        } else {
          this.showCompanyOverlay(node.data.data as MarketData);
        }
      }
    });
    
    this.canvas.addEventListener('mousemove', (event) => {
      const node = this.getNodeAtPosition(event);
      if (node && !node.children) {
        this.showTooltip(node.data.data as MarketData, event);
      } else {
        this.hideTooltip();
      }
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
  }

  private getNodeAtPosition(event: MouseEvent): any {
    if (!this.canvas) return null;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    return this.nodes.find(node => 
      node.x0 <= x && x <= node.x1 && node.y0 <= y && y <= node.y1
    );
  }

  private drillTo(node: TreemapNode): void {
    this.currentRoot = node;
    this.renderTreemap();
  }

  private showTooltip(data: MarketData, event: MouseEvent): void {
    if (!this.tooltip) return;
    
    const config = getConfig();
    const currencySign = config.currency === 'USD' ? '$' : config.currency;
    
    this.tooltip.innerHTML = `
      <div><strong>${data.ticker}</strong></div>
      <div>${data.nameEng}</div>
      <div>Price: ${currencySign}${data.priceLastSale.toFixed(2)}</div>
      <div>Change: ${formatPercent(data.priceChangePct || 0)}</div>
      <div>Market Cap: ${currencySign}${formatNumber(data.marketCap)}M</div>
      <div>Volume: ${formatNumber(data.volume)}</div>
      <div>Trades: ${formatNumber(data.numTrades)}</div>
      <div>Exchange: ${data.exchange}</div>
    `;
    
    this.tooltip.style.left = `${event.clientX + 10}px`;
    this.tooltip.style.top = `${event.clientY - 10}px`;
    this.tooltip.style.opacity = '1';
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
    }
  }

  private showCompanyOverlay(data: MarketData): void {
    console.log('Show company overlay for:', data.ticker);
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.tooltip) {
      document.body.removeChild(this.tooltip);
      this.tooltip = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

export class D3HistogramRenderer implements ChartRenderer {
  private container: HTMLElement | null = null;
  private svg: any = null;
  private currentData: MarketData[] = [];

  render(data: MarketData[], container: HTMLElement): void {
    this.container = container;
    this.currentData = data;
    this.setupSVG();
    this.renderHistogram();
  }

  private setupSVG(): void {
    if (!this.container) return;
    
    this.container.innerHTML = '';
    
    const rect = this.container.getBoundingClientRect();
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${rect.width} ${rect.height}`);
  }

  private renderHistogram(): void {
    if (!this.svg || !this.container) return;
    
    const histogramData = this.prepareHistogramData();
    const rect = this.container.getBoundingClientRect();
    
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = rect.width - margin.left - margin.right;
    const height = rect.height - margin.top - margin.bottom;
    
    const xScale = d3.scaleBand()
      .domain(histogramData.map(d => d.sector))
      .range([0, width])
      .padding(0.1);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(histogramData, (d: HistogramDataPoint) => d.value) || 0])
      .range([height, 0]);
    
    const g = this.svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    g.selectAll('.bar')
      .data(histogramData)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', (d: HistogramDataPoint) => xScale(d.sector) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', (d: HistogramDataPoint) => yScale(d.value))
      .attr('height', (d: HistogramDataPoint) => height - yScale(d.value))
      .attr('fill', (d: HistogramDataPoint) => getColorForChange(d.value));
    
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale));
    
    g.append('g')
      .call(d3.axisLeft(yScale));
  }

  private prepareHistogramData(): HistogramDataPoint[] {
    const config = getConfig();
    const sectors = d3.group(this.currentData, (d: MarketData) => d.sector || 'Other');
    
    const result: HistogramDataPoint[] = [];
    sectors.forEach((securities: MarketData[], sector: string) => {
      const value = d3.sum(securities, (d: MarketData) => {
        switch (config.dataType) {
          case 'marketcap': return d.marketCap;
          case 'value': return d.value;
          case 'trades': return d.numTrades;
          case 'nestedItems': return d.nestedItemsCount;
          default: return d.marketCap;
        }
      });
      
      result.push({
        date: config.date,
        value,
        sector,
      });
    });
    
    return result.sort((a, b) => b.value - a.value);
  }

  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
