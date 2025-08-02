import { getConfig } from './config.js';
import { formatPercent, getColorForChange } from './utils.js';
export class D3TreemapRenderer {
    container = null;
    canvas = null;
    context = null;
    currentData = [];
    tooltip = null;
    render(data, container) {
        this.container = container;
        this.currentData = data;
        this.setupCanvas();
        this.setupTooltip();
        this.renderTreemap();
        this.setupInteractions();
    }
    setupCanvas() {
        if (!this.container)
            return;
        this.container.innerHTML = '';
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'calc(100vh - 70px)';
        this.canvas.style.display = 'block';
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.context = this.canvas.getContext('2d');
        if (this.context) {
            this.context.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
        this.container.appendChild(this.canvas);
    }
    setupTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.style.position = 'absolute';
        this.tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
        this.tooltip.style.color = 'white';
        this.tooltip.style.padding = '8px';
        this.tooltip.style.borderRadius = '4px';
        this.tooltip.style.fontSize = '12px';
        this.tooltip.style.pointerEvents = 'none';
        this.tooltip.style.opacity = '0';
        this.tooltip.style.transition = 'opacity 0.2s';
        this.tooltip.style.zIndex = '1000';
        document.body.appendChild(this.tooltip);
    }
    renderTreemap() {
        if (!this.canvas || !this.context || !this.container)
            return;
        const config = getConfig();
        const filteredData = this.filterData();
        const hierarchyData = this.prepareHierarchyData(filteredData);
        const rect = this.container.getBoundingClientRect();
        const root = d3.hierarchy(hierarchyData)
            .sum((d) => this.getValueForDataType(d))
            .sort((a, b) => (b.value || 0) - (a.value || 0));
        const treemap = d3.treemap()
            .size([rect.width, rect.height])
            .padding(1);
        treemap(root);
        this.context.clearRect(0, 0, rect.width, rect.height);
        root.leaves().forEach((node) => {
            if (node.x1 && node.y1 && node.x0 !== undefined && node.y0 !== undefined) {
                const width = node.x1 - node.x0;
                const height = node.y1 - node.y0;
                if (width > 2 && height > 2) {
                    const change = node.data.change || 0;
                    this.context.fillStyle = getColorForChange(change);
                    this.context.fillRect(node.x0, node.y0, width, height);
                    if (width > 40 && height > 20) {
                        this.context.fillStyle = '#fff';
                        this.context.font = `${Math.min(width / 8, height / 4, 14)}px sans-serif`;
                        this.context.textAlign = 'center';
                        this.context.textBaseline = 'middle';
                        const centerX = node.x0 + width / 2;
                        const centerY = node.y0 + height / 2;
                        this.context.fillText(node.data.ticker, centerX, centerY - 5);
                        this.context.fillText(formatPercent(change), centerX, centerY + 8);
                    }
                }
            }
        });
    }
    filterData() {
        return this.currentData;
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
        this.canvas.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
        this.canvas.addEventListener('click', (event) => {
            this.handleClick(event);
        });
    }
    handleMouseMove(event) {
        if (!this.tooltip || !this.canvas)
            return;
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this.tooltip.style.left = `${event.clientX + 10}px`;
        this.tooltip.style.top = `${event.clientY - 10}px`;
        this.tooltip.style.opacity = '1';
        this.tooltip.innerHTML = `
      <div>Position: ${Math.round(x)}, ${Math.round(y)}</div>
      <div>Click to drill down</div>
    `;
    }
    handleClick(event) {
    }
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
    }
    destroy() {
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
