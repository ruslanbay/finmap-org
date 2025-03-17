class WebGLTreemap {
  constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.tooltip = document.getElementById('tooltip');

      // Initialize PIXI Application with v8 syntax
      this.app = new PIXI.Application({
          width: this.container.clientWidth,
          height: this.container.clientHeight,
          backgroundColor: 0xffffff,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          // Add new required properties for PIXI v8
          preference: 'webgl', // or 'webgpu'
          // Create and append canvas automatically
          eventMode: 'static',
          eventFeatures: {
              move: true,
              globalMove: true,
              click: true,
              wheel: true
          }
      });

      // In PIXI v8, we need to manually append the view
      this.container.appendChild(this.app.canvas);

      // Create container for treemap nodes
      this.nodesContainer = new PIXI.Container();
      this.app.stage.addChild(this.nodesContainer);

      // Image texture cache
      this.textureCache = new Map();

      // Bind events
      this.bindEvents();
  }

  bindEvents() {
      // Handle hover events - Updated for PIXI v8
      this.app.canvas.addEventListener('mousemove', (e) => {
          const bounds = this.app.canvas.getBoundingClientRect();
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

      // Handle window resize - Updated for PIXI v8
      window.addEventListener('resize', () => {
          this.app.renderer.resize(
              this.container.clientWidth,
              this.container.clientHeight
          );
          if (this.currentData) {
              this.render(this.currentData);
          }
      });
  }

  async loadTexture(url) {
      if (this.textureCache.has(url)) {
          return this.textureCache.get(url);
      }

      // Updated texture loading for PIXI v8
      try {
          const texture = await PIXI.Assets.load(url);
          this.textureCache.set(url, texture);
          return texture;
      } catch (error) {
          console.error('Failed to load texture:', url, error);
          // Load fallback texture
          return PIXI.Assets.load('https://via.placeholder.com/200');
      }
  }

  // Rest of your code remains the same...
}

// Initialize and render with proper error handling
document.addEventListener('DOMContentLoaded', async () => {
  try {
      // Initialize PIXI assets before creating the treemap
      await PIXI.Assets.init();

      const treemap = new WebGLTreemap('container');
      
      // Example data (replace with your actual data fetch)
      const data = {
          securities: {
              columns: ["exchange", "country", "type", "sector", /* ... */],
              data: [/* your data array */]
          }
      };

      // Render the treemap
      await treemap.render(data);

  } catch (error) {
      console.error('Failed to initialize or render treemap:', error);
      const container = document.getElementById('container');
      container.innerHTML = `
          <div style="padding: 20px; color: red;">
              <h3>Error Initializing Treemap</h3>
              <p>${error.message}</p>
              <p>Time: ${new Date().toISOString()}</p>
              <p>User: ${window.ruslanbay || 'unknown'}</p>
          </div>
      `;
  }
});