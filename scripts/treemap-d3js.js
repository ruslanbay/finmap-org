class D3Treemap {
  constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.tooltip = document.getElementById('tooltip');
      
      // Set up dimensions
      this.width = this.container.clientWidth;
      this.height = this.container.clientHeight;
      
      // Create SVG container
      this.svg = d3.select(this.container)
          .append('svg')
          .attr('width', this.width)
          .attr('height', this.height);
      
      // Create group for treemap
      this.treemapGroup = this.svg.append('g');
      
      // Bind events
      this.bindEvents();
  }

  bindEvents() {
      // Handle window resize
      window.addEventListener('resize', () => {
          this.width = this.container.clientWidth;
          this.height = this.container.clientHeight;
          
          this.svg
              .attr('width', this.width)
              .attr('height', this.height);
          
          if (this.currentData) {
              this.render(this.currentData);
          }
      });
  }

  transformData(securitiesData) {
      const { columns, data } = securitiesData.securities;
      
      // Create an index map for column names
      const columnIndex = {};
      columns.forEach((col, idx) => columnIndex[col] = idx);
      
      // Helper function to create a node object from a row
      const createNode = (row) => ({
          name: row[columnIndex.nameEng],
          value: row[columnIndex.marketCap] || 0,
          type: row[columnIndex.type],
          sector: row[columnIndex.sector],
          ticker: row[columnIndex.ticker],
          rawData: row
      });
      
      // Find root node
      const rootRow = data.find(row => 
          row[columnIndex.type] === 'sector' && 
          row[columnIndex.sector] === ''
      );
      
      if (!rootRow) {
          throw new Error('Root node not found');
      }
      
      // Create the root object
      const root = {
          ...createNode(rootRow),
          children: []
      };
      
      // Find sector nodes (first level children)
      const sectors = data.filter(row => 
          row[columnIndex.type] === 'sector' && 
          row[columnIndex.sector] !== ''
      );
      
      // Add sectors as children to root
      sectors.forEach(sectorRow => {
          const sectorNode = {
              ...createNode(sectorRow),
              children: []
          };
          
          // Find items belonging to this sector
          const sectorItems = data.filter(row =>
              row[columnIndex.type] !== 'sector' &&
              row[columnIndex.sector] === sectorRow[columnIndex.sector]
          );
          
          // Add items as children to sector
          sectorItems.forEach(itemRow => {
              sectorNode.children.push(createNode(itemRow));
          });
          
          root.children.push(sectorNode);
      });
      
      return root;
  }

  showTooltip(data, event) {
      const tooltip = d3.select(this.tooltip);
      tooltip.style('display', 'block')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY + 10) + 'px')
          .html(`
              <div><strong>${data.data.name}</strong></div>
              <div>Type: ${data.data.type}</div>
              <div>Ticker: ${data.data.ticker}</div>
              <div>Market Cap: $${data.data.value.toFixed(2)}</div>
              ${data.data.sector ? `<div>Sector: ${data.data.sector}</div>` : ''}
          `);
  }

  hideTooltip() {
      d3.select(this.tooltip).style('display', 'none');
  }

  render(data) {
      this.currentData = data;
      const hierarchicalData = this.transformData(data);
      
      // Create treemap layout
      const treemap = d3.treemap()
          .size([this.width, this.height])
          .padding(1)
          .round(true);
      
      // Create hierarchy and compute values
      const root = d3.hierarchy(hierarchicalData)
          .sum(d => d.value)
          .sort((a, b) => b.value - a.value);
      
      // Generate treemap layout
      treemap(root);

      // Color scale for different types
      const colorScale = d3.scaleOrdinal()
          .domain(['sector', 'Pokemon', 'Stadium'])
          .range(['#4CAF50', '#2196F3', '#FF9800']);
      
      // Create cells
      const cells = this.treemapGroup
          .selectAll('g')
          .data(root.leaves(), d => d.data.ticker);
      
      // Remove old cells
      cells.exit().remove();
      
      // Add new cells
      const cellsEnter = cells.enter()
          .append('g')
          .attr('transform', d => `translate(${d.x0},${d.y0})`);
      
      // Add rectangles
      cellsEnter.append('rect')
          .attr('width', d => d.x1 - d.x0)
          .attr('height', d => d.y1 - d.y0)
          .attr('fill', d => colorScale(d.data.type))
          .attr('opacity', 0.8)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
      
      // Add text labels
      cellsEnter.append('text')
          .attr('x', 3)
          .attr('y', 13)
          .text(d => d.data.name)
          .attr('font-size', '10px')
          .attr('fill', 'white');
      
      // Update existing cells
      cells
          .attr('transform', d => `translate(${d.x0},${d.y0})`)
          .select('rect')
          .attr('width', d => d.x1 - d.x0)
          .attr('height', d => d.y1 - d.y0);
      
      cells.select('text')
          .text(d => d.data.name);
      
      // Add interactivity
      this.treemapGroup.selectAll('g')
          .on('mouseover', (event, d) => this.showTooltip(d, event))
          .on('mouseout', () => this.hideTooltip());
  }
}

// Initialize and render
document.addEventListener('DOMContentLoaded', async () => {
  try {
      console.log('Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted):', 
          new Date().toISOString().slice(0, 19).replace('T', ' '));
      console.log('Current User\'s Login:', window.ruslanbay || 'unknown');
      console.log('Initializing application...');

      const treemap = new D3Treemap('container');
      
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