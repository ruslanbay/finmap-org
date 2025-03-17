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
      preference: 'webgl2',
      hello: true // enables the "Hello WebGL" message
    });

    // Create the view and append it
    const view = this.app.view;
    if (view instanceof HTMLCanvasElement) {
      this.container.appendChild(view);
    } else {
      throw new Error('Failed to create PIXI canvas element');
    }

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
    const view = this.app.view;
    if (view instanceof HTMLCanvasElement) {
      view.addEventListener('mousemove', (e) => {
        const bounds = view.getBoundingClientRect();
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
    }

    // Handle window resize
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

  // ... rest of your code remains the same ...
}

// Initialize and render with proper error handling
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Initializing application...');
    console.log('Time:', new Date().toISOString());
    console.log('User:', window.ruslanbay || 'unknown');

    // Initialize PIXI
    await PIXI.Assets.init();

    // Create treemap instance
    const treemap = new WebGLTreemap('container');

    // Example data (replace with your actual data)
    const data = {
      securities: {
        columns: ["exchange", "country", "type", "sector", /* ... */],
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
              <p>${error.message}</p>
              <p>Stack: ${error.stack}</p>
              <p>Time: ${new Date().toISOString()}</p>
              <p>User: ${window.ruslanbay || 'unknown'}</p>
              <p>PIXI Version: ${PIXI.VERSION}</p>
              <p>Browser: ${navigator.userAgent}</p>
          </div>
      `;
  }
});