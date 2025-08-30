import type { MarketData, ChartRenderer } from '../types.js';
import { buildHierarchy, getValueForDataType } from './data.js';
import { LAYOUT, TRANSITIONS } from './constants.js';
import { PathbarComponent } from './pathbar.js';
import { TooltipComponent } from './tooltip.js';
import { OverlayComponent } from './overlay.js';
import { CanvasRenderer } from './renderer.js';
import { InteractionHandler } from './interactions.js';

declare const d3: any;

function getCanvasSize(container: DOMRect): { width: number; height: number } {
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  return {
    width: container.width * devicePixelRatio,
    height: (container.height - LAYOUT.PATHBAR_HEIGHT - LAYOUT.FOOTER_HEIGHT) * devicePixelRatio
  };
}

function getViewportSize(container: DOMRect): { width: number; height: number } {
  return {
    width: container.width,
    height: container.height - LAYOUT.PATHBAR_HEIGHT - LAYOUT.FOOTER_HEIGHT
  };
}

export class TreemapChart implements ChartRenderer {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private currentData: MarketData[] = [];
  private hierarchy: any = null;
  private currentRoot: any = null;
  private rootNode: any = null;
  private nodes: any[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private isTransitioning: boolean = false;

  private pathbar: PathbarComponent;
  private tooltip: TooltipComponent;
  private overlay: OverlayComponent;
  private renderer: CanvasRenderer;
  private interactions: InteractionHandler;

  constructor() {
    this.pathbar = new PathbarComponent();
    this.tooltip = new TooltipComponent();
    this.overlay = new OverlayComponent();
    this.renderer = new CanvasRenderer();
    this.interactions = new InteractionHandler();
  }

  render(data: MarketData[], container: HTMLElement): void {
    this.container = container;
    this.currentData = data;
    
    this.setupContainer();
    this.setupCanvas();
    this.buildHierarchyData();
    this.setupComponents();
    this.setupResizeObserver();
    this.renderTreemap();
  }

  private setupContainer(): void {
    if (!this.container) return;
    
    d3.select(this.container)
      .selectAll('*')
      .remove();
    
    d3.select(this.container)
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('height', '100%');
  }

  private setupCanvas(): void {
    if (!this.container) return;
    
    const pathbarElement = this.pathbar.create(this.container);
    
    this.canvas = d3.select(this.container)
      .append('canvas')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'block')
      .style('cursor', 'pointer')
      .style('flex-grow', '1')
      .node();
    
    this.updateCanvasSize();
  }

  private updateCanvasSize(): void {
    if (!this.canvas || !this.container) return;
    
    const rect = this.container.getBoundingClientRect();
    const { width, height } = getCanvasSize(rect);
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    this.context = this.canvas.getContext('2d');
    if (this.context) {
      this.context.scale(devicePixelRatio, devicePixelRatio);
    }
  }

  private buildHierarchyData(): void {
    this.hierarchy = buildHierarchy(this.currentData);
    this.rootNode = this.hierarchy;
    this.currentRoot = this.hierarchy;
  }

  private setupComponents(): void {
    this.tooltip.init();
    this.overlay.init();
    
    if (this.canvas) {
      this.interactions.init(this.canvas, {
        onDrill: (node) => this.drillTo(node),
        onShowCompany: (data) => this.overlay.show(data),
        onShowTooltip: (data, event, node) => this.tooltip.show(data, event, node),
        onHideTooltip: () => this.tooltip.hide(),
        onNodeAtPosition: (event) => this.getNodeAtPosition(event),
        isTransitioning: () => this.isTransitioning
      });
    }
  }

  private setupResizeObserver(): void {
    if (!this.container) return;
    
    this.resizeObserver = new ResizeObserver(() => {
      this.updateCanvasSize();
      this.renderTreemap();
    });
    this.resizeObserver.observe(this.container);
  }

  private renderTreemap(): void {
    if (!this.canvas || !this.context || !this.container || !this.hierarchy) return;
    
    const rect = this.container.getBoundingClientRect();
    const { width, height } = getViewportSize(rect);
    
    const currentHierarchy = this.currentRoot === this.rootNode 
      ? this.hierarchy 
      : d3.hierarchy(this.currentRoot)
          .sum((d: any) => d.children ? 0 : getValueForDataType(d))
          .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
    
    const treemap = d3.treemap()
      .size([width, height])
      .paddingTop((d: any) => d.children ? LAYOUT.SECTOR_HEADER_HEIGHT : LAYOUT.PADDING.TOP)
      .paddingInner(LAYOUT.PADDING.INNER)
      .paddingOuter(LAYOUT.PADDING.OUTER)
      .paddingRight(LAYOUT.PADDING.RIGHT)
      .paddingBottom(LAYOUT.PADDING.BOTTOM)
      .paddingLeft(LAYOUT.PADDING.LEFT)
      .round(true);
    
    treemap(currentHierarchy);
    this.nodes = currentHierarchy.descendants();
    
    this.adjustNodesForSectorHeaders();
    this.context.clearRect(0, 0, width, height);
    
    this.pathbar.update(this.getPathToRoot(this.currentRoot), {
      onDrill: (node) => this.drillTo(node),
      onShowTooltip: (data, event) => this.tooltip.show(data, event),
      onHideTooltip: () => this.tooltip.hide()
    });
    
    this.renderer.render(this.nodes, this.context);
  }

  private adjustNodesForSectorHeaders(): void {
    this.nodes.forEach((node: any) => {
      if (node.children && node.children.length > 0) {
        const sectorTop = node.y0;
        const sectorHeight = node.y1 - node.y0;
        const availableHeight = sectorHeight - LAYOUT.SECTOR_HEADER_HEIGHT;
        
        if (availableHeight > 0) {
          node.children.forEach((child: any) => {
            const isLeafChild = !child.children || child.children.length === 0;
            if (isLeafChild) {
              const childHeight = child.y1 - child.y0;
              const newChildHeight = (childHeight / sectorHeight) * availableHeight;
              
              child.y0 = sectorTop + LAYOUT.SECTOR_HEADER_HEIGHT + ((child.y0 - sectorTop) / sectorHeight) * availableHeight;
              child.y1 = child.y0 + newChildHeight;
            }
          });
        }
      }
    });
  }

  private drillTo(node: any): void {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.tooltip.hide();
    
    this.currentRoot = node;
    
    if (this.canvas) {
      d3.select(this.canvas)
        .style('opacity', 1)
        .transition()
        .duration(TRANSITIONS.DRILL)
        .style('opacity', 0.3)
        .transition()
        .duration(TRANSITIONS.DRILL)
        .style('opacity', 1)
        .on('end', () => {
          this.isTransitioning = false;
        });
    }
    
    setTimeout(() => {
      this.renderTreemap();
    }, TRANSITIONS.DRILL);
  }

  private getPathToRoot(node: any): any[] {
    const path: any[] = [];
    let current = node;
    
    while (current) {
      path.unshift({
        name: current.name || 'Market',
        node: current
      });
      current = current.parent || null;
    }
    
    return path;
  }

  private getNodeAtPosition(event: MouseEvent): any {
    if (!this.canvas || !this.nodes) return null;
    
    const rect = this.canvas.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    const x = (event.clientX - rect.left) * (this.canvas.width / rect.width) / devicePixelRatio;
    const y = (event.clientY - rect.top) * (this.canvas.height / rect.height) / devicePixelRatio;
    
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (node?.x0 <= x && x <= node?.x1 && node?.y0 <= y && y <= node?.y1) {
        return node;
      }
    }
    
    return null;
  }

  public searchAndHighlight(query: string): void {
    if (!this.nodes || !query.trim()) return;
    
    const searchQuery = query.toLowerCase();
    const matchingNode = this.nodes.find(node => 
      !node.children?.length && node.data.data && (
        node.data.ticker.toLowerCase().includes(searchQuery) ||
        node.data.name.toLowerCase().includes(searchQuery)
      )
    );
    
    if (matchingNode?.data.data) {
      this.overlay.show(matchingNode.data.data as MarketData);
    }
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.tooltip.destroy();
    this.overlay.destroy();
    if (this.container) {
      d3.select(this.container).selectAll('*').remove();
    }
  }
}

export { TreemapChart as D3TreemapRenderer };
