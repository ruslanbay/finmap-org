import { COLOR_SCALE, COLORS, LAYOUT, FONT, TRANSITIONS } from './constants.js';
import { getConfig } from '../config.js';
export class TooltipComponent {
    element = null;
    init() {
        this.element = d3.select('body')
            .append('div')
            .style('position', 'absolute')
            .style('background', 'white')
            .style('color', 'rgb(68, 68, 68)')
            .style('border', '1px solid rgb(214, 214, 214)')
            .style('border-radius', '2px')
            .style('font-family', FONT.FAMILY)
            .style('font-size', FONT.SIZE.TOOLTIP)
            .style('font-weight', 'normal')
            .style('line-height', '1.3')
            .style('white-space', 'nowrap')
            .style('padding', '4px 6px')
            .style('pointer-events', 'none')
            .style('opacity', '0')
            .style('transition', `opacity ${TRANSITIONS.TOOLTIP}ms ease-out`)
            .style('z-index', '1001')
            .style('box-shadow', COLORS.TOOLTIP_SHADOW)
            .style('margin', '0')
            .style('text-align', 'left')
            .style('direction', 'ltr')
            .style('max-width', 'none')
            .style('word-wrap', 'normal')
            .node();
    }
    show(data, event, node) {
        if (!this.element)
            return;
        // Extract MarketData from the node structure
        let marketData;
        let hierarchyNode = node;
        if (data && typeof data === 'object' && 'ticker' in data) {
            // Direct MarketData passed
            marketData = data;
        }
        else if (node && node.data && node.data.data) {
            // D3 hierarchy node structure: {data: {data: MarketData}}
            marketData = node.data.data;
        }
        else if (node && node.data) {
            // TreemapNode structure: {data: MarketData}
            marketData = node.data;
        }
        else {
            return; // Can't extract valid data
        }
        const config = getConfig();
        const isPortfolio = localStorage.getItem('finmap-portfolio-mode') === 'true';
        const change = marketData?.priceChangePct || 0;
        const nodeColor = COLOR_SCALE(change);
        const isSector = hierarchyNode && hierarchyNode.children && hierarchyNode.children.length > 0;
        // Fix percentage calculations
        let percentParent = 100;
        let percentRoot = 100;
        if (hierarchyNode) {
            const nodeValue = hierarchyNode.value || 0;
            if (hierarchyNode.parent && hierarchyNode.parent.value) {
                percentParent = (nodeValue / hierarchyNode.parent.value) * 100;
            }
            // Find root node
            let root = hierarchyNode;
            while (root.parent) {
                root = root.parent;
            }
            if (root.value) {
                percentRoot = (nodeValue / root.value) * 100;
            }
        }
        let portfolioInfo = '';
        if (isPortfolio && !isSector) {
            const storedFilters = localStorage.getItem('finmap-filters');
            if (storedFilters) {
                const filters = JSON.parse(storedFilters);
                const tickerIndex = filters.tickers?.indexOf(marketData.ticker);
                if (tickerIndex >= 0 && filters.amounts?.[tickerIndex]) {
                    const amount = filters.amounts[tickerIndex];
                    const portfolioValue = (marketData.priceLastSale || 0) * amount;
                    portfolioInfo = `<div>Holdings: ${amount.toLocaleString()} shares</div><div>Portfolio Value: ${d3.format(',.0f')(portfolioValue)}</div>`;
                }
            }
        }
        this.element.style.background = nodeColor;
        this.element.style.color = COLORS.TEXT_WHITE;
        this.element.style.border = '2px solid white';
        this.element.style.boxShadow = COLORS.TOOLTIP_SHADOW;
        this.element.innerHTML = `
      <div style="margin-bottom: 4px;"><b>${marketData.ticker}</b></div>
      <div style="margin-bottom: 2px;">${marketData.nameEng}</div>
      <div style="margin-bottom: 2px;">${marketData.priceLastSale || 0} (${d3.format('.2f')(marketData.priceChangePct || 0)}%)</div>
      <div style="margin-bottom: 2px;">MarketCap: ${d3.format(',.0f')((marketData.marketCap || 0) / 1e6)}M</div>
      <div style="margin-bottom: 2px;">Volume: ${d3.format(',.0f')(marketData.volume || 0)}</div>
      <div style="margin-bottom: 2px;">Value: ${d3.format(',.0f')((marketData.value || 0) / 1e6)}M</div>
      <div style="margin-bottom: 2px;">Trades: ${d3.format(',.0f')(marketData.numTrades || 0)}</div>
      <div style="margin-bottom: 2px;">Country: ${marketData.country || 'N/A'}</div>
      <div style="margin-bottom: 2px;">Exchange: ${marketData.exchange || 'N/A'}</div>
      <div style="margin-bottom: 2px;">Listed Since: ${marketData.listedFrom || 'N/A'}</div>
      <div style="margin-bottom: 2px;">Industry: ${marketData.industry || 'N/A'}</div><br>
      <div style="margin-bottom: 2px;">% of Sector: ${d3.format('.2f')(percentParent)}%</div>
      <div style="margin-bottom: 2px;">% of Total Market: ${d3.format('.2f')(percentRoot)}%</div>
      <div style="margin-bottom: 2px;">Items per Sector: ${d3.format(',.0f')(marketData.nestedItemsCount || 0)}</div>
      ${portfolioInfo}
    `;
        this.position(event);
        this.element.style.opacity = '1';
    }
    position(event) {
        if (!this.element)
            return;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipSelection = d3.select(this.element)
            .style('visibility', 'hidden')
            .style('opacity', '1');
        const { width: tooltipWidth, height: tooltipHeight } = this.element.getBoundingClientRect();
        const offset = LAYOUT.TOOLTIP_OFFSET;
        const left = event.clientX + tooltipWidth + offset > viewportWidth
            ? event.clientX - tooltipWidth - offset
            : event.clientX + offset;
        const top = event.clientY + tooltipHeight + offset > viewportHeight
            ? event.clientY - tooltipHeight - offset
            : event.clientY + offset;
        tooltipSelection
            .style('visibility', 'visible')
            .style('left', `${Math.max(0, Math.min(left, viewportWidth - tooltipWidth))}px`)
            .style('top', `${Math.max(0, Math.min(top, viewportHeight - tooltipHeight))}px`)
            .style('opacity', '1');
    }
    hide() {
        if (!this.element)
            return;
        d3.select(this.element)
            .transition()
            .duration(TRANSITIONS.TOOLTIP)
            .style('opacity', '0')
            .on('end', () => {
            if (this.element) {
                d3.select(this.element)
                    .style('background', 'white')
                    .style('color', 'rgb(68, 68, 68)')
                    .style('border', '2px solid white')
                    .style('text-align', 'left');
            }
        });
    }
    destroy() {
        if (this.element) {
            d3.select(this.element).remove();
            this.element = null;
        }
    }
}
//# sourceMappingURL=tooltip.js.map