class MinimalTreemap {
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

    findNodeAtPoint(x, y) {
        return this.nodes.find(node => 
            x >= node.x0 && x <= node.x1 && 
            y >= node.y0 && y <= node.y1
        );
    }

    renderFromNode(node) {
        if (!node?.data) return;
        
        this.currentRoot = node;
        
        // Create treemap layout
        const treemap = d3.treemap()
            .size([this.width, this.height])
            .padding(1)
            .round(true);
        
        // Process data
        const root = d3.hierarchy(node.data)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);
        
        treemap(root);
        this.nodes = root.descendants();
        
        // Update UI
        this.updatePathbar();
        this.render();
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw nodes
        this.nodes.forEach(node => {
            const width = node.x1 - node.x0;
            const height = node.y1 - node.y0;
            
            // Draw rectangle
            this.ctx.fillStyle = node.children ? '#555' : '#777';
            this.ctx.fillRect(node.x0, node.y0, width, height);
            
            // Draw border
            this.ctx.strokeStyle = '#fff';
            this.ctx.strokeRect(node.x0, node.y0, width, height);
            
            // Draw label if enough space
            if (width > 30 && height > 20) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(
                    node.data.name,
                    node.x0 + 3,
                    node.y0 + 15
                );
            }
        });
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
        
        const existingIndex = this.path.findIndex(n => n === node);
        if (existingIndex !== -1) {
            this.path = this.path.slice(0, existingIndex + 1);
        } else {
            this.path.push(node);
        }
        
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
            rawData: row,
            lastUpdated: '2025-03-17 19:01:29',
            updatedBy: 'ruslanbay'
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
}


// Initialize
const treemap = new MinimalTreemap('container');

// Load and render data
const url = 'https://gist.githubusercontent.com/ruslanbay/4e50cd8df640d24f9e64bb7672cdf3a2/raw/7950eaf289bb1b8a4c2214209e460ae481156652/pokemon.json';
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
    .catch(error => console.error('Error loading or processing data:', error));
