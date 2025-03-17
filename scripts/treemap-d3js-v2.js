class MinimalTreemap {
    constructor(containerId) {
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
}
