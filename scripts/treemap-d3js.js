class WebGLTreemap {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.tooltip = document.getElementById('tooltip');

    // Check WebGL support first using modern API
    if (!('WebGL2RenderingContext' in window)) {
      throw new Error('WebGL2 is not supported in your browser');
    }

    // Initialize PIXI Application with v8.8.1 syntax
    this.app = new PIXI.Application({
      width: this.container.clientWidth,
      height: this.container.clientHeight,
      backgroundColor: 0xFFFFFF,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      preference: 'webgl2',
      powerPreference: 'high-performance'
    });

    // Get the renderer's canvas
    const renderer = this.app.renderer;
    if (!renderer) {
      throw new Error('Failed to create PIXI renderer');
    }

    this.container.appendChild(renderer.canvas);

    // Create container for treemap nodes
    this.nodesContainer = new PIXI.Container();
    this.app.stage.addChild(this.nodesContainer);

    // Image texture cache
    this.textureCache = new Map();

    // Bind events
    this.bindEvents();
  }

  async loadTexture(url) {
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url);
    }

    return new Promise((resolve, reject) => {
      const texture = PIXI.Texture.from(url);
      texture.on('loaded', () => {
        this.textureCache.set(url, texture);
        resolve(texture);
      });
      texture.on('error', reject);
    });
  }

  bindEvents() {
    // Handle hover events using the renderer's canvas
    const canvas = this.app.renderer.canvas;
    canvas.addEventListener('mousemove', (e) => {
      const bounds = canvas.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;

      const hit = this.nodesContainer.children.find(node => {
        return x >= node.x && x <= node.x + node.width &&
          y >= node.y && y <= node.y + node.height;
      });

      if (hit) {
        this.showTooltip(hit.data, e.clientX, e.clientY);
      } else {
        this.hideTooltip();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.app && this.app.renderer) {
        this.app.renderer.resize(
          this.container.clientWidth,
          this.container.clientHeight
        );
        if (this.currentData) {
          this.render(this.currentData);
        }
      }
    });
  }

  showTooltip(data, x, y) {
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${x + 10}px`;
    this.tooltip.style.top = `${y + 10}px`;
    this.tooltip.innerHTML = `
          <div>Name: ${data.name}</div>
          <div>Value: ${data.value}</div>
      `;
  }

  hideTooltip() {
    this.tooltip.style.display = 'none';
  }

  async render(data) {
    // Transform the data into hierarchical structure
    const hierarchicalData = this.transformData(data);

    this.currentData = data;

    // Clear previous nodes
    this.nodesContainer.removeChildren();

    // Create D3 treemap layout
    const treemap = d3.treemap()
      .size([this.app.screen.width, this.app.screen.height])
      .padding(1)
      .round(true);

    // Process data with D3
    const root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    treemap(root);

    // Create sprite batch for better performance
    const batch = new PIXI.ParticleContainer(50000, {
      position: true,
      uvs: true,
      tint: true
    });
    this.nodesContainer.addChild(batch);

    // Render nodes
    for (const node of root.leaves()) {
      try {
        const texture = await this.loadTexture(node.data.imageUrl);

        const sprite = new PIXI.Sprite(texture);
        sprite.x = node.x0;
        sprite.y = node.y0;
        sprite.width = node.x1 - node.x0;
        sprite.height = node.y1 - node.y0;
        sprite.alpha = 0.9; // Slight transparency
        sprite.data = node.data;

        batch.addChild(sprite);

        // Add border using Graphics (not included in ParticleContainer)
        const border = new PIXI.Graphics();
        border.lineStyle(1, 0x000000, 0.3);
        border.drawRect(node.x0, node.y0, node.x1 - node.x0, node.y1 - node.y0);
        this.nodesContainer.addChild(border);
      } catch (error) {
        console.error(`Failed to load image for node: ${node.data.name}`, error);
      }
    }
  }

  transformData(securitiesData) {
    const { columns, data } = securitiesData.securities;
  
    // Create an index map for column names
    const columnIndex = {};
    columns.forEach((col, idx) => columnIndex[col] = idx);
  
    // Helper function to create a node object from a row
    const createNode = (row) => ({
      name: row[columnIndex.nameEng],
      value: row[columnIndex.marketCap],
      type: row[columnIndex.type],
      sector: row[columnIndex.sector],
      ticker: row[columnIndex.ticker],
      imageUrl: this.getImageUrl(row[columnIndex.ticker]), // You'll need to implement this
      rawData: row // Keep the original data for tooltip
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

  getImageUrl(ticker) {
    // Implement your image URL generation logic here
    // For example:
    return `https://ruslanbay.github.io/finmap-org/images/icons/favicon.png`;
    // Or use a default image if none available:
    // return 'https://via.placeholder.com/200';
  }

  // Enhance tooltip to show more information
  showTooltip(data, x, y) {
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${x + 10}px`;
    this.tooltip.style.top = `${y + 10}px`;

    // Access the raw data for detailed tooltip
    const row = data.rawData;
    const columns = this.currentData.securities.columns;

    this.tooltip.innerHTML = `
        <div><strong>${data.name}</strong></div>
        <div>Type: ${data.type}</div>
        <div>Ticker: ${data.ticker}</div>
        <div>Market Cap: $${data.value.toFixed(2)}</div>
        ${data.sector ? `<div>Sector: ${data.sector}</div>` : ''}
    `;
  }
}

// Initialize and render with proper error handling
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Current Date and Time (UTC):', new Date().toISOString());
    console.log('Current User\'s Login:', window.ruslanbay || 'unknown');
    console.log('PIXI Version:', PIXI.VERSION);
    console.log('Initializing application...');

    // Check WebGL2 support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL2 is not supported in your browser');
    }

    // Initialize PIXI Assets
    if (PIXI.Assets) {
      await PIXI.Assets.init();
    }

    const treemap = new WebGLTreemap('container');

    // Example data (replace with your actual data)
    const data = {
      securities: {
        columns: ["exchange", "country", "type", "sector"],
        data: [/* your data array */]
      }
    };

    console.log('Rendering treemap...');
    await treemap.render(data);
    console.log('Render complete');

  } catch (error) {
    console.error('Failed to initialize or render treemap:', error);
    const container = document.getElementById('container');
    container.innerHTML = `
            <div style="padding: 20px; color: red;">
                <h3>Error Initializing Treemap</h3>
                <p>Error: ${error.message}</p>
                <p>Stack: ${error.stack}</p>
                <p>Time: ${new Date().toISOString()}</p>
                <p>User: ${window.ruslanbay || 'unknown'}</p>
                <p>PIXI Version: ${PIXI.VERSION}</p>
                <p>Browser: ${navigator.userAgent}</p>
                <p>Screen: ${window.innerWidth}x${window.innerHeight}</p>
                <p>WebGL2 Support: ${!!window.WebGL2RenderingContext}</p>
            </div>
        `;
  }
});