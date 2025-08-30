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
    isTransitioning = false;
    colorScale = d3.scaleLinear()
        .domain([-3, 0, 3])
        .range(['rgb(236, 48, 51)', 'rgb(64, 68, 82)', 'rgb(42, 202, 85)'])
        .clamp(true)
        .interpolate(d3.interpolateRgb);
    render(data, container) {
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
    setupContainer() {
        if (!this.container)
            return;
        d3.select(this.container)
            .selectAll('*')
            .remove();
        d3.select(this.container)
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('height', '100%');
    }
    setupPathbar() {
        if (!this.container)
            return;
        this.pathbar = d3.select(this.container)
            .append('div')
            .style('height', '24px')
            .style('background-color', '#414554')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('padding', '0 10px')
            .style('color', 'white')
            .style('font-size', '14px')
            .style('border-bottom', '1px solid #555')
            .style('overflow-x', 'auto')
            .style('white-space', 'nowrap')
            .style('flex-shrink', '0')
            .node();
    }
    setupCanvas() {
        if (!this.container)
            return;
        this.canvas = d3.select(this.container)
            .append('canvas')
            .style('width', '100%')
            .style('height', '100%')
            .style('display', 'block')
            .style('cursor', 'pointer')
            .style('flex-grow', '1')
            .node();
        this.updateCanvasSize();
    }
    setupTooltip() {
        this.tooltip = d3.select('body')
            .append('div')
            .style('position', 'absolute')
            .style('background', 'white')
            .style('color', 'rgb(68, 68, 68)')
            .style('border', '1px solid rgb(214, 214, 214)')
            .style('border-radius', '2px')
            .style('font-family', '"Open Sans", verdana, arial, sans-serif')
            .style('font-size', '12px')
            .style('font-weight', 'normal')
            .style('line-height', '1.3')
            .style('white-space', 'nowrap')
            .style('padding', '4px 6px')
            .style('pointer-events', 'none')
            .style('opacity', '0')
            .style('transition', 'opacity 0.15s ease-out')
            .style('z-index', '1001')
            .style('box-shadow', '0px 3px 8px rgba(0, 0, 0, 0.14)')
            .style('margin', '0')
            .style('text-align', 'left')
            .style('direction', 'ltr')
            .style('max-width', 'none')
            .style('word-wrap', 'normal')
            .node();
    }
    updateCanvasSize() {
        if (!this.canvas || !this.container)
            return;
        const rect = this.container.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;
        // Account for footbar height (approximately 25px) plus pathbar (24px)
        const footbarHeight = 25;
        const pathbarHeight = 24;
        this.canvas.width = rect.width * devicePixelRatio;
        this.canvas.height = (rect.height - pathbarHeight - footbarHeight) * devicePixelRatio;
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
        this.rootNode = this.hierarchy;
        this.currentRoot = this.hierarchy;
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
        // Account for both pathbar height (24px) and footer height (25px)
        const pathbarHeight = 24;
        const footerHeight = 25;
        const height = rect.height - pathbarHeight - footerHeight;
        const currentHierarchy = this.currentRoot === this.rootNode
            ? this.hierarchy
            : d3.hierarchy(this.currentRoot)
                .sum((d) => d.children ? 0 : this.getValueForDataType(d))
                .sort((a, b) => (b.value || 0) - (a.value || 0));
        const treemap = d3.treemap()
            .size([width, height])
            .paddingTop((d) => d.children ? 20 : 2)
            .paddingInner(1)
            .paddingOuter(2)
            .paddingRight(2)
            .paddingBottom(2)
            .paddingLeft(2)
            .round(true);
        treemap(currentHierarchy);
        this.nodes = currentHierarchy.descendants();
        // Adjust child node positions to make room for sector headers
        this.adjustNodesForSectorHeaders();
        this.context.clearRect(0, 0, width, height);
        this.updatePathbar();
        this.nodes.forEach((node) => {
            if (!node.parent)
                return;
            const nodeWidth = node.x1 - node.x0;
            const nodeHeight = node.y1 - node.y0;
            if (nodeWidth < 2 || nodeHeight < 2)
                return;
            this.renderNode(node, nodeWidth, nodeHeight);
        });
    }
    adjustNodesForSectorHeaders() {
        const sectorHeaderHeight = 20;
        this.nodes.forEach((node) => {
            if (node.children && node.children.length > 0) {
                // This is a sector node - adjust only its leaf children (not sector children)
                const sectorTop = node.y0;
                const sectorHeight = node.y1 - node.y0;
                const availableHeight = sectorHeight - sectorHeaderHeight;
                if (availableHeight > 0) {
                    node.children.forEach((child) => {
                        // Only adjust leaf nodes (individual stocks), not sector nodes
                        const isLeafChild = !child.children || child.children.length === 0;
                        if (isLeafChild) {
                            // Move leaf child down by header height
                            const childHeight = child.y1 - child.y0;
                            const newChildHeight = (childHeight / sectorHeight) * availableHeight;
                            child.y0 = sectorTop + sectorHeaderHeight + ((child.y0 - sectorTop) / sectorHeight) * availableHeight;
                            child.y1 = child.y0 + newChildHeight;
                        }
                    });
                }
            }
        });
    }
    renderNode(node, width, height) {
        if (!this.context)
            return;
        const isLeaf = !node.children || node.children.length === 0;
        const data = isLeaf ? node.data.data : node.data;
        // Use sector's own price change if available, otherwise calculate from children
        const change = isLeaf ? (data?.priceChangePct || 0) : (data?.priceChangePct !== undefined ? data.priceChangePct : this.calculateSectorChange(node));
        this.context.fillStyle = this.colorScale(change);
        this.context.fillRect(node.x0, node.y0, width, height);
        this.context.strokeStyle = '#2C3E50';
        this.context.lineWidth = 1;
        this.context.strokeRect(node.x0, node.y0, width, height);
        if (width > 30 && height > 20) {
            this.renderNodeText(node, width, height, isLeaf, change);
        }
    }
    renderNodeText(node, width, height, isLeaf, change) {
        if (!this.context)
            return;
        // Skip text if too small
        // if (width < 40 || height < 20) {
        //   return;
        // }
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
            // Calculate proportional font size based on node area (like Plotly.js)
            const nodeArea = width * height;
            const baseFontSize = Math.max(2, Math.min(12, Math.sqrt(nodeArea) / 15));
            // Company financial information
            const ticker = node.data.ticker || '';
            const name = node.data.data?.nameEng || ticker;
            const price = Number(node.data.data?.priceLastSale) || 0;
            const change = Number(node.data.data?.priceChangePct) || 0;
            const marketCap = Number(node.data.data?.marketCap) || 0;
            let currentY = textY;
            const lineHeight = Math.round(baseFontSize * 1.2);
            // Ticker symbol (bold, same size as other text)
            this.context.font = `bold ${baseFontSize}px "Open Sans", verdana, arial, sans-serif`;
            this.drawWrappedText(ticker, textX, currentY, maxWidth, lineHeight, 1);
            currentY += lineHeight + 2;
            // Company name (same size as ticker, not bold)
            if (height > baseFontSize * 5) {
                this.context.font = `${baseFontSize}px "Open Sans", verdana, arial, sans-serif`;
                const nameLines = this.drawWrappedText(name, textX, currentY, maxWidth, lineHeight, 2);
                currentY += (nameLines * lineHeight) + 2;
            }
            // Price and change (same size)
            if (height > baseFontSize * 7) {
                this.context.font = `${baseFontSize}px "Open Sans", verdana, arial, sans-serif`;
                const priceText = `${this.formatCurrency(price)}`;
                const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                this.drawWrappedText(`${priceText} (${changeText})`, textX, currentY, maxWidth, lineHeight, 1);
                currentY += lineHeight + 2;
            }
            // Market cap (same size)
            if (height > baseFontSize * 9) {
                this.context.font = `${baseFontSize}px "Open Sans", verdana, arial, sans-serif`;
                const capText = `Cap: ${this.formatCurrency(marketCap)}M`;
                this.drawWrappedText(capText, textX, currentY, maxWidth, lineHeight, 1);
            }
        }
        else {
            // Sector header text with specific styling
            const sectorName = node.data.name || '';
            this.context.font = '12px "Open Sans", verdana, arial, sans-serif';
            this.context.fillStyle = '#ffffff';
            this.context.textAlign = 'left';
            this.context.textBaseline = 'top';
            // Add text shadow effect for better readability
            this.context.shadowColor = 'rgba(0, 0, 0, 0.7)';
            this.context.shadowBlur = 2;
            this.context.shadowOffsetX = 1;
            this.context.shadowOffsetY = 1;
            this.drawWrappedText(sectorName, textX, textY, maxWidth, 20, 1);
            // Reset shadow
            this.context.shadowColor = 'transparent';
            this.context.shadowBlur = 0;
            this.context.shadowOffsetX = 0;
            this.context.shadowOffsetY = 0;
        }
        this.context.restore();
    }
    drawWrappedText(text, x, y, maxWidth, lineHeight, maxLines) {
        const context = this.context;
        if (!context)
            return 0;
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
            }
            else {
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
    formatCurrency(value) {
        const formatCurrency = d3.format('$,.1~s');
        return formatCurrency(value).replace('G', 'B');
    }
    calculateSectorChange(sectorNode) {
        if (!sectorNode.children || sectorNode.children.length === 0)
            return 0;
        const changes = sectorNode.children
            .map((child) => child.data.data?.priceChangePct || 0)
            .filter((change) => !isNaN(change));
        return changes.length > 0 ? d3.mean(changes) || 0 : 0;
    }
    updatePathbar() {
        if (!this.pathbar || !this.currentRoot)
            return;
        const path = this.getPathToRoot(this.currentRoot);
        const pathbarSelection = d3.select(this.pathbar);
        pathbarSelection.selectAll('*').remove();
        path.forEach((item, index) => {
            if (index > 0) {
                pathbarSelection.append('span')
                    .style('color', '#888')
                    .style('margin', '0 5px')
                    .text(' > ');
            }
            const isLast = index === path.length - 1;
            const link = pathbarSelection.append('a')
                .style('color', isLast ? '#ccc' : '#fff')
                .style('text-decoration', 'none')
                .style('cursor', isLast ? 'default' : 'pointer')
                .style('padding', '0px')
                .text(item.name);
            if (!isLast) {
                link
                    .on('click', () => this.drillTo(item.node))
                    .on('mouseenter', (event) => {
                    d3.select(event.target).style('text-decoration', 'underline');
                })
                    .on('mouseleave', (event) => {
                    d3.select(event.target).style('text-decoration', 'none');
                });
            }
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
        const isPortfolioMode = localStorage.getItem('filterCsv') !== null;
        const children = [];
        sectors.forEach((sectorSecurities, sectorName) => {
            const sectorChildren = sectorSecurities.map((security) => ({
                ticker: security.ticker,
                name: security.nameEng,
                value: this.getValueForDataType(security),
                change: security.priceChangePct || 0,
                data: security,
            }));
            const sectorTotalValue = sectorChildren.reduce((sum, child) => sum + child.value, 0);
            children.push({
                ticker: sectorName,
                name: sectorName,
                value: sectorTotalValue,
                change: this.calculateSectorAverageChange(sectorChildren),
                children: sectorChildren,
            });
        });
        return {
            ticker: 'root',
            name: isPortfolioMode ? 'Portfolio' : 'Market',
            value: 0,
            change: 0,
            children,
        };
    }
    calculateSectorAverageChange(children) {
        const validChanges = children
            .map(child => child.change)
            .filter(change => !isNaN(change));
        return validChanges.length > 0 ? d3.mean(validChanges) || 0 : 0;
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
        const canvasSelection = d3.select(this.canvas);
        this.canvas.addEventListener('click', (event) => {
            if (this.isTransitioning)
                return;
            const node = this.getNodeAtPosition(event);
            if (!node?.data)
                return;
            if (node.children?.length > 0) {
                this.drillTo(node.data);
            }
            else if (node.data.data) {
                this.showCompanyOverlay(node.data.data);
            }
        });
        this.canvas.addEventListener('mouseenter', () => {
            if (!this.isTransitioning) {
                canvasSelection
                    .transition()
                    .duration(200)
                    .style('filter', 'brightness(1.05)');
            }
        });
        this.canvas.addEventListener('mouseleave', () => {
            canvasSelection
                .transition()
                .duration(200)
                .style('filter', 'brightness(1)')
                .style('cursor', 'default');
            this.hideTooltip();
        });
        this.canvas.addEventListener('mousemove', (event) => {
            if (this.isTransitioning)
                return;
            const node = this.getNodeAtPosition(event);
            if (!node?.data) {
                this.hideTooltip();
                canvasSelection.style('cursor', 'default');
                return;
            }
            const isLeaf = !node.children?.length;
            const tooltipData = isLeaf ? node.data.data : node.data;
            if (tooltipData) {
                this.showTooltip(tooltipData, event, node);
                canvasSelection.style('cursor', 'pointer');
            }
        });
    }
    getNodeAtPosition(event) {
        if (!this.canvas || !this.nodes)
            return null;
        const rect = this.canvas.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;
        // Calculate mouse position relative to canvas (original working calculation)
        const x = (event.clientX - rect.left) * (this.canvas.width / rect.width) / devicePixelRatio;
        const y = (event.clientY - rect.top) * (this.canvas.height / rect.height) / devicePixelRatio;
        // Find the node at this position by checking rendered nodes in reverse order
        // (so we get the topmost/deepest node)
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            if (node?.x0 <= x && x <= node?.x1 && node?.y0 <= y && y <= node?.y1) {
                return node;
            }
        }
        return null;
    }
    drillTo(node) {
        if (this.isTransitioning)
            return;
        this.isTransitioning = true;
        this.hideTooltip();
        const previousRoot = this.currentRoot;
        this.currentRoot = node;
        if (this.canvas) {
            d3.select(this.canvas)
                .style('opacity', 1)
                .transition()
                .duration(250)
                .style('opacity', 0.3)
                .transition()
                .duration(250)
                .style('opacity', 1)
                .on('end', () => {
                this.isTransitioning = false;
            });
        }
        setTimeout(() => {
            this.renderTreemap();
        }, 250);
    }
    showTooltip(data, event, node) {
        if (!this.tooltip)
            return;
        const config = getConfig();
        const formatCurrency = this.getCurrencyFormatter(config.currency);
        const isPortfolio = localStorage.getItem('finmap-portfolio-mode') === 'true';
        // Get the node to access its properties if not provided
        const targetNode = node || this.getNodeAtPosition(event);
        const change = data?.priceChangePct || 0;
        const nodeColor = this.colorScale(change);
        // Check if this is a sector (has children) or individual stock
        const isSector = targetNode && targetNode.children && targetNode.children.length > 0;
        // Calculate percentages
        const percentParent = targetNode && targetNode.parent ? (targetNode.value || 0) / (targetNode.parent.value || 1) * 100 : 100;
        const percentRoot = targetNode && this.rootNode ? (targetNode.value || 0) / (this.rootNode.value || 1) * 100 : 100;
        const sectorItemCount = isSector ? this.countLeafNodes(targetNode) : (targetNode && targetNode.parent ? this.countLeafNodes(targetNode.parent) : 1);
        let portfolioInfo = '';
        if (isPortfolio && !isSector) {
            const storedFilters = localStorage.getItem('finmap-filters');
            if (storedFilters) {
                const filters = JSON.parse(storedFilters);
                const tickerIndex = filters.tickers?.indexOf(data.ticker);
                if (tickerIndex >= 0 && filters.amounts?.[tickerIndex]) {
                    const amount = filters.amounts[tickerIndex];
                    const portfolioValue = (data.priceLastSale || 0) * amount;
                    portfolioInfo = `<div>Holdings: ${amount.toLocaleString()} shares</div><div>Portfolio Value: ${formatCurrency(portfolioValue)}</div>`;
                }
            }
        }
        // Set tooltip background to match tile color
        this.tooltip.style.background = nodeColor;
        this.tooltip.style.color = '#ffffff';
        this.tooltip.style.border = `2px solid white`;
        this.tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        this.tooltip.innerHTML = `
      <div style="margin-bottom: 4px;"><b>${data.ticker}</b></div>
      <div style="margin-bottom: 2px;">${data.nameEng}</div>
      <div style="margin-bottom: 2px;">${formatCurrency(data.priceLastSale || 0)} (${formatPercent(data.priceChangePct || 0)})</div>
      <div style="margin-bottom: 2px;">MarketCap: ${formatCurrency((data.marketCap || 0) * 1e6)}M</div>
      <div style="margin-bottom: 2px;">Volume: ${formatNumber(data.volume || 0)}</div>
      <div style="margin-bottom: 2px;">Value: ${formatCurrency((data.value || 0) * 1e6)}M</div>
      <div style="margin-bottom: 2px;">Trades: ${formatNumber(data.numTrades || 0)}</div>
      <div style="margin-bottom: 2px;">Country: ${data.country || 'N/A'}</div>
      <div style="margin-bottom: 2px;">Exchange: ${data.exchange || 'N/A'}</div>
      <div style="margin-bottom: 2px;">Listed Since: ${data.listedFrom || 'N/A'}</div>
      <div style="margin-bottom: 2px;">Industry: ${data.industry || 'N/A'}</div>
      <div style="margin-bottom: 2px;">% of Sector: ${percentParent.toFixed(2)}%</div>
      <div style="margin-bottom: 2px;">% of Total: ${percentRoot.toFixed(2)}%</div>
      <div style="margin-bottom: 2px;">Items per Sector: ${sectorItemCount}</div>
      ${portfolioInfo}
    `;
        this.positionTooltip(event);
        this.tooltip.style.opacity = '1';
    }
    countLeafNodes(node) {
        if (!node.children || node.children.length === 0) {
            return 1;
        }
        let count = 0;
        node.children.forEach((child) => {
            count += this.countLeafNodes(child);
        });
        return count;
    }
    positionTooltip(event) {
        if (!this.tooltip || !this.canvas)
            return;
        const [mouseX, mouseY] = d3.pointer(event);
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipSelection = d3.select(this.tooltip)
            .style('visibility', 'hidden')
            .style('opacity', '1');
        const { width: tooltipWidth, height: tooltipHeight } = this.tooltip.getBoundingClientRect();
        const offset = 12;
        const left = event.clientX + tooltipWidth + offset > viewportWidth
            ? event.clientX - tooltipWidth - offset
            : event.clientX + offset;
        const top = event.clientY + tooltipHeight + offset > viewportHeight
            ? event.clientY - tooltipHeight - offset
            : event.clientY + offset;
        tooltipSelection
            .style('visibility', 'visible')
            .style('left', `${Math.max(0, Math.min(left, viewportWidth - tooltipWidth))}px`)
            .style('top', `${Math.max(0, Math.min(top, viewportHeight - tooltipHeight))}px`)
            .style('opacity', '1');
    }
    getCurrencyFormatter(currency) {
        const currencyMap = {
            'USD': '$',
            'RUB': '₽',
            'GBP': '£',
            'TRY': '₺'
        };
        const symbol = currencyMap[currency] || '$';
        return d3.format(`${symbol},.2f`);
    }
    hideTooltip() {
        if (!this.tooltip)
            return;
        d3.select(this.tooltip)
            .transition()
            .duration(150)
            .style('opacity', '0')
            .on('end', () => {
            if (this.tooltip) {
                d3.select(this.tooltip)
                    .style('background', 'white')
                    .style('color', 'rgb(68, 68, 68)')
                    .style('border', '2px solid white')
                    .style('text-align', 'left');
            }
        });
    }
    showCompanyOverlay(data) {
        this.hideTooltip();
        let overlay = document.getElementById('company-overlay');
        if (!overlay) {
            overlay = this.createOverlay();
        }
        this.populateOverlay(overlay, data);
        d3.select(overlay)
            .style('display', 'flex')
            .style('opacity', '0')
            .transition()
            .duration(300)
            .style('opacity', '1');
        d3.select('body').style('overflow', 'hidden');
    }
    createOverlay() {
        const overlay = d3.select('body')
            .append('div')
            .attr('id', 'company-overlay')
            .style('position', 'fixed')
            .style('top', '0')
            .style('left', '0')
            .style('width', '100%')
            .style('height', '100%')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('z-index', '10000')
            .style('display', 'none')
            .style('align-items', 'center')
            .style('justify-content', 'center');
        const content = overlay
            .append('div')
            .style('background-color', '#2C3E50')
            .style('color', 'white')
            .style('padding', '20px')
            .style('border-radius', '8px')
            .style('width', '90%')
            .style('max-width', '800px')
            .style('max-height', '80%')
            .style('overflow', 'auto')
            .style('position', 'relative');
        content
            .append('button')
            .html('×')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('right', '15px')
            .style('background', 'none')
            .style('border', 'none')
            .style('color', 'white')
            .style('font-size', '24px')
            .style('cursor', 'pointer')
            .on('click', () => this.hideOverlay());
        content
            .append('div')
            .attr('id', 'overlay-content');
        overlay.on('click', (event) => {
            if (event.target === overlay.node())
                this.hideOverlay();
        });
        return overlay.node();
    }
    populateOverlay(overlay, data) {
        const contentArea = overlay.querySelector('#overlay-content');
        const config = getConfig();
        const formatCurrency = this.getCurrencyFormatter(config.currency);
        contentArea.innerHTML = `
      <div>
        <h2>${data.ticker} - ${data.nameEng}</h2>
        <div style="margin: 20px 0;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h3>Price Information</h3>
              <p>Current Price: ${formatCurrency(data.priceLastSale)}</p>
              <p>Open Price: ${formatCurrency(data.priceOpen)}</p>
              <p>Change: ${formatPercent(data.priceChangePct || 0)}</p>
            </div>
            <div>
              <h3>Market Data</h3>
              <p>Market Cap: ${formatCurrency((data.marketCap) * 1e6)}M</p>
              <p>Volume: ${formatNumber(data.volume)}</p>
              <p>Value: ${formatCurrency((data.value) * 1e6)}M</p>
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
    hideOverlay() {
        const overlay = document.getElementById('company-overlay');
        if (overlay) {
            d3.select(overlay)
                .transition()
                .duration(250)
                .style('opacity', '0')
                .on('end', () => {
                d3.select(overlay).style('display', 'none');
            });
            d3.select('body').style('overflow', 'auto');
        }
    }
    searchAndHighlight(query) {
        if (!this.nodes || !query.trim())
            return;
        const searchQuery = query.toLowerCase();
        const matchingNode = this.nodes.find(node => !node.children?.length && node.data.data && (node.data.ticker.toLowerCase().includes(searchQuery) ||
            node.data.name.toLowerCase().includes(searchQuery)));
        if (matchingNode?.data.data) {
            this.showCompanyOverlay(matchingNode.data.data);
        }
    }
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.tooltip) {
            d3.select(this.tooltip).remove();
            this.tooltip = null;
        }
        if (this.container) {
            d3.select(this.container).selectAll('*').remove();
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
