class D3CanvasTreemap {
  constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.tooltip = document.getElementById('tooltip');
      
      // Set up dimensions
      this.width = this.container.clientWidth;
      this.height = this.container.clientHeight;
      
      // Create Canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width * window.devicePixelRatio;
      this.canvas.height = this.height * window.devicePixelRatio;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.container.appendChild(this.canvas);
      
      // Get context and adjust for device pixel ratio
      this.ctx = this.canvas.getContext('2d');
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Store nodes for interaction
      this.nodes = [];
      
      // Bind events
      this.bindEvents();
  }

  bindEvents() {
      // Handle window resize
      window.addEventListener('resize', () => {
          this.width = this.container.clientWidth;
          this.height = this.container.clientHeight;
          
          this.canvas.width = this.width * window.devicePixelRatio;
          this.canvas.height = this.height * window.devicePixelRatio;
          this.canvas.style.width = this.width + 'px';
          this.canvas.style.height = this.height + 'px';
          
          this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
          
          if (this.currentData) {
              this.render(this.currentData);
          }
      });

      // Handle mouse move for tooltips
      this.canvas.addEventListener('mousemove', (event) => {
          const rect = this.canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;

          // Find node under cursor
          const node = this.findNodeAtPosition(x, y);
          
          if (node) {
              this.showTooltip(node, event);
          } else {
              this.hideTooltip();
          }
      });

      // Hide tooltip when mouse leaves canvas
      this.canvas.addEventListener('mouseleave', () => {
          this.hideTooltip();
      });
  }

  findNodeAtPosition(x, y) {
      return this.nodes.find(node => 
          x >= node.x0 && 
          x <= node.x1 && 
          y >= node.y0 && 
          y <= node.y1
      );
  }

  transformData(securitiesData) {
    const { columns, data } = securitiesData.securities;
    
    // Create an index map for column names
    const columnIndex = {};
    columns.forEach((col, idx) => columnIndex[col] = idx);
    
    // Helper function to create a node object from a row
    const createNode = (row) => ({
        name: row[columnIndex.nameEng],
        // Only set marketCap for non-sector nodes
        value: row[columnIndex.type] !== 'sector' ? parseFloat(row[columnIndex.marketCap]) || 0 : 0,
        type: row[columnIndex.type],
        sector: row[columnIndex.sector],
        ticker: row[columnIndex.ticker],
        industry: row[columnIndex.industry],
        exchange: row[columnIndex.exchange],
        nestedItemsCount: parseInt(row[columnIndex.nestedItemsCount]) || 0,
        rawData: row
    });

    // Find root node (where sector is empty)
    const rootRow = data.find(row => row[columnIndex.sector] === '');
    if (!rootRow) {
        throw new Error('Root node not found');
    }

    // Create map to store all nodes
    const nodesMap = new Map();
    
    // Create the root object
    const root = {
        ...createNode(rootRow),
        children: []
    };
    nodesMap.set(rootRow[columnIndex.ticker], root);

    // First pass: create all nodes
    data.forEach(row => {
        const ticker = row[columnIndex.ticker];
        if (ticker !== rootRow[columnIndex.ticker]) {
            nodesMap.set(ticker, {
                ...createNode(row),
                children: []
            });
        }
    });

    // Second pass: build hierarchy
    data.forEach(row => {
        const ticker = row[columnIndex.ticker];
        const parentSector = row[columnIndex.sector];
        
        // Skip root node
        if (ticker === rootRow[columnIndex.ticker]) {
            return;
        }

        // Find parent node
        const parentNode = Array.from(nodesMap.values()).find(node => 
            node.ticker === parentSector
        );

        if (parentNode) {
            parentNode.children.push(nodesMap.get(ticker));
        } else if (parentSector !== '') {
            // If parent not found but sector is specified, add to root
            root.children.push(nodesMap.get(ticker));
        }
    });

    // Function to recursively calculate values
    const calculateValues = (node) => {
        if (!node.children || node.children.length === 0) {
            // Leaf node - already has its value set
            return node.value;
        }

        // For parent nodes, sum up only their children's values
        node.value = node.children.reduce((sum, child) => {
            return sum + calculateValues(child);
        }, 0);

        // Debug logging
        console.log(`Node: ${node.name}`);
        console.log(`  Type: ${node.type}`);
        console.log(`  Children count: ${node.children.length}`);
        console.log(`  Total value (sum of children): ${node.value}`);
        console.log(`  Children:`, node.children.map(c => ({
            name: c.name,
            value: c.value,
            type: c.type
        })));

        return node.value;
    };

    // Calculate values starting from root
    calculateValues(root);

    // Verify calculations
    const verifyNode = (node) => {
        if (node.children && node.children.length > 0) {
            const childrenSum = node.children.reduce((sum, child) => sum + child.value, 0);
            if (Math.abs(childrenSum - node.value) > 0.01) {
                console.error(`Value mismatch in node ${node.name}:`);
                console.error(`  Node value: ${node.value}`);
                console.error(`  Sum of children: ${childrenSum}`);
            }
            node.children.forEach(verifyNode);
        }
    };
    verifyNode(root);

    // Debug info
    console.log('Data transformation complete');
    console.log('Total nodes:', nodesMap.size);
    console.log('Root children:', root.children.length);
    console.log('Root value (total market cap):', root.value);

    return root;
}

  showTooltip(node, event) {
      const tooltip = d3.select(this.tooltip);
      tooltip.style('display', 'block')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY + 10) + 'px')
          .html(`
              <div><strong>${node.data.name}</strong></div>
              <div>Type: ${node.data.type}</div>
              <div>Ticker: ${node.data.ticker}</div>
              <div>Market Cap: $${node.data.value.toFixed(2)}</div>
              ${node.data.sector ? `<div>Sector: ${node.data.sector}</div>` : ''}
          `);
  }

  hideTooltip() {
      d3.select(this.tooltip).style('display', 'none');
  }

  render(data) {
    this.currentData = data;
    const hierarchicalData = this.transformData(data);
    
    // Create treemap layout with custom value accessor
    const treemap = d3.treemap()
        .size([this.width, this.height])
        .padding(1)
        .round(true);
    
    // Create hierarchy with custom value accessor
    const root = d3.hierarchy(hierarchicalData)
        .sum(d => d.type === 'sector' ? 0 : d.value) // Only count non-sector nodes
        .sort((a, b) => b.value - a.value);
    
    // Generate treemap layout
    treemap(root);

    // Store nodes for interaction
    this.nodes = root.leaves();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Enhanced color scale for hierarchy levels
    const getNodeColor = (node) => {
        if (node.data.type === 'sector') {
            return '#34495E';  // darker color for sectors
        }
        return '#3498DB';  // lighter color for leaves
    };

    // Draw nodes
    this.nodes.forEach(node => {
        // Draw rectangle
        this.ctx.fillStyle = getNodeColor(node);
        this.ctx.globalAlpha = 0.8;
        this.ctx.fillRect(
            node.x0,
            node.y0,
            node.x1 - node.x0,
            node.y1 - node.y0
        );

        // Draw border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 1;
        this.ctx.strokeRect(
            node.x0,
            node.y0,
            node.x1 - node.x0,
            node.y1 - node.y0
        );

        // Draw text if node is large enough
        const nodeWidth = node.x1 - node.x0;
        const nodeHeight = node.y1 - node.y0;
        
        if (nodeWidth > 30 && nodeHeight > 15) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px Arial';
            this.ctx.textBaseline = 'top';
            
            // Add value to the label
            const text = `${node.data.name} (${node.value.toFixed(2)})`;
            const maxWidth = nodeWidth - 6;
            let truncatedText = text;
            
            while (this.ctx.measureText(truncatedText).width > maxWidth && truncatedText.length > 3) {
                truncatedText = truncatedText.slice(0, -1);
            }
            
            if (truncatedText !== text) {
                truncatedText += '...';
            }
            
            this.ctx.fillText(
                truncatedText,
                node.x0 + 3,
                node.y0 + 3
            );
        }
    });

    // Debug: print hierarchy information
    const printNode = (node, level = 0) => {
        const indent = '  '.repeat(level);
        console.log(`${indent}${node.data.name}:`);
        console.log(`${indent}  type: ${node.data.type}`);
        console.log(`${indent}  value: ${node.value}`);
        if (node.children) {
            console.log(`${indent}  children sum: ${node.children.reduce((sum, child) => sum + child.value, 0)}`);
            node.children.forEach(child => printNode(child, level + 1));
        }
    };
    printNode(root);
}
}

// Initialize and render
document.addEventListener('DOMContentLoaded', async () => {
  try {
      console.log('Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted):', 
          new Date().toISOString().slice(0, 19).replace('T', ' '));
      console.log('Current User\'s Login:', window.ruslanbay || 'unknown');
      console.log('Initializing application...');

      const treemap = new D3CanvasTreemap('container');
      
      // Show loading indicator
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
      `;
      loadingDiv.innerHTML = 'Loading data...';
      treemap.container.appendChild(loadingDiv);

      // Fetch data
      const response = await fetch('https://gist.githubusercontent.com/ruslanbay/4e50cd8df640d24f9e64bb7672cdf3a2/raw/7950eaf289bb1b8a4c2214209e460ae481156652/pokemon.json');
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Remove loading indicator
      treemap.container.removeChild(loadingDiv);
      
      // Render treemap
      await treemap.render(data);
      
  } catch (error) {
      console.error('Failed to initialize or render treemap:', error);
      const container = document.getElementById('container');
      container.innerHTML = `
          <div style="padding: 20px; color: red;">
              <h3>Error Initializing Treemap</h3>
              <p>Error: ${error.message}</p>
              <p>Stack: ${error.stack}</p>
              <p>Time: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}</p>
              <p>User: ${window.ruslanbay || 'unknown'}</p>
              <p>Browser: ${navigator.userAgent}</p>
          </div>
      `;
  }
});