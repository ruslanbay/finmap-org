import { getConfig } from './config.js';
import { formatNumber, formatPercent, getColorForChange } from './utils.js';
export class D3TreemapRenderer {
    container = null;
    canvas = null;
    context = null;
    pathbar = null;
    tooltip = null;
    currentData = [];
    hierarchy = null;
    currentRoot = null;
    rootNode = null;
    nodes = [];
    resizeObserver = null;
    render(data, container) {
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
    setupCanvas() {
        if (!this.container)
            return;
        this.container.innerHTML = '';
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'calc(100vh - 110px)';
        this.canvas.style.display = 'block';
        this.canvas.style.cursor = 'pointer';
        this.updateCanvasSize();
        this.container.appendChild(this.canvas);
    }
    setupPathbar() {
        if (!this.container)
            return;
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
    setupTooltip() {
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
    updateCanvasSize() {
        if (!this.canvas || !this.container)
            return;
        const rect = this.container.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * devicePixelRatio;
        this.canvas.height = (rect.height - 40) * devicePixelRatio;
        this.context = this.canvas.getContext('2d');
        if (this.context) {
            this.context.scale(devicePixelRatio, devicePixelRatio);
        }
    }
    setupResizeObserver() {
        if (!this.container)
            return;
        this.resizeObserver = new ResizeObserver(() => {
            this.updateCanvasSize();
            this.renderTreemap();
        });
        this.resizeObserver.observe(this.container);
    }
    buildHierarchy() {
        const hierarchyData = this.prepareHierarchyData(this.currentData);
        this.hierarchy = d3.hierarchy(hierarchyData)
            .sum((d) => d.children ? 0 : this.getValueForDataType(d))
            .sort((a, b) => (b.value || 0) - (a.value || 0));
        this.rootNode = this.hierarchy.data;
        this.currentRoot = this.rootNode;
        this.addParentReferences(this.hierarchy);
    }
    addParentReferences(node) {
        if (node.children) {
            node.children.forEach((child) => {
                child.data.parent = node.data;
                this.addParentReferences(child);
            });
        }
    }
    renderTreemap() {
        if (!this.canvas || !this.context || !this.container || !this.hierarchy)
            return;
        const rect = this.container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height - 40;
        const currentHierarchy = this.currentRoot === this.rootNode
            ? this.hierarchy
            : d3.hierarchy(this.currentRoot)
                .sum((d) => d.children ? 0 : this.getValueForDataType(d))
                .sort((a, b) => (b.value || 0) - (a.value || 0));
        const treemap = d3.treemap()
            .size([width, height])
            .paddingTop((d) => d.parent && d.children ? 24 : 0)
            .paddingRight(1)
            .paddingBottom(1)
            .paddingLeft(1)
            .round(true);
        treemap(currentHierarchy);
        this.nodes = currentHierarchy.descendants();
        this.context.clearRect(0, 0, width, height);
        this.updatePathbar();
        this.nodes.forEach((node) => {
            if (!node.parent)
                return;
            const width = node.x1 - node.x0;
            const height = node.y1 - node.y0;
            if (width < 1 || height < 1)
                return;
            if (node.children) {
                this.renderParentNode(node, width, height);
            }
            else {
                this.renderLeafNode(node, width, height);
            }
        });
    }
    renderParentNode(node, width, height) {
        if (!this.context)
            return;
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
    renderLeafNode(node, width, height) {
        if (!this.context)
            return;
        const data = node.data.data;
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
    getTruncatedText(text, maxWidth) {
        if (!this.context)
            return text;
        let truncated = text;
        while (this.context.measureText(truncated).width > maxWidth && truncated.length > 3) {
            truncated = truncated.slice(0, -1);
        }
        return truncated !== text ? truncated + '...' : truncated;
    }
    updatePathbar() {
        if (!this.pathbar || !this.currentRoot)
            return;
        const path = this.getPathToRoot(this.currentRoot);
        this.pathbar.innerHTML = '';
        path.forEach((item, index) => {
            if (index > 0) {
                const separator = document.createElement('span');
                separator.textContent = ' > ';
                separator.style.color = '#888';
                separator.style.margin = '0 5px';
                this.pathbar.appendChild(separator);
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
            this.pathbar.appendChild(link);
        });
    }
    getPathToRoot(node) {
        const path = [];
        let current = node;
        while (current) {
            path.unshift({
                name: current.name || 'Market',
                node: current
            });
            current = current.parent || null;
        }
        return path;
    }
    prepareHierarchyData(data) {
        const securities = data.filter(item => item.type === 'stock' || item.type === 'etf');
        const sectors = d3.group(securities, (d) => d.sector || 'Other');
        const children = [];
        sectors.forEach((sectorSecurities, sectorName) => {
            const sectorChildren = sectorSecurities.map((security) => ({
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
                change: d3.mean(sectorChildren, (d) => d.change) || 0,
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
    getValueForDataType(item) {
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
    setupInteractions() {
        if (!this.canvas)
            return;
        this.canvas.addEventListener('click', (event) => {
            const node = this.getNodeAtPosition(event);
            if (node) {
                if (node.children) {
                    this.drillTo(node.data);
                }
                else {
                    this.showCompanyOverlay(node.data.data);
                }
            }
        });
        this.canvas.addEventListener('mousemove', (event) => {
            const node = this.getNodeAtPosition(event);
            if (node && !node.children) {
                this.showTooltip(node.data.data, event);
            }
            else {
                this.hideTooltip();
            }
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
    }
    getNodeAtPosition(event) {
        if (!this.canvas)
            return null;
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return this.nodes.find(node => node.x0 <= x && x <= node.x1 && node.y0 <= y && y <= node.y1);
    }
    drillTo(node) {
        this.currentRoot = node;
        this.renderTreemap();
    }
    showTooltip(data, event) {
        if (!this.tooltip)
            return;
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
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
    }
    showCompanyOverlay(data) {
        console.log('Show company overlay for:', data.ticker);
    }
    destroy() {
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
export class D3HistogramRenderer {
    container = null;
    svg = null;
    currentData = [];
    render(data, container) {
        this.container = container;
        this.currentData = data;
        this.setupSVG();
        this.renderHistogram();
    }
    setupSVG() {
        if (!this.container)
            return;
        this.container.innerHTML = '';
        const rect = this.container.getBoundingClientRect();
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${rect.width} ${rect.height}`);
    }
    renderHistogram() {
        if (!this.svg || !this.container)
            return;
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
            .domain([0, d3.max(histogramData, (d) => d.value) || 0])
            .range([height, 0]);
        const g = this.svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        g.selectAll('.bar')
            .data(histogramData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', (d) => xScale(d.sector) || 0)
            .attr('width', xScale.bandwidth())
            .attr('y', (d) => yScale(d.value))
            .attr('height', (d) => height - yScale(d.value))
            .attr('fill', (d) => getColorForChange(d.value));
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));
        g.append('g')
            .call(d3.axisLeft(yScale));
    }
    prepareHistogramData() {
        const config = getConfig();
        const sectors = d3.group(this.currentData, (d) => d.sector || 'Other');
        const result = [];
        sectors.forEach((securities, sector) => {
            const value = d3.sum(securities, (d) => {
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
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
