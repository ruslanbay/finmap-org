class Treemap {
    constructor(containerId) {
        // Add column index mapping
        this.columnIndex = {};
        // Initialize container and canvas
        this.container = document.getElementById(containerId);
        this.setupCanvas();
        
        // Initialize data properties
        this.nodes = [];
        this.currentRoot = null;
        this.path = [];
        
        // Create minimal pathbar
        this.setupPathbar();
        
        // Bind events
        this.bindEvents();

        // Initial size calculation
        this.updateDimensions();

        // Add resize handler
        this.resizeHandler = this.handleResize.bind(this);
        window.addEventListener('resize', this.resizeHandler);

        // Cache for computed values
        this.cache = {
            hierarchy: null,
            lastWidth: 0,
            lastHeight: 0
        };

        // Resize observer instead of window.resize
        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.resizeObserver.observe(this.container);

        // Add parent references to make path building easier
        this.nodesMap = new Map();
    }

    updateDimensions(width, height) {
        this.width = width;
        this.height = height;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(dpr, dpr);
    }

    handleResize(entries) {
        if (!entries?.length) return;
        
        // Use requestAnimationFrame for smooth resizing
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }

        this.rafId = requestAnimationFrame(() => {
            const entry = entries[0];
            const newWidth = entry.contentRect.width;
            const newHeight = entry.contentRect.height - 40; // Subtract pathbar

            // Only update if dimensions actually changed
            if (newWidth !== this.cache.lastWidth || 
                newHeight !== this.cache.lastHeight) {
                
                this.cache.lastWidth = newWidth;
                this.cache.lastHeight = newHeight;
                
                this.updateDimensions(newWidth, newHeight);
                
                if (this.currentRoot) {
                    this.updateLayout();
                }
            }
        });
    }

    // Also update the updateLayout method to maintain consistency:
    updateLayout() {
        if (!this.cache.hierarchy) {
            this.cache.hierarchy = d3.hierarchy(this.currentRoot.data)
                .sum(d => d.type === 'sector' ? 0 : d.value)
                .sort((a, b) => b.value - a.value);
        }
    
        const treemap = d3.treemap()
            .size([this.width, this.height])
            .paddingTop(24)
            .paddingRight(1)
            .paddingBottom(1)
            .paddingLeft(1)
            .round(true);
    
        treemap(this.cache.hierarchy);
        this.nodes = this.cache.hierarchy.descendants();
        
        this.render();
    }

    // Clean up when no longer needed
    destroy() {
        this.resizeObserver.disconnect();
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
    }

    setupCanvas() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight - 40; // Subtract pathbar height
        
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '40px';
        this.canvas.style.left = '0';
        
        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(dpr, dpr);
        
        this.container.appendChild(this.canvas);
    }

    setupPathbar() {
        this.pathbar = document.createElement('div');
        this.pathbar.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: #333;
            color: white;
            display: flex;
            align-items: center;
            padding: 0 10px;
            font-family: PokemonSolid;
            letter-spacing: 0.1em;

        `;
        this.container.appendChild(this.pathbar);
    }

    bindEvents() {
        // Click handling for drill-down
        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const node = this.findNodeAtPoint(x, y);
            if (node) this.drillDown(node);
        });

        // Pathbar navigation
        this.pathbar.addEventListener('click', (event) => {
            const index = parseInt(event.target.dataset.index);
            if (!isNaN(index)) this.drillTo(index);
        });
    }

    // Update findNodeAtPoint to handle header areas
    findNodeAtPoint(x, y) {
        const HEADER_HEIGHT = 24;
        return this.nodes.find(node => {
            if (!node.parent) return false; // Skip root node
            
            if (node.children) {
                // For parent nodes, only check header area
                return x >= node.x0 && 
                       x <= node.x1 && 
                       y >= node.y0 && 
                       y <= node.y0 + HEADER_HEIGHT;
            } else {
                // For leaf nodes, check entire area
                return x >= node.x0 && 
                       x <= node.x1 && 
                       y >= node.y0 && 
                       y <= node.y1;
            }
        });
    }

    renderFromNode(node) {
        if (!node?.data) return;
        
        this.currentRoot = node;
        
        // Clear cache when switching nodes
        this.cache.hierarchy = null;
        
        // Create new hierarchy for new node
        this.cache.hierarchy = d3.hierarchy(node.data)
            .sum(d => d.type === 'sector' ? 0 : d.value)
            .sort((a, b) => b.value - a.value);
    
        const treemap = d3.treemap()
            .size([this.width, this.height])
            .paddingTop(24)
            .paddingRight(1)
            .paddingBottom(1)
            .paddingLeft(1)
            .round(true);
    
        treemap(this.cache.hierarchy);
        this.nodes = this.cache.hierarchy.descendants();
        
        this.updatePathbar();
        this.render();
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw nodes in correct order (back to front)
        this.nodes.forEach(node => {
            if (!node.parent) return; // Skip root node
            
            const width = node.x1 - node.x0;
            const height = node.y1 - node.y0;
            
            if (node.children) {
                // Parent node
                
                // Draw main area
                this.ctx.fillStyle = '#2C3E50';
                this.ctx.fillRect(node.x0, node.y0, width, height);
                
                // Draw header
                this.ctx.fillStyle = '#34495E';
                this.ctx.fillRect(node.x0, node.y0, width, 24);
                
                // Draw header text
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textBaseline = 'middle';
                const text = `${node.data.name}`;
                const truncatedText = this.getTruncatedText(text, width - 25);
                this.ctx.fillText(
                    truncatedText,
                    node.x0 + 4,
                    node.y0 + 12
                );
                
            } else {
                // Leaf node
                this.ctx.fillStyle = '#3498DB';
                this.ctx.fillRect(node.x0, node.y0, width, height);
                
                // Draw leaf node text if there's enough space
                if (width > 30 && height > 20) {
                    // Dynamically adjust font size based on node dimensions
                    const fontSize = Math.min(Math.max(width / 10, 8), Math.min(height / 3, 24));

                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = `${fontSize}px Arial`;
                    this.ctx.textBaseline = 'middle';
                    const text = `${node.data.name}<br>$${d3.format(',.2f')(node.value)}`;
                    // Split the text into lines and draw each line separately
                    const lines = text.split('<br>');
                    const lineHeight = fontSize * 1.0;
                    for (let i = 0; i < lines.length; i++) {
                        const truncatedText = this.getTruncatedText(lines[i], width - 6);
                        this.ctx.fillText(
                            truncatedText,
                            node.x0 + 3,
                            node.y0 + (i * lineHeight) + (height / 2)
                        );
                    }
                    // Load and draw an image for each node
                    const image = new Image();
                    if (width > 50 || height > 50) {
                      image.src = 'images/test/610758.jpg'; // node.data.ticker;
                    }
                    else {
                      image.src = 'images/test/previews/85072.jpeg'; // node.data.ticker;
                    }
                    image.onload = function() {
                        const aspectRatioImage = image.width / image.height;
                        const scaledWidth = width; // Match node's width
                        const scaledHeight = width / aspectRatioImage; // Scale height to maintain aspect ratio
                    
                        if (scaledHeight > height) {
                            // Crop vertically to fit the node's height
                            const cropY = (scaledHeight - height) / 2;
                            this.ctx.drawImage(image, 0, cropY * (image.width / scaledWidth), scaledWidth, height * (image.width / scaledWidth), node.x0, node.y0, width, height);
                        } else {
                            // Draw the scaled image centered vertically
                            const offsetY = (height - scaledHeight) / 2;
                            this.ctx.drawImage(image, 0, 0, image.width, image.height, node.x0, node.y0 + offsetY, width, scaledHeight);
                        }
                    }.bind(this);
                }
            }
            
            // Draw borders
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(node.x0, node.y0, width, height);
        });
    }

    getTruncatedText(text, maxWidth) {
        let truncated = text;
        this.ctx.save();
        
        while (this.ctx.measureText(truncated).width > maxWidth && truncated.length > 3) {
            truncated = truncated.slice(0, -1);
        }
        
        this.ctx.restore();
        return truncated !== text ? truncated + '...' : truncated;
    }

    updatePathbar() {
        this.pathbar.innerHTML = this.path
            .map((node, index) => `
                <span 
                    style="cursor: pointer; padding: 5px 10px;"
                    data-index="${index}"
                >
                    ${node.data.name}
                    ${index < this.path.length - 1 ? ' >' : ''}
                </span>
            `)
            .join('');
    }

    drillDown(node) {
        if (!node || this.currentRoot === node) return;

        // Build complete path from node to root
        const fullPath = [];
        let currentNode = node;
        
        // Traverse up the hierarchy to build the path
        while (currentNode) {
            fullPath.unshift(currentNode);
            currentNode = currentNode.parent;
        }
        
        // Update path with the full hierarchy
        this.path = fullPath;
        
        // Render the target node
        this.renderFromNode(node);
    }

    drillTo(index) {
        if (index >= 0 && index < this.path.length) {
            this.path = this.path.slice(0, index + 1);
            this.renderFromNode(this.path[index]);
        }
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
        const { root } = this.buildNodeHierarchy(rootRow, data);
        
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
            rawData: row
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
        this.nodesMap.clear();
        
        // Create root node
        const root = {
            ...this.createNode(rootRow),
            children: [],
            parent: null  // Add parent reference
        };
        this.nodesMap.set(rootRow[this.columnIndex.ticker], root);
    
        // Create all nodes first
        data.forEach(row => {
            const ticker = row[this.columnIndex.ticker];
            if (ticker !== rootRow[this.columnIndex.ticker]) {
                this.nodesMap.set(ticker, {
                    ...this.createNode(row),
                    children: [],
                    parent: null  // Will set correct parent in next step
                });
            }
        });
    
        // Build hierarchy with parent references
        data.forEach(row => {
            const ticker = row[this.columnIndex.ticker];
            const parentSector = row[this.columnIndex.sector];
            
            if (ticker === rootRow[this.columnIndex.ticker]) return;
    
            const node = this.nodesMap.get(ticker);
            const parentNode = Array.from(this.nodesMap.values())
                .find(n => n.ticker === parentSector);
    
            if (parentNode) {
                parentNode.children.push(node);
                node.parent = parentNode;  // Set parent reference
            } else if (parentSector !== '') {
                root.children.push(node);
                node.parent = root;  // Set parent reference
            }
        });
    
        return { root, nodesMap: this.nodesMap };
    }
}

document.head.insertAdjacentHTML('beforeend', `
    <style>
        #container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
        }
        
        @font-face {
            font-family: 'PokemonHollow';
            src: url('styles/PokemonHollow.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
        }
        
        @font-face {
            font-family: 'PokemonSolid';
            src: url('styles/PokemonSolid.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
        }
    </style>
`);

// Initialize
const treemap = new Treemap('container');

// Load and render data
const url = 'https://gist.githubusercontent.com/ruslanbay/4e50cd8df640d24f9e64bb7672cdf3a2/raw/7950eaf289bb1b8a4c2214209e460ae481156652/pokemon.json';
// const url = 'https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/marketdata/2025/03/14/us-all.json';

fetch(url)
    .then(response => response.json())
    .then(data => {
        const transformedData = treemap.transformData(data);
        const root = d3.hierarchy(transformedData)
            .sum(d => d.type === 'sector' ? 0 : d.value)
            .sort((a, b) => b.value - a.value);
        
        treemap.path = [root];
        treemap.renderFromNode(root);
    })
    .catch(error => {
        console.error('Error loading or processing data:', error);
    });