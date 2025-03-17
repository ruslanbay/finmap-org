class TreemapRenderer {
    // Tooltip methods
    showTooltip(node, event) {
        if (!node?.data || !event) {
            return;
        }
    
        const tooltip = d3.select(this.tooltip);
        const formatNumber = d3.format(',.2f');
        
        const tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 5px;">
                ${this.escapeHtml(node.data.name)}
            </div>
            <div style="font-size: 12px; color: #ddd;">
                ${this.escapeHtml(node.data.ticker)}
            </div>
            <div style="margin-top: 5px;">
                Market Cap: $${formatNumber(node.value)}M
            </div>
            <div>
                Type: ${this.escapeHtml(node.data.type)}
            </div>
            <div style="margin-top: 5px; color: #8BE9FD;">
                ${node.children?.length ? 
                    `Click to view ${node.children.length} items` : 
                    'Click to view details'}
            </div>
        `;
    
        tooltip
            .style('display', 'block')
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY + 10}px`)
            .html(tooltipContent);
    }
    
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    hideTooltip() {
        d3.select(this.tooltip).style('display', 'none');
    }
    
    render() {
        if (!this.ctx) return;
    
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
    
        const HEADER_HEIGHT = 24;
        
        // Render in correct order (background to foreground)
        this.renderParentNodeAreas(HEADER_HEIGHT);
        this.renderParentNodeBorders(HEADER_HEIGHT);
        this.renderLeafNodes();
        this.renderParentHeaders(HEADER_HEIGHT);
        this.renderNodeText(HEADER_HEIGHT);
    }
    
    getNodeColor(node) {
        if (node.data.type === 'sector') {
            return node.children ? '#2C3E50' : '#34495E';
        }
        return '#3498DB';
    }
    
    renderParentNodeAreas(HEADER_HEIGHT) {
        this.nodes.forEach(node => {
            if (!node.parent || !node.children) return;
    
            const width = node.x1 - node.x0;
            const height = node.y1 - node.y0;
    
            const gradient = this.ctx.createLinearGradient(
                node.x0, 
                node.y0, 
                node.x0, 
                node.y1
            );
            gradient.addColorStop(0, this.getNodeColor(node));
            gradient.addColorStop(1, d3.color(this.getNodeColor(node)).darker(0.5));
            
            this.ctx.fillStyle = gradient;
            this.ctx.globalAlpha = 0.85;
            
            this.ctx.fillRect(
                node.x0, 
                node.y0 + HEADER_HEIGHT, 
                width, 
                height - HEADER_HEIGHT
            );
        });
    }

    renderParentNodeBorders(HEADER_HEIGHT) {
        this.nodes.forEach(node => {
            if (!node.parent || !node.children) return;
            if (node.parent === this.currentRoot) return;
    
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 1;
            this.ctx.beginPath();
    
            // Left border
            this.ctx.moveTo(node.x0, node.y0 + HEADER_HEIGHT);
            this.ctx.lineTo(node.x0, node.y1);
            
            // Bottom border
            this.ctx.moveTo(node.x0, node.y1);
            this.ctx.lineTo(node.x1, node.y1);
            
            // Right border
            this.ctx.moveTo(node.x1, node.y0 + HEADER_HEIGHT);
            this.ctx.lineTo(node.x1, node.y1);
            
            this.ctx.stroke();
        });
    }

    renderLeafNodes() {
        this.nodes.forEach(node => {
            if (!node.parent || node.children) return;
    
            const width = node.x1 - node.x0;
            const height = node.y1 - node.y0;
    
            const gradient = this.ctx.createLinearGradient(
                node.x0, 
                node.y0, 
                node.x0, 
                node.y1
            );
            gradient.addColorStop(0, this.getNodeColor(node));
            gradient.addColorStop(1, d3.color(this.getNodeColor(node)).darker(0.5));
            
            // Draw background
            this.ctx.fillStyle = gradient;
            this.ctx.globalAlpha = 0.9;
            this.ctx.fillRect(node.x0, node.y0, width, height);
    
            // Draw border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 1;
            this.ctx.strokeRect(node.x0, node.y0, width, height);
        });
    }

    renderParentHeaders(HEADER_HEIGHT) {
        this.nodes.forEach(node => {
            if (!node.parent || !node.children) return;
    
            const width = node.x1 - node.x0;
    
            // Draw header background
            this.ctx.fillStyle = d3.color(this.getNodeColor(node)).darker(0.5);
            this.ctx.globalAlpha = 1;
            this.ctx.fillRect(node.x0, node.y0, width, HEADER_HEIGHT);
    
            // Draw header borders
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(node.x0, node.y0, width, HEADER_HEIGHT);
    
            // Draw drill-down indicator
            this.drawDrillDownIndicator(node, HEADER_HEIGHT);
        });
    }
    
    drawDrillDownIndicator(node, HEADER_HEIGHT) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.globalAlpha = 0.8;
        this.ctx.beginPath();
        
        const centerX = node.x1 - 15;
        const centerY = node.y0 + HEADER_HEIGHT/2;
        
        this.ctx.moveTo(centerX - 5, centerY - 3);
        this.ctx.lineTo(centerX + 5, centerY - 3);
        this.ctx.lineTo(centerX, centerY + 4);
        this.ctx.closePath();
        this.ctx.fill();
    }

    renderNodeText(HEADER_HEIGHT) {
        const MIN_WIDTH = 30;
        const MIN_HEIGHT = 15;
        const formatNumber = d3.format(',.2f');
    
        this.nodes.forEach(node => {
            if (!node.parent) return;
    
            const width = node.x1 - node.x0;
            const height = node.y1 - node.y0;
    
            if (width > MIN_WIDTH && height > MIN_HEIGHT) {
                const value = formatNumber(node.value);
                const text = `${node.data.name} ($${value}M)`;
                const maxWidth = width - (node.children ? 25 : 6);
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = node.children ? 'bold 12px Arial' : '10px Arial';
                this.ctx.textBaseline = 'top';
                
                const truncatedText = this.getTruncatedText(text, maxWidth);
                
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                this.ctx.shadowBlur = 4;
                this.ctx.fillText(
                    truncatedText,
                    node.x0 + 3,
                    node.y0 + (node.children ? (HEADER_HEIGHT - 12)/2 : 3)
                );
                this.ctx.shadowBlur = 0;
            }
        });
    }
    
    getTruncatedText(text, maxWidth) {
        let truncatedText = text;
        
        while (this.ctx.measureText(truncatedText).width > maxWidth && truncatedText.length > 3) {
            truncatedText = truncatedText.slice(0, -1);
        }
        
        return truncatedText !== text ? truncatedText + '...' : truncatedText;
    }
}


class D3CanvasTreemap extends TreemapRenderer {
    constructor(containerId) {
        super(); // Call TreemapRenderer's constructor
        
        // Initialize container and tooltip
        this.container = document.getElementById(containerId);
        this.tooltip = document.getElementById('tooltip');
    
        // Initialize data properties
        this.columnIndex = {};
        this.nodes = [];
        this.currentRoot = null;
        this.path = [];
        
        // Create pathbar container
        this.pathbar = document.createElement('div');
        this.pathbar.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: #2C3E50;
            color: white;
            display: flex;
            align-items: center;
            padding: 0 10px;
            font-family: Arial, sans-serif;
            z-index: 1;
        `;
        this.container.appendChild(this.pathbar);
    
        // Set up dimensions
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight - 40; // Subtract pathbar height
        
        // Create Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: absolute;
            top: 40px;
            left: 0;
        `;
        this.canvas.width = this.width * window.devicePixelRatio;
        this.canvas.height = this.height * window.devicePixelRatio;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.container.appendChild(this.canvas);
        
        // Get context and adjust for device pixel ratio
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Bind events
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            // Update dimensions
            this.width = this.container.clientWidth;
            this.height = this.container.clientHeight - 40; // Subtract pathbar height
            
            // Update canvas size
            this.canvas.width = this.width * window.devicePixelRatio;
            this.canvas.height = this.height * window.devicePixelRatio;
            this.canvas.style.width = this.width + 'px';
            this.canvas.style.height = this.height + 'px';
            
            // Reset context scale
            this.ctx = this.canvas.getContext('2d');
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            
            // Re-render from current root
            if (this.currentRoot) {
                this.renderFromNode(this.currentRoot);
            }
        });
    
        this.canvas.addEventListener('mousemove', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
    
            const node = this.findNodeAtPosition(x, y);
            
            if (node) {
                this.canvas.style.cursor = 'pointer';
                this.showTooltip(node, event);
            } else {
                this.canvas.style.cursor = 'default';
                this.hideTooltip();
            }
        });
    
        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
    
            const node = this.findNodeAtPosition(x, y);
            if (node) {
                this.drillDown(node);
            }
        });
    
        this.pathbar.addEventListener('click', (event) => {
            const index = parseInt(event.target.dataset.index);
            if (!isNaN(index)) {
                this.drillTo(index);
            }
        });
    }

    updatePathbar() {
        this.pathbar.innerHTML = this.path
            .map((node, index) => `
                <span 
                    style="
                        cursor: pointer; 
                        padding: 5px 10px;
                        background: ${index === this.path.length - 1 ? '#34495E' : 'transparent'};
                        border-radius: 4px;
                        margin-right: 5px;
                        ${index < this.path.length - 1 ? 'color: #3498DB;' : ''}
                    "
                    data-index="${index}"
                >
                    ${node.data.name}
                    ${index < this.path.length - 1 ? ' >' : ''}
                </span>
            `)
            .join('');
    }
  
    drillDown(node) {
        if (!node || this.currentRoot === node) {
            return;
        }
    
        // Find if node exists in current path
        const existingIndex = this.path.findIndex(n => n === node);
        
        if (existingIndex !== -1) {
            // Node exists in path - trim to that point
            this.path = this.path.slice(0, existingIndex + 1);
        } else {
            // Node is new - add it to path
            // If we're clicking a visible node, first trim the path to current root
            if (this.currentRoot && this.nodes.includes(node)) {
                const currentRootIndex = this.path.findIndex(n => n === this.currentRoot);
                if (currentRootIndex !== -1) {
                    this.path = this.path.slice(0, currentRootIndex + 1);
                }
            }
            this.path.push(node);
        }
    
        this.renderFromNode(node);
    }
  
    drillTo(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.path.length) {
            return;
        }
    
        const targetNode = this.path[index];
        this.path = this.path.slice(0, index + 1);
        this.renderFromNode(targetNode);
    }
  
    renderFromNode(node) {
        if (!node || !node.data) {
            return;
        }
    
        this.currentRoot = node;
    
        if (!node.data.children?.length) {
            this.renderLeafDetails(node);
            return;
        }
    
        const treemap = d3.treemap()
            .size([this.width, this.height])
            .padding(1)
            .round(true);
        
        const root = d3.hierarchy(node.data)
            .sum(d => d.type === 'sector' ? 0 : d.value)
            .sort((a, b) => b.value - a.value);
        
        treemap(root);
        this.nodes = root.descendants();
        this.updatePathbar();
        this.render();
    }
  
    renderLeafDetails(node) {
        if (!node?.data) {
            return;
        }
    
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.updatePathbar();
        this.nodes = [node];
    
        const padding = 20;
        const contentPadding = padding * 2;
        const dimensions = {
            x: padding,
            y: padding,
            width: this.width - 2 * padding,
            height: this.height - 2 * padding
        };
    
        this.drawDetailBackground(dimensions);
        this.drawDetailContent(node, dimensions, contentPadding);
    }
    
    drawDetailBackground({ x, y, width, height }) {
        this.ctx.fillStyle = '#2C3E50';
        this.ctx.globalAlpha = 0.9;
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.globalAlpha = 1;
    }
    
    drawDetailContent(node, dims, padding) {
        const formatNumber = d3.format(',.2f');
        let currentY = dims.y + padding;
        const lineHeight = 24;
    
        // Configure text rendering
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textBaseline = 'top';
    
        // Draw title
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText(node.data.name, dims.x + padding, currentY);
        currentY += lineHeight * 1.5;
    
        // Draw rows
        const details = [
            ['Ticker', node.data.ticker],
            ['Type', node.data.type],
            ['Market Cap', node.value && `$${formatNumber(node.value)}M`],
            ['Exchange', node.data.exchange],
            ['Sector', node.data.sector],
            ['Industry', node.data.industry]
        ];
    
        // Add raw data details if available
        if (node.data.rawData) {
            const { rawData } = node.data;
            const rawDetails = [
                ['Last Sale Price', rawData[this.columnIndex.priceLastSale]],
                ['Price Change %', rawData[this.columnIndex.priceChangePct] && 
                    `${rawData[this.columnIndex.priceChangePct]}%`],
                ['Volume', rawData[this.columnIndex.volume] && 
                    formatNumber(rawData[this.columnIndex.volume])],
                ['Number of Trades', rawData[this.columnIndex.numTrades] && 
                    formatNumber(rawData[this.columnIndex.numTrades])],
                ['Listed From', rawData[this.columnIndex.listedFrom]]
            ];
            details.push(...rawDetails);
        }
    
        // Add last updated timestamp
        const timestamp = new Date().toISOString()
            .replace('T', ' ')
            .replace(/\.\d{3}Z$/, ' UTC');
        details.push(['Last Updated', timestamp]);
    
        // Draw all rows
        details.forEach(([label, value]) => {
            if (value) {
                this.ctx.font = 'bold 14px Arial';
                this.ctx.fillText(`${label}:`, dims.x + padding, currentY);
                this.ctx.font = '14px Arial';
                this.ctx.fillText(String(value), dims.x + padding + 150, currentY);
                currentY += lineHeight;
            }
        });
    }

    findNodeAtPosition(x, y) {
        if (!this.nodes?.length || typeof x !== 'number' || typeof y !== 'number') {
            return null;
        }
    
        const HEADER_HEIGHT = 24;
        const sortedNodes = [...this.nodes].reverse();
    
        // Check for parent node headers first
        const parentNode = sortedNodes.find(node => 
            node.children && 
            this.isPointInRect(x, y, {
                x0: node.x0,
                x1: node.x1,
                y0: node.y0,
                y1: node.y0 + HEADER_HEIGHT
            })
        );
    
        if (parentNode) {
            return parentNode;
        }
    
        // Then check for any node
        return sortedNodes.find(node => 
            this.isPointInRect(x, y, {
                x0: node.x0,
                x1: node.x1,
                y0: node.y0,
                y1: node.y1
            })
        );
    }
    
    isPointInRect(x, y, rect) {
        return x >= rect.x0 && 
               x <= rect.x1 && 
               y >= rect.y0 && 
               y <= rect.y1;
    }

    
    transformData(securitiesData) {
        if (!securitiesData?.securities?.columns || !securitiesData?.securities?.data) {
            throw new Error('Invalid securities data format');
        }
    
        const { columns, data } = securitiesData.securities;
        
        // Set up column indices
        this.setupColumnIndices(columns);
        
        // Find and validate root node
        const rootRow = this.findRootNode(data);
        
        // Build node hierarchy
        const { root, nodesMap } = this.buildNodeHierarchy(rootRow, data);
        
        // Calculate final values
        this.calculateHierarchyValues(root);
        
        return root;
    }
    
    setupColumnIndices(columns) {
        columns.forEach((col, idx) => this.columnIndex[col] = idx);
    }
    
    createNode(row) {
        return {
            name: row[this.columnIndex.nameEng],
            value: row[this.columnIndex.type] !== 'sector' ? 
                parseFloat(row[this.columnIndex.marketCap]) || 0 : 0,
            type: row[this.columnIndex.type],
            sector: row[this.columnIndex.sector],
            ticker: row[this.columnIndex.ticker],
            industry: row[this.columnIndex.industry],
            exchange: row[this.columnIndex.exchange],
            nestedItemsCount: parseInt(row[this.columnIndex.nestedItemsCount]) || 0,
            rawData: row,
            lastUpdated: '2025-03-17 11:08:51', // Using provided timestamp
            updatedBy: 'ruslanbay' // Using provided user login
        };
    }
    
    findRootNode(data) {
        const rootRow = data.find(row => row[this.columnIndex.sector] === '');
        if (!rootRow) {
            throw new Error('Root node not found in data');
        }
        return rootRow;
    }
    
    buildNodeHierarchy(rootRow, data) {
        const nodesMap = new Map();
        
        // Create root node
        const root = {
            ...this.createNode(rootRow),
            children: []
        };
        nodesMap.set(rootRow[this.columnIndex.ticker], root);
    
        // Create all nodes
        data.forEach(row => {
            const ticker = row[this.columnIndex.ticker];
            if (ticker !== rootRow[this.columnIndex.ticker]) {
                nodesMap.set(ticker, {
                    ...this.createNode(row),
                    children: []
                });
            }
        });
    
        // Build hierarchy
        data.forEach(row => {
            const ticker = row[this.columnIndex.ticker];
            const parentSector = row[this.columnIndex.sector];
            
            if (ticker === rootRow[this.columnIndex.ticker]) {
                return;
            }
    
            const parentNode = Array.from(nodesMap.values())
                .find(node => node.ticker === parentSector);
    
            if (parentNode) {
                parentNode.children.push(nodesMap.get(ticker));
            } else if (parentSector !== '') {
                root.children.push(nodesMap.get(ticker));
            }
        });
    
        return { root, nodesMap };
    }
    
    calculateHierarchyValues(node) {
        if (!node.children?.length) {
            return node.value;
        }
    
        node.value = node.children.reduce((sum, child) => 
            sum + this.calculateHierarchyValues(child), 0);
    
        return node.value;
    }
}


class TreemapInitializer {
    static DATA_URL = 'https://gist.githubusercontent.com/ruslanbay/4e50cd8df640d24f9e64bb7672cdf3a2/raw/7950eaf289bb1b8a4c2214209e460ae481156652/pokemon.json';
    static CONTAINER_ID = 'container';

    constructor() {
    }

    async initialize() {
        try {
            const treemap = new D3CanvasTreemap(TreemapInitializer.CONTAINER_ID);
            const loadingDiv = this.createLoadingIndicator();
            treemap.container.appendChild(loadingDiv);

            const data = await this.fetchData();
            treemap.container.removeChild(loadingDiv);

            this.initializeTreemap(treemap, data);

        } catch (error) {
            this.handleError(error);
        }
    }

    createLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 8px;
            text-align: center;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
        `;
        loadingDiv.innerHTML = `<div>Loading data...</div>`;
        return loadingDiv;
    }

    async fetchData() {
        const response = await fetch(TreemapInitializer.DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    initializeTreemap(treemap, data) {
        const root = d3.hierarchy(treemap.transformData(data))
            .sum(d => d.type === 'sector' ? 0 : d.value)
            .sort((a, b) => b.value - a.value);

        treemap.path = [root];
        treemap.renderFromNode(root);
    }

    handleError(error) {
        console.error('Failed to initialize or render treemap:', error);
        
        const errorDiv = this.createErrorDisplay(error);
        const container = document.getElementById(TreemapInitializer.CONTAINER_ID);
        container.innerHTML = errorDiv;
    }

    createErrorDisplay(error) {
        return `
            <div style="
                padding: 20px;
                color: #721c24;
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                font-family: Arial, sans-serif;
            ">
                <h3 style="margin-top: 0;">Error Initializing Treemap</h3>
                <div style="margin: 10px 0;">
                    <strong>Error:</strong> ${this.escapeHtml(error.message)}
                </div>
                <div style="
                    background: #fff;
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                    font-family: monospace;
                    font-size: 12px;
                    white-space: pre-wrap;
                ">
                    ${this.escapeHtml(error.stack)}
                </div>
            </div>
        `;
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    const initializer = new TreemapInitializer();
    initializer.initialize();
});