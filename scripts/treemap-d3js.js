// plot treemap using d3.js (canvas) for better performance

class D3CanvasTreemap {
  constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.tooltip = document.getElementById('tooltip');

      // Add columnIndex as a class property
      this.columnIndex = {};
      
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

      this.canvas.addEventListener('click', (event) => {
          const rect = this.canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
  
          const node = this.findNodeAtPosition(x, y);
          if (node && node.children && node.children.length > 0) {
              this.drillDown(node);
          }
      });
  
      // Add hover effect
      this.canvas.addEventListener('mousemove', (event) => {
          const rect = this.canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
  
          const node = this.findNodeAtPosition(x, y);
          
          if (node && node.children && node.children.length > 0) {
              this.canvas.style.cursor = 'pointer';
              this.showTooltip(node, event);
          } else if (node) {
              this.canvas.style.cursor = 'default';
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
              // Always drill down, regardless of whether it's a parent or leaf node
              this.drillDown(node);
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
      console.log('Drilling down to:', node.data.name);
      this.path.push(node);
      this.renderFromNode(node);
  }
  
  drillTo(index) {
      this.path = this.path.slice(0, index + 1);
      this.renderFromNode(this.path[this.path.length - 1]);
  }
  
  renderFromNode(node) {
      this.currentRoot = node;
      
      // Check if this is a leaf node (no children)
      if (!node.data.children || node.data.children.length === 0) {
          console.log('Rendering leaf details for:', node.data.name);
          this.renderLeafDetails(node);
          return;
      }
      
      // Regular treemap rendering for non-leaf nodes
      console.log('Rendering treemap for:', node.data.name);
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
      // Clear canvas
      this.ctx.clearRect(0, 0, this.width, this.height);
      
      // Update pathbar
      this.updatePathbar();
      
      // Store single node for interaction
      this.nodes = [node];
  
      // Draw detailed view
      const padding = 20;
      const x = padding;
      const y = padding;
      const width = this.width - 2 * padding;
      const height = this.height - 2 * padding;
  
      // Draw background
      this.ctx.fillStyle = '#2C3E50';
      this.ctx.globalAlpha = 0.9;
      this.ctx.fillRect(x, y, width, height);
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
  
      // Draw content
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textBaseline = 'top';
      this.ctx.globalAlpha = 1;
  
      let currentY = y + padding;
      const lineHeight = 24;
  
      // Helper function to draw a row
      const drawRow = (label, value) => {
          if (value !== undefined && value !== '' && value !== null) {
              this.ctx.font = 'bold 14px Arial';
              this.ctx.fillText(label + ':', x + padding, currentY);
              this.ctx.font = '14px Arial';
              this.ctx.fillText(String(value), x + padding + 150, currentY);
              currentY += lineHeight;
          }
      };
  
      // Draw title
      this.ctx.font = 'bold 20px Arial';
      this.ctx.fillText(node.data.name, x + padding, currentY);
      currentY += lineHeight * 1.5;
  
      // Draw details
      const formatNumber = d3.format(',.2f');
      drawRow('Ticker', node.data.ticker);
      drawRow('Type', node.data.type);
      drawRow('Market Cap', `$${formatNumber(node.value)}M`);
      drawRow('Exchange', node.data.exchange);
      if (node.data.sector) drawRow('Sector', node.data.sector);
      if (node.data.industry) drawRow('Industry', node.data.industry);
      
      // Add more details from rawData
      const rawData = node.data.rawData;
      if (rawData) {
          if (rawData[this.columnIndex.priceLastSale]) 
              drawRow('Last Sale Price', rawData[this.columnIndex.priceLastSale]);
          if (rawData[this.columnIndex.priceChangePct]) 
              drawRow('Price Change %', `${rawData[this.columnIndex.priceChangePct]}%`);
          if (rawData[this.columnIndex.volume]) 
              drawRow('Volume', formatNumber(rawData[this.columnIndex.volume]));
          if (rawData[this.columnIndex.numTrades]) 
              drawRow('Number of Trades', formatNumber(rawData[this.columnIndex.numTrades]));
          if (rawData[this.columnIndex.listedFrom]) 
              drawRow('Listed From', rawData[this.columnIndex.listedFrom]);
      }
  }

  // Modify findNodeAtPosition to prioritize header clicks for parent nodes
  findNodeAtPosition(x, y) {
    const HEADER_HEIGHT = 24;
    
    // First check for header clicks on parent nodes
    const headerClick = [...this.nodes].reverse().find(node => 
        node.children &&
        x >= node.x0 && 
        x <= node.x1 && 
        y >= node.y0 && 
        y <= node.y0 + HEADER_HEIGHT
    );
    
    if (headerClick) {
        return headerClick;
    }
  
    // Then check for other nodes
    return [...this.nodes].reverse().find(node => 
        x >= node.x0 && 
        x <= node.x1 && 
        y >= node.y0 && 
        y <= node.y1
    );
  }

  transformData(securitiesData) {
    const { columns, data } = securitiesData.securities;

    // Store column indices as class property
    columns.forEach((col, idx) => this.columnIndex[col] = idx);
    
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
    const formatNumber = d3.format(',.2f');
    
    let tooltipContent = `
        <div style="font-weight: bold; margin-bottom: 5px;">
            ${node.data.name}
        </div>
        <div style="font-size: 12px; color: #ddd;">
            ${node.data.ticker}
        </div>
        <div style="margin-top: 5px;">
            Market Cap: $${formatNumber(node.value)}M
        </div>
        <div>
            Type: ${node.data.type}
        </div>
    `;
  
    if (node.children && node.children.length > 0) {
        tooltipContent += `
            <div style="margin-top: 5px; color: #8BE9FD;">
                Click to view ${node.children.length} items
            </div>
        `;
    } else {
        tooltipContent += `
            <div style="margin-top: 5px; color: #8BE9FD;">
                Click to view details
            </div>
        `;
    }
  
    tooltip.style('display', 'block')
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY + 10) + 'px')
        .html(tooltipContent);
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
              return node.children ? '#2C3E50' : '#34495E';
          }
          return '#3498DB';
      };
  
      const HEADER_HEIGHT = 24;
  
      // First, draw all non-header parts of parent nodes
      this.nodes.forEach(node => {
          if (!node.parent) return; // Skip root node
          if (!node.children) return; // Skip leaf nodes, will draw them later
  
          // Calculate node dimensions
          const width = node.x1 - node.x0;
          const height = node.y1 - node.y0;
  
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
          this.ctx.globalAlpha = 0.85;
          
          // Draw main area (excluding header)
          this.ctx.fillRect(
              node.x0, 
              node.y0 + HEADER_HEIGHT, 
              width, 
              height - HEADER_HEIGHT
          );
      });
  
      // Then draw leaf nodes
      this.nodes.forEach(node => {
          if (!node.parent || node.children) return; // Skip root and parent nodes
  
          // Calculate node dimensions
          const width = node.x1 - node.x0;
          const height = node.y1 - node.y0;
  
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
          this.ctx.fillRect(node.x0, node.y0, width, height);
  
          // Draw border for leaf nodes
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1;
          this.ctx.globalAlpha = 1;
          this.ctx.strokeRect(node.x0, node.y0, width, height);
      });
  
      // Finally, draw headers of parent nodes (on top of everything)
      this.nodes.forEach(node => {
          if (!node.parent || !node.children) return; // Skip root and leaf nodes
  
          const width = node.x1 - node.x0;
  
          // Draw header background
          this.ctx.fillStyle = d3.color(getNodeColor(node)).darker(0.5);
          this.ctx.globalAlpha = 1;
          this.ctx.fillRect(node.x0, node.y0, width, HEADER_HEIGHT);
  
          // Draw header border
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(node.x0, node.y0 + HEADER_HEIGHT);
          this.ctx.lineTo(node.x1, node.y0 + HEADER_HEIGHT);
          this.ctx.stroke();
  
          // Draw side borders for parent nodes (only if not current root's direct child)
          if (node.parent !== this.currentRoot) {
              this.ctx.beginPath();
              this.ctx.moveTo(node.x0, node.y0);
              this.ctx.lineTo(node.x0, node.y1);
              this.ctx.moveTo(node.x1, node.y0);
              this.ctx.lineTo(node.x1, node.y1);
              this.ctx.stroke();
          }
  
          // Draw drill-down indicator in header
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
      });
  
      // Draw all text last (so it's always on top)
      this.nodes.forEach(node => {
          if (!node.parent) return; // Skip root node
  
          const width = node.x1 - node.x0;
          const height = node.y1 - node.y0;
  
          if (width > 30 && height > 15) {
              this.ctx.fillStyle = '#ffffff';
              this.ctx.font = node.children ? 'bold 12px Arial' : '10px Arial';
              this.ctx.textBaseline = 'top';
              
              const value = d3.format(',.2f')(node.value);
              const text = `${node.data.name} ($${value}M)`;
              const maxWidth = width - (node.children ? 25 : 6);
              let truncatedText = text;
              
              while (this.ctx.measureText(truncatedText).width > maxWidth && truncatedText.length > 3) {
                  truncatedText = truncatedText.slice(0, -1);
              }
              
              if (truncatedText !== text) {
                  truncatedText += '...';
              }
              
              // Draw text with shadow for better readability
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