// Modern finmap.org application entry point

import { HistogramRenderer } from './lib/charts/HistogramRenderer.js';
import { TreemapRenderer } from './lib/charts/TreemapRenderer.js';
import { MarketDataService } from './lib/data/MarketDataService.js';
import { DEFAULT_DATA_TYPE, DEFAULT_EXCHANGE } from './lib/utils/constants.js';
import { formatMarketCap, formatPercentage } from './lib/utils/index.js';
import './style.css';
import type { ChartData, DataType, Exchange, MarketSecurity } from './types/index.js';

class FinmapApp {
  private treemapRenderer: TreemapRenderer | null = null;
  private histogramRenderer: HistogramRenderer | null = null;
  private currentRenderer: TreemapRenderer | HistogramRenderer | null = null;
  private currentExchange: Exchange = DEFAULT_EXCHANGE;
  private currentDataType: DataType = DEFAULT_DATA_TYPE;
  private currentChartType: 'treemap' | 'histogram' = 'treemap';
  private currentData: ChartData | null = null;
  private isLoading = false;

  // DOM elements
  private chartContainer: HTMLElement;
  private exchangeSelector: HTMLSelectElement;
  private dataTypeSelector: HTMLSelectElement;
  private chartTypeSelector: HTMLSelectElement;
  private searchBox: HTMLInputElement;
  private refreshBtn: HTMLButtonElement;
  private loadingSpinner: HTMLElement;
  private marketStats: HTMLElement;

  constructor() {
    console.log('🚀 Initializing FinmapApp...');
    this.initializeDOM();
    this.setupEventListeners();
    this.initialize();
  }

  private initializeDOM(): void {
    // Get DOM elements
    this.chartContainer = document.getElementById('chartContainer')!;
    this.exchangeSelector = document.getElementById('exchangeSelector') as HTMLSelectElement;
    this.dataTypeSelector = document.getElementById('dataType') as HTMLSelectElement;
    this.chartTypeSelector = document.getElementById('chartType') as HTMLSelectElement;
    this.searchBox = document.getElementById('searchBox') as HTMLInputElement;
    this.refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
    this.loadingSpinner = document.getElementById('loadingSpinner')!;
    this.marketStats = document.getElementById('marketStats')!;

    // Set initial values
    this.exchangeSelector.value = this.currentExchange;
    this.dataTypeSelector.value = this.currentDataType;
  }

  private setupEventListeners(): void {
    // Exchange selector
    this.exchangeSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.currentExchange = target.value as Exchange;
      this.loadData();
    });

    // Data type selector
    this.dataTypeSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.currentDataType = target.value as DataType;
      this.renderCurrentData();
    });

    // Chart type selector
    this.chartTypeSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.currentChartType = target.value as 'treemap' | 'histogram';
      this.renderCurrentData();
    });

    // Search box
    let searchTimeout: number;
    this.searchBox.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const target = e.target as HTMLInputElement;
      const query = target.value.trim();

      searchTimeout = window.setTimeout(() => {
        if (query && this.currentRenderer) {
          const found = this.currentRenderer.searchAndHighlight(query);
          if (!found) {
            this.showMessage(`No results found for "${query}"`);
          }
        } else if (this.currentRenderer) {
          // Clear highlights
          this.currentRenderer.highlightSecurities([]);
        }
      }, 300);
    });

    // Refresh button
    this.refreshBtn.addEventListener('click', () => {
      this.loadData(true);
    });

    // Security click handler
    this.chartContainer.addEventListener('securityClick', (e: any) => {
      const { security } = e.detail;
      this.showSecurityDetails(security);
    });

    // Window resize handler
    window.addEventListener('resize', () => {
      if (this.currentData) {
        this.renderCurrentData();
      }
    });
  }

  private async initialize(): Promise<void> {
    console.log('🔄 Starting initial data load...');
    this.showLoading(true);
    await this.loadData();
  }

  private async loadData(forceRefresh = false): Promise<void> {
    if (this.isLoading) return;

    console.log(`📊 Loading data for ${this.currentExchange.toUpperCase()} exchange...`);
    this.isLoading = true;
    this.showLoading(true);

    try {
      const securities = await MarketDataService.fetchMarketData(this.currentExchange);
      console.log(`✅ Loaded ${securities.length} securities for ${this.currentExchange.toUpperCase()}`);

      this.currentData = MarketDataService.processChartData(
        securities,
        this.currentDataType,
        this.currentExchange,
        new Date().toISOString().split('T')[0]
      );

      this.updateMarketStats(this.currentData);
      await this.renderCurrentData();

    } catch (error) {
      console.error('❌ Failed to load market data:', error);
      this.showMessage('Failed to load market data. Please try again.');
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  private async renderCurrentData(): Promise<void> {
    if (!this.currentData) return;

    // Clear existing chart
    this.chartContainer.innerHTML = '';

    // Destroy previous renderers
    if (this.treemapRenderer) {
      this.treemapRenderer.destroy();
      this.treemapRenderer = null;
    }
    if (this.histogramRenderer) {
      this.histogramRenderer.destroy();
      this.histogramRenderer = null;
    }

    try {
      if (this.currentChartType === 'histogram') {
        this.histogramRenderer = new HistogramRenderer(this.chartContainer);
        this.currentRenderer = this.histogramRenderer;
        await this.histogramRenderer.render(this.currentData);
      } else {
        this.treemapRenderer = new TreemapRenderer(this.chartContainer);
        this.currentRenderer = this.treemapRenderer;
        await this.treemapRenderer.render(this.currentData);
      }
    } catch (error) {
      console.error('Failed to render chart:', error);
      this.showMessage('Failed to render chart. Please try again.');
    }
  }

  private updateMarketStats(data: ChartData): void {
    const totalSecurities = data.securities.length;
    const totalValue = data.totalValue;
    const avgPriceChange = data.securities.reduce((sum, s) => sum + s.priceChangePct, 0) / totalSecurities;

    const gainers = data.securities.filter(s => s.priceChangePct > 0).length;
    const losers = data.securities.filter(s => s.priceChangePct < 0).length;

    const topGainer = data.securities.reduce((top, current) =>
      current.priceChangePct > top.priceChangePct ? current : top
    );

    const topLoser = data.securities.reduce((top, current) =>
      current.priceChangePct < top.priceChangePct ? current : top
    );

    this.marketStats.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total Securities</span>
        <span class="stat-value">${totalSecurities.toLocaleString()}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Market Value</span>
        <span class="stat-value">${formatMarketCap(totalValue, data.currency)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Avg Change</span>
        <span class="stat-value ${avgPriceChange >= 0 ? 'positive' : 'negative'}">
          ${formatPercentage(avgPriceChange)}
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Gainers / Losers</span>
        <span class="stat-value">
          <span class="positive">${gainers}</span> / <span class="negative">${losers}</span>
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Top Gainer</span>
        <span class="stat-value positive">
          ${topGainer.ticker} ${formatPercentage(topGainer.priceChangePct)}
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Top Loser</span>
        <span class="stat-value negative">
          ${topLoser.ticker} ${formatPercentage(topLoser.priceChangePct)}
        </span>
      </div>
    `;
  }

  private showSecurityDetails(security: MarketSecurity): void {
    // You can implement a modal or side panel here
    console.log('Security details:', security);

    // For now, just highlight the security
    if (this.treemapRenderer) {
      this.treemapRenderer.highlightSecurities([security.ticker]);
    }
  }

  private showLoading(show: boolean): void {
    this.loadingSpinner.style.display = show ? 'block' : 'none';
    this.refreshBtn.disabled = show;
  }

  private showMessage(message: string): void {
    // Create a temporary message element
    const messageEl = document.createElement('div');
    messageEl.className = 'app-message';
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      padding: 1rem;
      border-radius: 0.375rem;
      border: 1px solid var(--border-color);
      z-index: 1001;
      box-shadow: var(--shadow);
    `;

    document.body.appendChild(messageEl);

    // Remove after 3 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 3000);
  }

  public destroy(): void {
    if (this.treemapRenderer) {
      this.treemapRenderer.destroy();
    }
    if (this.histogramRenderer) {
      this.histogramRenderer.destroy();
    }
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new FinmapApp();
});

// Import integration tests in development mode
if (window.location.hostname === 'localhost') {
  import('./test-integration.js').catch(console.error);
}

// Export for potential external usage
export { FinmapApp };
