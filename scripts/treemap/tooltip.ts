import { COLOR_SCALE, COLORS, LAYOUT, FONT, FORMATTERS, CURRENCY_SYMBOLS, TRANSITIONS } from './constants.js';
import type { MarketData } from '../../types.js';
import { getConfig } from '../../config.js';

declare const d3: any;

export class TooltipComponent {
  private element: HTMLElement | null = null;

  init(): void {
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

  show(data: MarketData, event: MouseEvent, node?: any): void {
    if (!this.element) return;

    const config = getConfig();
    const formatCurrency = this.getCurrencyFormatter(config.currency);
    const isPortfolio = localStorage.getItem('finmap-portfolio-mode') === 'true';
    const change = data?.priceChangePct || 0;
    const nodeColor = COLOR_SCALE(change);

    const isSector = node && node.children && node.children.length > 0;
    const percentParent = node && node.parent ? (node.value || 0) / (node.parent.value || 1) * 100 : 100;
    
    let portfolioInfo = '';
    if (isPortfolio && !isSector) {
      const storedFilters = localStorage.getItem('finmap-filters');
      if (storedFilters) {
        const filters = JSON.parse(storedFilters);
        const tickerIndex = filters.tickers?.indexOf(data.ticker);
        if (tickerIndex >= 0 && filters.amounts?.[tickerIndex]) {
          const amount = filters.amounts[tickerIndex];
          const portfolioValue = (data.priceLastSale || 0) * amount;
          portfolioInfo = `<div>Holdings: ${amount.toLocaleString()} shares</div><div>Portfolio Value: ${formatCurrency(portfolioValue)}</div>`;
        }
      }
    }

    this.element.style.background = nodeColor;
    this.element.style.color = COLORS.TEXT_WHITE;
    this.element.style.border = '2px solid white';
    this.element.style.boxShadow = COLORS.TOOLTIP_SHADOW;

    this.element.innerHTML = `
      <div style="margin-bottom: 4px;"><b>${data.ticker}</b></div>
      <div style="margin-bottom: 2px;">${data.nameEng}</div>
      <div style="margin-bottom: 2px;">${formatCurrency(data.priceLastSale || 0)} (${FORMATTERS.percent(data.priceChangePct || 0)})</div>
      <div style="margin-bottom: 2px;">MarketCap: ${formatCurrency((data.marketCap || 0) * 1e6)}M</div>
      <div style="margin-bottom: 2px;">Volume: ${FORMATTERS.number(data.volume || 0)}</div>
      <div style="margin-bottom: 2px;">Value: ${formatCurrency((data.value || 0) * 1e6)}M</div>
      <div style="margin-bottom: 2px;">Trades: ${FORMATTERS.number(data.numTrades || 0)}</div>
      <div style="margin-bottom: 2px;">Country: ${data.country || 'N/A'}</div>
      <div style="margin-bottom: 2px;">Exchange: ${data.exchange || 'N/A'}</div>
      <div style="margin-bottom: 2px;">Listed Since: ${data.listedFrom || 'N/A'}</div>
      <div style="margin-bottom: 2px;">Industry: ${data.industry || 'N/A'}</div>
      <div style="margin-bottom: 2px;">% of Sector: ${percentParent.toFixed(2)}%</div>
      ${portfolioInfo}
    `;

    this.position(event);
    this.element.style.opacity = '1';
  }

  showPathbar(data: MarketData, event: MouseEvent): void {
    if (!this.element) return;

    const config = getConfig();
    const formatCurrency = this.getCurrencyFormatter(config.currency);
    const change = data?.priceChangePct || 0;
    const nodeColor = COLOR_SCALE(change);

    this.element.style.background = nodeColor;
    this.element.style.color = COLORS.TEXT_WHITE;
    this.element.style.border = '2px solid white';
    this.element.style.boxShadow = COLORS.TOOLTIP_SHADOW;

    this.element.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">${data.nameEng}</div>
      <div style="margin-bottom: 2px;">Change: ${FORMATTERS.percent(change / 100)}</div>
      <div style="margin-bottom: 2px;">${config.dataType === 'marketcap' ? 'Market Cap' : 
        config.dataType === 'value' ? 'Value' : 
        config.dataType === 'trades' ? 'Trades' : 'Items'}: ${formatCurrency(data.value || data.marketCap)}</div>
      ${data.type === 'sector' ? `<div style="margin-bottom: 2px;">Sector</div>` : 
        `<div style="margin-bottom: 2px;">Ticker: ${data.ticker}</div>`}
    `;

    this.position(event);
    this.element.style.opacity = '1';
  }

  private position(event: MouseEvent): void {
    if (!this.element) return;

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

  hide(): void {
    if (!this.element) return;

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

  private getCurrencyFormatter(currency: string) {
    const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || '$';
    return FORMATTERS.currency(symbol);
  }

  destroy(): void {
    if (this.element) {
      d3.select(this.element).remove();
      this.element = null;
    }
  }
}
