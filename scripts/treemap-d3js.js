// plot treemap using d3.js (canvas) for better performance

class D3CanvasTreemap {
  constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.tooltip = document.getElementById('tooltip');
      
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

      // Store nodes for interaction
      this.nodes = [];
      this.currentRoot = null;
      this.path = [];
      
      // Bind events
      this.bindEvents();
  }

  bindEvents() {
      // Handle window resize
      window.addEventListener('resize', () => {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight - 40;
          
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
          if (node && node.data.children && node.data.children.length > 0) {
              this.drillDown(node);
          }
      });

      // Handle pathbar clicks
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
      this.path.push(node);
      this.renderFromNode(node);
  }
  
  drillTo(index) {
      this.path = this.path.slice(0, index + 1);
      this.renderFromNode(this.path[this.path.length - 1]);
  }
  
  renderFromNode(node) {
      this.currentRoot = node;
      
      // Create treemap layout
      const treemap = d3.treemap()
          .size([this.width, this.height])
          .padding(1)
          .round(true);
      
      // Create hierarchy starting from current node
      const root = d3.hierarchy(node.data)
          .sum(d => d.type === 'sector' ? 0 : d.value)
          .sort((a, b) => b.value - a.value);
      
      // Generate treemap layout
      treemap(root);
  
      // Store nodes for interaction
      this.nodes = root.leaves();
  
      // Update pathbar
      this.updatePathbar();
  
      // Render visualization
      this.render();
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
        // console.log(`Node: ${node.name}`);
        // console.log(`  Type: ${node.type}`);
        // console.log(`  Children count: ${node.children.length}`);
        // console.log(`  Total value (sum of children): ${node.value}`);
        // console.log(`  Children:`, node.children.map(c => ({
        //     name: c.name,
        //     value: c.value,
        //     type: c.type
        // })));

        return node.value;
    };

    // Calculate values starting from root
    calculateValues(root);

    // Verify calculations
    const verifyNode = (node) => {
        if (node.children && node.children.length > 0) {
            const childrenSum = node.children.reduce((sum, child) => sum + child.value, 0);
            if (Math.abs(childrenSum - node.value) > 0.01) {
                // console.error(`Value mismatch in node ${node.name}:`);
                // console.error(`  Node value: ${node.value}`);
                // console.error(`  Sum of children: ${childrenSum}`);
            }
            node.children.forEach(verifyNode);
        }
    };
    verifyNode(root);

    // Debug info
    // console.log('Data transformation complete');
    // console.log('Total nodes:', nodesMap.size);
    // console.log('Root children:', root.children.length);
    // console.log('Root value (total market cap):', root.value);

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

  render() {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.width, this.height);
  
      // Color scale
      const getNodeColor = (node) => {
          if (node.data.type === 'sector') {
              return '#34495E';
          }
          return '#3498DB';
      };
  
      // Draw nodes
      this.nodes.forEach(node => {
          // Draw rectangle with gradient
          const gradient = this.ctx.createLinearGradient(
              node.x0, 
              node.y0, 
              node.x0, 
              node.y1
          );
          gradient.addColorStop(0, getNodeColor(node));
          gradient.addColorStop(1, d3.color(getNodeColor(node)).darker(0.5));
          
          this.ctx.fillStyle = gradient;
          this.ctx.globalAlpha = 0.9;
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
              
              const value = d3.format(',.2f')(node.value);
              const text = `${node.data.name} ($${value}M)`;
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
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
      
      // Initialize with root node
      const root = d3.hierarchy(treemap.transformData(data))
          .sum(d => d.type === 'sector' ? 0 : d.value)
          .sort((a, b) => b.value - a.value);
          
      treemap.path = [root];
      treemap.renderFromNode(root);
      
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