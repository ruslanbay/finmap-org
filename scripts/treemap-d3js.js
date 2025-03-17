class WebGLTreemap {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.tooltip = document.getElementById('tooltip');

    // Initialize PIXI Application with v8.8.1 syntax
    this.app = new PIXI.Application({
      width: this.container.clientWidth,
      height: this.container.clientHeight,
      backgroundColor: 0xffffff,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      // PIXI v8 specific options
      preference: 'webgl2'
    });

    // In PIXI v8, we need to render first
    this.app.renderer.render(this.app.stage);

    // Then we can access the view
    const canvas = this.app.renderer.view;
    this.container.appendChild(canvas);

    // Create container for treemap nodes
    this.nodesContainer = new PIXI.Container();
    this.app.stage.addChild(this.nodesContainer);

    // Image texture cache
    this.textureCache = new Map();

    // Bind events
    this.bindEvents();
  }

  bindEvents() {
    // Handle hover events
    const canvas = this.app.renderer.view;
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
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;

      this.app.renderer.resize(width, height);

      if (this.currentData) {
        this.render(this.currentData);
      }
    });
  }

  async loadTexture(url) {
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url);
    }

    try {
      // Use PIXI.Assets for texture loading in v8
      const texture = await PIXI.Assets.load(url);
      this.textureCache.set(url, texture);
      return texture;
    } catch (error) {
      console.error('Failed to load texture:', url, error);
      // Load fallback texture
      return PIXI.Assets.load('https://via.placeholder.com/200');
    }
  }

  // ... rest of your code remains the same ...
}

// Initialize and render with proper error handling
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('PIXI Version:', PIXI.VERSION);
    console.log('Initializing application...');

    // Initialize PIXI Assets
    await PIXI.Assets.init();

    const treemap = new WebGLTreemap('container');

    // Load your data
    try {
      const response = await fetch('your-data-endpoint.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      console.log('Data loaded, rendering treemap...');
      await treemap.render(data);
      console.log('Render complete');
    } catch (error) {
      console.error('Data loading or rendering error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Failed to initialize or render treemap:', error);
    const container = document.getElementById('container');
    container.innerHTML = `
          <div style="padding: 20px; color: red;">
              <h3>Error Initializing Treemap</h3>
              <p>${error.message}</p>
              <p>Stack: ${error.stack}</p>
              <p>Time: ${new Date().toISOString()}</p>
              <p>User: ${window.ruslanbay || 'unknown'}</p>
              <p>PIXI Version: ${PIXI.VERSION}</p>
              <p>Browser: ${navigator.userAgent}</p>
              <p>Screen: ${window.innerWidth}x${window.innerHeight}</p>
              <p>WebGL Support: ${PIXI.utils.isWebGLSupported()}</p>
          </div>
      `;
  }
});