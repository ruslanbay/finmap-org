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

  // ... rest of your methods remain the same ...
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