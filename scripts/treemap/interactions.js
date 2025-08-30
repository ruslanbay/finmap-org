import { TRANSITIONS } from './constants.js';
export class InteractionHandler {
    canvas = null;
    callbacks = null;
    init(canvas, callbacks) {
        this.canvas = canvas;
        this.callbacks = callbacks;
        this.setupEventListeners();
    }
    setupEventListeners() {
        if (!this.canvas || !this.callbacks)
            return;
        const canvasSelection = d3.select(this.canvas);
        this.canvas.addEventListener('click', (event) => {
            if (this.callbacks.isTransitioning())
                return;
            const node = this.callbacks.onNodeAtPosition(event);
            if (!node?.data)
                return;
            if (node.children?.length > 0) {
                this.callbacks.onDrill(node.data);
            }
            else if (node.data.data) {
                this.callbacks.onShowCompany(node.data.data);
            }
        });
        this.canvas.addEventListener('mouseenter', () => {
            if (!this.callbacks.isTransitioning()) {
                canvasSelection
                    .transition()
                    .duration(TRANSITIONS.HOVER)
                    .style('filter', 'brightness(1.05)');
            }
        });
        this.canvas.addEventListener('mouseleave', () => {
            canvasSelection
                .transition()
                .duration(TRANSITIONS.HOVER)
                .style('filter', 'brightness(1)')
                .style('cursor', 'default');
            this.callbacks.onHideTooltip();
        });
        this.canvas.addEventListener('mousemove', (event) => {
            if (this.callbacks.isTransitioning())
                return;
            const node = this.callbacks.onNodeAtPosition(event);
            if (!node?.data) {
                this.callbacks.onHideTooltip();
                canvasSelection.style('cursor', 'default');
                return;
            }
            const isLeaf = !node.children?.length;
            const tooltipData = isLeaf ? node.data.data : node.data;
            if (tooltipData) {
                this.callbacks.onShowTooltip(tooltipData, event, node);
                canvasSelection.style('cursor', 'pointer');
            }
        });
    }
}
