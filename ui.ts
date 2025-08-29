import { getConfig, updateConfig, saveConfigToURL, loadFiltersFromStorage, saveFiltersToStorage } from './config.js';
import { fetchMarketData } from './data.js';
import { D3TreemapRenderer, D3HistogramRenderer } from './charts.js';
import { debounce } from './utils.js';
import type { MarketData, ChartRenderer } from './types.js';

let currentRenderer: ChartRenderer | null = null;
let currentData: MarketData[] = [];

export function initializeUI(): void {
  setupEventListeners();
  setupMobileMenu();
  renderChart();
}

function setupEventListeners(): void {
  const dataTypeSelect = document.getElementById('dataType') as HTMLSelectElement;
  const dateInput = document.getElementById('date') as HTMLInputElement;
  const searchInput = document.getElementById('search') as HTMLInputElement;
  const fileInput = document.getElementById('inputFile') as HTMLInputElement;
  
  if (dataTypeSelect) {
    dataTypeSelect.addEventListener('change', () => {
      updateConfig({ dataType: dataTypeSelect.value as any });
      saveConfigToURL();
      renderChart();
    });
  }
  
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      const dateParts = dateInput.value.split('-');
      if (dateParts.length === 3 && dateParts[0] && dateParts[1] && dateParts[2]) {
        const formattedDate = `${dateParts[0]}/${dateParts[1].padStart(2, '0')}/${dateParts[2].padStart(2, '0')}`;
        updateConfig({ date: formattedDate });
        saveConfigToURL();
        renderChart();
      }
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = (e.target as HTMLInputElement).value.trim();
        if (query && currentRenderer && 'searchAndHighlight' in currentRenderer) {
          (currentRenderer as any).searchAndHighlight(query);
        }
        (e.target as HTMLInputElement).value = '';
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvContent = e.target?.result as string;
          if (csvContent) {
            localStorage.setItem('filterCsv', csvContent);
            updateFilterVisibility();
            renderChart();
          }
        };
        reader.readAsText(file);
      }
      (event.target as HTMLInputElement).value = '';
    });
  }
  
  window.addEventListener('resize', debounce(() => {
    if (currentRenderer && currentData.length > 0) {
      const container = document.getElementById('chart');
      if (container) {
        currentRenderer.render(currentData, container);
      }
    }
  }, 100));

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    
    if (target.dataset.chartType) {
      event.preventDefault();
      updateConfig({ chartType: target.dataset.chartType as any });
      saveConfigToURL();
      renderChart();
      return;
    }
    
    if (target.dataset.exchange) {
      event.preventDefault();
      updateConfig({ exchange: target.dataset.exchange as any });
      saveConfigToURL();
      renderChart();
      return;
    }
    
    if (target.dataset.action === 'currency-toggle') {
      event.preventDefault();
      const config = getConfig();
      const currencies = ['USD', 'RUB', 'GBP', 'TRY'];
      const currentIndex = currencies.indexOf(config.currency);
      const nextCurrency = currencies[(currentIndex + 1) % currencies.length] as any;
      updateConfig({ currency: nextCurrency });
      target.textContent = nextCurrency;
      saveConfigToURL();
      if (nextCurrency !== 'USD') {
        renderChart();
      }
      return;
    }
    
    if (target.dataset.action === 'erase-filter') {
      event.preventDefault();
      localStorage.removeItem('filterCsv');
      updateFilterVisibility();
      renderChart();
      return;
    }
  });
}

function setupMobileMenu(): void {
  const menuButton = document.querySelector('.hamburger') as HTMLElement;
  const mobileMenu = document.querySelector('.menu') as HTMLElement;
  
  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('showMenu');
      if (isOpen) {
        mobileMenu.classList.remove('showMenu');
        menuButton.classList.remove('active');
      } else {
        mobileMenu.classList.add('showMenu');
        menuButton.classList.add('active');
      }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuButton.contains(e.target as Node) && !mobileMenu.contains(e.target as Node)) {
        mobileMenu.classList.remove('showMenu');
        menuButton.classList.remove('active');
      }
    });
  }
}

function handleSearch(query: string): void {
  const filters = loadFiltersFromStorage();
  
  if (query.trim()) {
    const newFilters = [...new Set([...filters, query.trim().toUpperCase()])];
    saveFiltersToStorage(newFilters);
  }
  
  updateFilterDisplay();
  renderChart();
}

function updateFilterDisplay(): void {
  const filtersContainer = document.getElementById('active-filters');
  if (!filtersContainer) return;
  
  const filters = loadFiltersFromStorage();
  filtersContainer.innerHTML = '';
  
  filters.forEach(filter => {
    const filterTag = document.createElement('div');
    filterTag.className = 'filter-tag';
    filterTag.innerHTML = `
      ${filter}
      <button onclick="removeFilter('${filter}')" aria-label="Remove filter">×</button>
    `;
    filtersContainer.appendChild(filterTag);
  });
}

(window as any).removeFilter = function(filter: string): void {
  const filters = loadFiltersFromStorage();
  const newFilters = filters.filter(f => f !== filter);
  saveFiltersToStorage(newFilters);
  updateFilterDisplay();
  renderChart();
};

export async function renderChart(): Promise<void> {
  try {
    const container = document.getElementById('chart');
    if (!container) return;
    
    showLoadingState(container);
    
    currentData = await fetchMarketData();
    
    if (currentRenderer) {
      currentRenderer.destroy();
    }
    
    const config = getConfig();
    
    if (config.chartType === 'treemap') {
      currentRenderer = new D3TreemapRenderer();
    } else {
      currentRenderer = new D3HistogramRenderer();
    }
    
    const filteredData = applyFilters(currentData);
    currentRenderer.render(filteredData, container);
    
    updateUIState();
    hideLoadingState(container);
    
  } catch (error) {
    showErrorState(error as Error);
  }
}

function applyFilters(data: MarketData[]): MarketData[] {
  const csvData = localStorage.getItem('filterCsv');
  if (!csvData) return data;
  
  try {
    const portfolioData = parsePortfolioCSV(csvData);
    if (portfolioData.length === 0) return data;
    
    const portfolioTickers = portfolioData.map(item => item.ticker.toUpperCase());
    const filteredData = data.filter(item => 
      portfolioTickers.includes(item.ticker.toUpperCase()) || item.type === 'sector'
    );
    
    return filteredData.map(item => {
      if (item.type === 'sector') return item;
      
      const portfolioItem = portfolioData.find(p => 
        p.ticker.toUpperCase() === item.ticker.toUpperCase()
      );
      
      if (portfolioItem) {
        return {
          ...item,
          value: item.priceLastSale * portfolioItem.amount,
          marketCap: item.priceLastSale * portfolioItem.amount,
        };
      }
      
      return item;
    });
  } catch (error) {
    console.warn('Failed to parse portfolio CSV:', error);
    return data;
  }
}

function parsePortfolioCSV(csvContent: string): Array<{ticker: string; amount: number}> {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const portfolioData: Array<{ticker: string; amount: number}> = [];
  
  for (const line of lines) {
    const parts = line.split(',').map(part => part.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const ticker = parts[0];
      const amount = parseFloat(parts[1]);
      
      if (ticker && !isNaN(amount) && amount > 0) {
        portfolioData.push({ ticker, amount });
      }
    }
  }
  
  return portfolioData;
}

function updateUIState(): void {
  const config = getConfig();
  
  const exchangeSelect = document.getElementById('exchange') as HTMLSelectElement;
  const chartTypeSelect = document.getElementById('chartType') as HTMLSelectElement;
  const dataTypeSelect = document.getElementById('dataType') as HTMLSelectElement;
  const dateInput = document.getElementById('date') as HTMLInputElement;
  
  if (exchangeSelect) exchangeSelect.value = config.exchange;
  if (chartTypeSelect) chartTypeSelect.value = config.chartType;
  if (dataTypeSelect) dataTypeSelect.value = config.dataType;
  
  if (dateInput && config.date) {
    const parts = config.date.split('/');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      dateInput.value = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  
  updateFilterVisibility();
}

function updateFilterVisibility(): void {
  const filterLabel = document.getElementById('inputFileLabel');
  const eraseFilterLink = document.getElementById('linkEraseFilter');
  const hasFilter = localStorage.getItem('filterCsv') !== null;
  
  if (filterLabel) {
    filterLabel.style.display = hasFilter ? 'none' : 'inline-block';
  }
  
  if (eraseFilterLink) {
    eraseFilterLink.style.display = hasFilter ? 'inline-block' : 'none';
    eraseFilterLink.removeAttribute('hidden');
  }
}

function showLoadingState(container: HTMLElement): void {
  container.innerHTML = '<div class="loading">Loading...</div>';
}

function hideLoadingState(container: HTMLElement): void {
  const loading = container.querySelector('.loading');
  if (loading) {
    loading.remove();
  }
}

function showErrorState(error: Error): void {
  const container = document.getElementById('chart');
  if (container) {
    container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
  }
}
