import { COLORS, FONT, FORMATTERS, CURRENCY_SYMBOLS, TRANSITIONS } from './constants.js';
import { getConfig } from '../config.js';
export class OverlayComponent {
    init() {
        // Overlay is created on demand
    }
    show(data) {
        let overlay = document.getElementById('company-overlay');
        if (!overlay) {
            overlay = this.create();
        }
        this.populate(overlay, data);
        d3.select(overlay)
            .style('display', 'flex')
            .style('opacity', '0')
            .transition()
            .duration(TRANSITIONS.OVERLAY_SHOW)
            .style('opacity', '1');
        d3.select('body').style('overflow', 'hidden');
    }
    create() {
        const overlay = d3.select('body')
            .append('div')
            .attr('id', 'company-overlay')
            .style('position', 'fixed')
            .style('top', '0')
            .style('left', '0')
            .style('width', '100%')
            .style('height', '100%')
            .style('background-color', COLORS.OVERLAY_BG)
            .style('z-index', '10000')
            .style('display', 'none')
            .style('align-items', 'center')
            .style('justify-content', 'center');
        const content = overlay
            .append('div')
            .style('background-color', COLORS.OVERLAY_CONTENT)
            .style('color', COLORS.TEXT_WHITE)
            .style('padding', '20px')
            .style('border-radius', '8px')
            .style('width', '90%')
            .style('max-width', '800px')
            .style('max-height', '80%')
            .style('overflow', 'auto')
            .style('position', 'relative');
        content
            .append('button')
            .html('×')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('right', '15px')
            .style('background', 'none')
            .style('border', 'none')
            .style('color', COLORS.TEXT_WHITE)
            .style('font-size', FONT.SIZE.OVERLAY)
            .style('cursor', 'pointer')
            .on('click', () => this.hide());
        content
            .append('div')
            .attr('id', 'overlay-content');
        overlay.on('click', (event) => {
            if (event.target === overlay.node())
                this.hide();
        });
        return overlay.node();
    }
    populate(overlay, data) {
        const contentArea = overlay.querySelector('#overlay-content');
        const config = getConfig();
        const formatCurrency = this.getCurrencyFormatter(config.currency);
        contentArea.innerHTML = `
      <div>
        <h2>${data.ticker} - ${data.nameEng}</h2>
        <div style="margin: 20px 0;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h3>Price Information</h3>
              <p>Current Price: ${formatCurrency(data.priceLastSale)}</p>
              <p>Open Price: ${formatCurrency(data.priceOpen)}</p>
              <p>Change: ${FORMATTERS.percent(data.priceChangePct || 0)}</p>
            </div>
            <div>
              <h3>Market Data</h3>
              <p>Market Cap: ${formatCurrency((data.marketCap) * 1e6)}M</p>
              <p>Volume: ${FORMATTERS.number(data.volume)}</p>
              <p>Value: ${formatCurrency((data.value) * 1e6)}M</p>
              <p>Trades: ${FORMATTERS.number(data.numTrades)}</p>
            </div>
          </div>
          <div style="margin-top: 20px;">
            <h3>Company Details</h3>
            <p>Exchange: ${data.exchange}</p>
            <p>Country: ${data.country}</p>
            <p>Sector: ${data.sector}</p>
            <p>Industry: ${data.industry}</p>
            <p>Listed Since: ${data.listedFrom}</p>
            ${data.listedTill ? `<p>Listed Until: ${data.listedTill}</p>` : ''}
          </div>
        </div>
      </div>
    `;
    }
    hide() {
        const overlay = document.getElementById('company-overlay');
        if (overlay) {
            d3.select(overlay)
                .transition()
                .duration(TRANSITIONS.OVERLAY_HIDE)
                .style('opacity', '0')
                .on('end', () => {
                d3.select(overlay).style('display', 'none');
            });
            d3.select('body').style('overflow', 'auto');
        }
    }
    getCurrencyFormatter(currency) {
        const symbol = CURRENCY_SYMBOLS[currency] || '$';
        return FORMATTERS.currency(symbol);
    }
    destroy() {
        const overlay = document.getElementById('company-overlay');
        if (overlay) {
            d3.select(overlay).remove();
        }
    }
}
//# sourceMappingURL=overlay.js.map