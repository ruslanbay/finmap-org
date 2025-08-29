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
    this.setupContainer();
    this.setupPathbar();
    this.setupCanvas();
    this.setupTooltip();
    this.buildHierarchy();
    this.setupInteractions();
    this.setupResizeObserver();
    this.renderTreemap();
  }

  private setupContainer(): void {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.height = '100%';
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
    this.pathbar.style.flexShrink = '0';
    this.container.appendChild(this.pathbar);
  }

  private setupCanvas(): void {
    if (!this.container) return;
    
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.cursor = 'pointer';
    this.canvas.style.flexGrow = '1';
    
    this.updateCanvasSize();
    this.container.appendChild(this.canvas);
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
    this.tooltip.style.border = '1px solid #555';
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
      .paddingTop((d: any) => d.children ? 32 : 2)
      .paddingInner(1)
      .paddingOuter(2)
      .paddingRight(2)
      .paddingBottom(2)
      .paddingLeft(2)
      .round(true);
    
    treemap(currentHierarchy);
    this.nodes = currentHierarchy.descendants();
    
    this.context.clearRect(0, 0, width, height);
    this.updatePathbar();
    
    this.nodes.forEach((node: any) => {
      if (!node.parent) return;
      
      const nodeWidth = node.x1 - node.x0;
      const nodeHeight = node.y1 - node.y0;
      
      if (nodeWidth < 2 || nodeHeight < 2) return;
      
      this.renderNode(node, nodeWidth, nodeHeight);
    });
  }

  private renderNode(node: any, width: number, height: number): void {
    if (!this.context) return;
    
    const isLeaf = !node.children || node.children.length === 0;
    const data = isLeaf ? node.data.data as MarketData : node.data;
    const change = isLeaf ? (data?.priceChangePct || 0) : this.calculateSectorChange(node);
    
    this.context.fillStyle = getColorForChange(change);
    this.context.fillRect(node.x0, node.y0, width, height);
    
    this.context.strokeStyle = '#2C3E50';
    this.context.lineWidth = 1;
    this.context.strokeRect(node.x0, node.y0, width, height);
    
    if (width > 30 && height > 20) {
      this.renderNodeText(node, width, height, isLeaf, change);
    }
  }

  private renderNodeText(node: any, width: number, height: number, isLeaf: boolean, change: number): void {
    if (!this.context) return;
    
    // Skip text if too small
    if (width < 80 || height < 60) {
      return;
    }

    this.context.save();
    this.context.fillStyle = '#fff';
    this.context.textAlign = 'left';
    this.context.textBaseline = 'top';

    // Add padding from edges
    const padding = 6;
    const textX = node.x0 + padding;
    const textY = node.y0 + padding;
    const maxWidth = width - (padding * 2);
    const maxHeight = height - (padding * 2);

    if (isLeaf) {
      // Company financial information
      const ticker = node.data.ticker || '';
      const name = node.data.data?.nameEng || ticker;
      const price = Number(node.data.data?.priceLastSale) || 0;
      const change = Number(node.data.data?.priceChangePct) || 0;
      const marketCap = Number(node.data.data?.marketCap) || 0;

      let currentY = textY;
      const lineHeight = 16;

      // Ticker symbol (bold, larger)
      this.context.font = 'bold 14px Arial';
      this.drawWrappedText(ticker, textX, currentY, maxWidth, lineHeight, 1);
      currentY += lineHeight + 2;

      // Company name (smaller)
      if (height > 80) {
        this.context.font = '11px Arial';
        const nameLines = this.drawWrappedText(name, textX, currentY, maxWidth, 14, 2);
        currentY += (nameLines * 14) + 2;
      }

      // Price and change
      if (height > 100) {
        this.context.font = '12px Arial';
        const priceText = `${this.formatCurrency(price)}`;
        const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        this.drawWrappedText(`${priceText} (${changeText})`, textX, currentY, maxWidth, lineHeight, 1);
        currentY += lineHeight + 2;
      }

      // Market cap
      if (height > 120) {
        this.context.fillStyle = '#fff';
        this.context.font = '11px Arial';
        const capText = `Cap: ${this.formatCurrency(marketCap)}`;
        this.drawWrappedText(capText, textX, currentY, maxWidth, 14, 1);
      }
    } else {
      // Sector header text
      const sectorName = node.data.name || '';
      this.context.font = 'bold 14px Arial';
      this.drawWrappedText(sectorName, textX, textY, maxWidth, 18, 1);
    }

    this.context.restore();
  }

  private drawWrappedText(text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): number {
    const context = this.context;
    if (!context) return 0;
    
    const words = text.split(' ');
    let line = '';
    let lineCount = 0;
    let currentY = y;

    for (let i = 0; i < words.length && lineCount < maxLines; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = context.measureText(testLine);
      
      if (metrics.width > maxWidth && line !== '') {
        // Draw current line
        context.fillText(line.trim(), x, currentY);
        lineCount++;
        currentY += lineHeight;
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }

    // Draw last line if within limits
    if (line.trim() && lineCount < maxLines) {
      context.fillText(line.trim(), x, currentY);
      lineCount++;
    }

    return lineCount;
  }

  private formatCurrency(value: number): string {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  }

  private calculateSectorChange(sectorNode: any): number {
    if (!sectorNode.children || sectorNode.children.length === 0) return 0;
    
    const changes = sectorNode.children
      .map((child: any) => child.data.data?.priceChangePct || 0)
      .filter((change: number) => change !== null && !isNaN(change));
    
    if (changes.length === 0) return 0;
    
    return changes.reduce((sum: number, change: number) => sum + change, 0) / changes.length;
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
    
    const isPortfolioMode = localStorage.getItem('filterCsv') !== null;
    
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
      
      const sectorTotalValue = sectorChildren.reduce((sum, child) => sum + child.value, 0);
      
      children.push({
        ticker: sectorName,
        name: sectorName,
        value: sectorTotalValue,
        change: this.calculateSectorAverageChange(sectorChildren),
        color: '#666',
        children: sectorChildren,
      });
    });
    
    return {
      ticker: 'root',
      name: isPortfolioMode ? 'Portfolio' : 'Market',
      value: 0,
      change: 0,
      color: '#666',
      children,
    };
  }

  private calculateSectorAverageChange(children: TreemapNode[]): number {
    const validChanges = children
      .map(child => child.change)
      .filter(change => change !== null && !isNaN(change));
    
    if (validChanges.length === 0) return 0;
    return validChanges.reduce((sum, change) => sum + change, 0) / validChanges.length;
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
      if (node && node.data) {
        if (node.children && node.children.length > 0) {
          this.drillTo(node.data);
        } else if (node.data.data) {
          this.showCompanyOverlay(node.data.data as MarketData);
        }
      }
    });
    
    this.canvas.addEventListener('mousemove', (event) => {
      const node = this.getNodeAtPosition(event);
      if (node && node.data) {
        const isLeaf = !node.children || node.children.length === 0;
        if (isLeaf && node.data.data) {
          this.showStockTooltip(node.data.data as MarketData, event);
          this.canvas!.style.cursor = 'pointer';
        } else {
          this.canvas!.style.cursor = 'pointer';
          this.hideTooltip();
        }
      } else {
        this.canvas!.style.cursor = 'default';
        this.hideTooltip();
      }
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.hideTooltip();
      this.canvas!.style.cursor = 'default';
    });
  }

  private getNodeAtPosition(event: MouseEvent): any {
    if (!this.canvas) return null;
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX / window.devicePixelRatio;
    const y = (event.clientY - rect.top) * scaleY / window.devicePixelRatio;
    
    return this.nodes.find(node => {
      if (!node.parent) return false;
      return node.x0 <= x && x <= node.x1 && node.y0 <= y && y <= node.y1;
    });
  }

  private drillTo(node: TreemapNode): void {
    this.currentRoot = node;
    this.renderTreemap();
  }

  private showStockTooltip(data: MarketData, event: MouseEvent): void {
    if (!this.tooltip) return;
    
    const config = getConfig();
    const currencySign = this.getCurrencySign(config.currency);
    const isPortfolio = localStorage.getItem('finmap-portfolio-mode') === 'true';
    
    let portfolioInfo = '';
    if (isPortfolio) {
      const storedFilters = localStorage.getItem('finmap-filters');
      if (storedFilters) {
        const filters = JSON.parse(storedFilters);
        const tickerIndex = filters.tickers?.indexOf(data.ticker);
        if (tickerIndex >= 0 && filters.amounts?.[tickerIndex]) {
          const amount = filters.amounts[tickerIndex];
          const portfolioValue = data.priceLastSale * amount;
          portfolioInfo = `<div>Holdings: ${amount.toLocaleString()} shares</div><div>Portfolio Value: ${currencySign}${formatNumber(portfolioValue)}</div>`;
        }
      }
    }
    
    this.tooltip.innerHTML = `
      <div><strong>${data.ticker}</strong></div>
      <div>${data.nameEng}</div>
      <div>Price: ${currencySign}${data.priceLastSale.toFixed(2)}</div>
      <div>Change: ${formatPercent(data.priceChangePct || 0)}</div>
      <div>Market Cap: ${currencySign}${formatNumber(data.marketCap)}M</div>
      <div>Volume: ${formatNumber(data.volume)}</div>
      <div>Value: ${currencySign}${formatNumber(data.value)}M</div>
      <div>Trades: ${formatNumber(data.numTrades)}</div>
      <div>Exchange: ${data.exchange}</div>
      <div>Industry: ${data.industry}</div>
      ${portfolioInfo}
    `;
    
    this.positionTooltip(event);
    this.tooltip.style.opacity = '1';
  }

  private positionTooltip(event: MouseEvent): void {
    if (!this.tooltip) return;
    
    this.tooltip.style.left = `${event.clientX + 10}px`;
    this.tooltip.style.top = `${event.clientY - 10}px`;
    this.tooltip.style.opacity = '1';
    
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (tooltipRect.right > viewportWidth) {
      this.tooltip.style.left = `${event.clientX - tooltipRect.width - 10}px`;
    }
    
    if (tooltipRect.bottom > viewportHeight) {
      this.tooltip.style.top = `${event.clientY - tooltipRect.height - 10}px`;
    }
  }

  private getCurrencySign(currency: string): string {
    switch (currency) {
      case 'USD': return '$';
      case 'RUB': return '₽';
      case 'GBP': return '£';
      case 'TRY': return '₺';
      default: return '$';
    }
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
    }
  }

  private showCompanyOverlay(data: MarketData): void {
    this.hideTooltip();
    
    let overlay = document.getElementById('company-overlay') as HTMLElement;
    if (!overlay) {
      overlay = this.createOverlay();
    }
    
    this.populateOverlay(overlay, data);
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = 'company-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    const content = document.createElement('div');
    content.style.backgroundColor = '#2C3E50';
    content.style.color = 'white';
    content.style.padding = '20px';
    content.style.borderRadius = '8px';
    content.style.width = '90%';
    content.style.maxWidth = '800px';
    content.style.maxHeight = '80%';
    content.style.overflow = 'auto';
    content.style.position = 'relative';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '15px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => this.hideOverlay();
    
    const contentArea = document.createElement('div');
    contentArea.id = 'overlay-content';
    
    content.appendChild(closeBtn);
    content.appendChild(contentArea);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.hideOverlay();
      }
    };
    
    return overlay;
  }

  private populateOverlay(overlay: HTMLElement, data: MarketData): void {
    const contentArea = overlay.querySelector('#overlay-content') as HTMLElement;
    const config = getConfig();
    const currencySign = this.getCurrencySign(config.currency);
    
    contentArea.innerHTML = `
      <div>
        <h2>${data.ticker} - ${data.nameEng}</h2>
        <div style="margin: 20px 0;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h3>Price Information</h3>
              <p>Current Price: ${currencySign}${data.priceLastSale.toFixed(2)}</p>
              <p>Open Price: ${currencySign}${data.priceOpen.toFixed(2)}</p>
              <p>Change: ${formatPercent(data.priceChangePct || 0)}</p>
            </div>
            <div>
              <h3>Market Data</h3>
              <p>Market Cap: ${currencySign}${formatNumber(data.marketCap)}M</p>
              <p>Volume: ${formatNumber(data.volume)}</p>
              <p>Value: ${currencySign}${formatNumber(data.value)}M</p>
              <p>Trades: ${formatNumber(data.numTrades)}</p>
            </div>
          </div>
          <div style="margin-top: 20px;">
            <h3>Company Details</h3>
            <p>Exchange: ${data.exchange}</p>
            <p>Country: ${data.country}</p>
            <p>Sector: ${data.sector}</p>
            <p>Industry: ${data.industry}</p>
            <p>Listed Since: ${data.listedFrom}</p>
            ${data.listedTill ? `<p>Listed Until: ${data.listedTill}</p>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private hideOverlay(): void {
    const overlay = document.getElementById('company-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  public searchAndHighlight(query: string): void {
    if (!this.nodes || !query) return;
    
    const searchQuery = query.toLowerCase();
    const matchingNodes = this.nodes.filter(node => 
      !node.children && node.data.data && (
        node.data.ticker.toLowerCase().includes(searchQuery) ||
        node.data.name.toLowerCase().includes(searchQuery)
      )
    );
    
    if (matchingNodes.length > 0) {
      const node = matchingNodes[0];
      if (node.data.data) {
        this.showCompanyOverlay(node.data.data as MarketData);
      }
    }
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
