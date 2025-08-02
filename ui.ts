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
  const exchangeSelect = document.getElementById('exchange') as HTMLSelectElement;
  const chartTypeSelect = document.getElementById('chartType') as HTMLSelectElement;
  const dataTypeSelect = document.getElementById('dataType') as HTMLSelectElement;
  const dateInput = document.getElementById('date') as HTMLInputElement;
  const searchInput = document.getElementById('search') as HTMLInputElement;
  
  if (exchangeSelect) {
    exchangeSelect.addEventListener('change', () => {
      updateConfig({ exchange: exchangeSelect.value as any });
      saveConfigToURL();
      renderChart();
    });
  }
  
  if (chartTypeSelect) {
    chartTypeSelect.addEventListener('change', () => {
      updateConfig({ chartType: chartTypeSelect.value as any });
      saveConfigToURL();
      renderChart();
    });
  }
  
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
    const debouncedSearch = debounce((value: string) => {
      handleSearch(value);
    }, 300);
    
    searchInput.addEventListener('input', (e) => {
      debouncedSearch((e.target as HTMLInputElement).value);
    });
  }
  
  window.addEventListener('resize', debounce(() => {
    if (currentRenderer && currentData.length > 0) {
      const container = document.getElementById('chart-container');
      if (container) {
        currentRenderer.render(currentData, container);
      }
    }
  }, 100));
}

function setupMobileMenu(): void {
  const menuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('open');
      if (isOpen) {
        mobileMenu.classList.remove('open');
      } else {
        mobileMenu.classList.add('open');
      }
    });
    
    document.addEventListener('click', (e) => {
      if (!menuButton.contains(e.target as Node) && !mobileMenu.contains(e.target as Node)) {
        mobileMenu.classList.remove('open');
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
    const container = document.getElementById('chart-container');
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
  const filters = loadFiltersFromStorage();
  if (filters.length === 0) return data;
  
  return data.filter(item => 
    filters.some(filter => 
      item.ticker.toUpperCase().includes(filter) ||
      item.nameEng.toUpperCase().includes(filter) ||
      item.sector.toUpperCase().includes(filter)
    )
  );
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
  
  updateFilterDisplay();
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
  const container = document.getElementById('chart-container');
  if (container) {
    container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
  }
}
