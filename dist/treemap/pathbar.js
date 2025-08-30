import { COLOR_SCALE, COLORS, LAYOUT, FONT } from './constants.js';
export class PathbarComponent {
    element = null;
    create(container) {
        this.element = d3.select(container)
            .append('div')
            .style('height', `${LAYOUT.PATHBAR_HEIGHT}px`)
            .style('background-color', COLORS.PATHBAR_BG)
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('padding', '0 10px')
            .style('color', COLORS.TEXT_WHITE)
            .style('font-size', FONT.SIZE.PATHBAR)
            .style('border-bottom', `1px solid ${COLORS.PATHBAR_BORDER}`)
            .style('overflow-x', 'auto')
            .style('white-space', 'nowrap')
            .style('flex-shrink', '0')
            .node();
        return this.element;
    }
    update(path, callbacks) {
        if (!this.element)
            return;
        const pathbarSelection = d3.select(this.element);
        pathbarSelection.selectAll('*').remove();
        const sectionsContainer = pathbarSelection
            .append('div')
            .style('display', 'flex')
            .style('width', '100%')
            .style('height', '100%');
        const sectionWidth = `${100 / path.length}%`;
        path.forEach((item, index) => {
            const isLast = index === path.length - 1;
            const sectorData = this.getSectorDataForNode(item.node);
            const sectorChange = sectorData?.priceChangePct || item.node.change || 0;
            const sectorColor = COLOR_SCALE(sectorChange);
            const section = sectionsContainer
                .append('div')
                .style('width', sectionWidth)
                .style('height', '100%')
                .style('background-color', sectorColor)
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('justify-content', 'center')
                .style('cursor', isLast ? 'default' : 'pointer')
                .style('border-right', index < path.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none')
                .style('transition', 'background-color 0.2s ease')
                .style('position', 'relative');
            section
                .append('span')
                .style('color', COLORS.TEXT_WHITE)
                .style('font-size', FONT.SIZE.PATHBAR)
                .style('font-weight', isLast ? 'normal' : 'bold')
                .style('text-align', 'center')
                .style('overflow', 'hidden')
                .style('text-overflow', 'ellipsis')
                .style('white-space', 'nowrap')
                .style('padding', '0 5px')
                .style('pointer-events', 'none')
                .text(item.name);
            if (!isLast) {
                section
                    .on('click', () => callbacks.onDrill(item.node))
                    .on('mouseenter', (event) => {
                    d3.select(event.currentTarget)
                        .style('background-color', d3.color(sectorColor)?.brighter(0.3)?.toString() || sectorColor);
                })
                    .on('mouseleave', (event) => {
                    d3.select(event.currentTarget)
                        .style('background-color', sectorColor);
                });
            }
            if (sectorData) {
                section
                    .on('mouseenter.tooltip', (event) => {
                    callbacks.onShowTooltip(sectorData, event);
                })
                    .on('mousemove.tooltip', (event) => {
                    callbacks.onShowTooltip(sectorData, event);
                })
                    .on('mouseleave.tooltip', () => {
                    callbacks.onHideTooltip();
                });
            }
        });
    }
    getSectorDataForNode(node) {
        if (node.data && 'exchange' in node.data) {
            return node.data;
        }
        if (node.children && node.children.length > 0) {
            const sectorName = node.name || 'Unknown';
            const sectorChange = node.change || 0;
            const sectorValue = node.value || 0;
            const firstChild = node.children[0];
            const representativeData = firstChild?.data;
            if (representativeData) {
                return {
                    ...representativeData,
                    nameEng: sectorName,
                    nameEngShort: sectorName,
                    ticker: sectorName,
                    priceChangePct: sectorChange,
                    value: sectorValue,
                    marketCap: sectorValue,
                    type: 'sector'
                };
            }
        }
        return null;
    }
}
//# sourceMappingURL=pathbar.js.map