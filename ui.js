import { getConfig, updateConfig, saveConfigToURL, loadFiltersFromStorage, saveFiltersToStorage } from './config.js';
import { fetchMarketData } from './data.js';
import { D3TreemapRenderer, D3HistogramRenderer } from './charts.js';
import { debounce } from './utils.js';
let currentRenderer = null;
let currentData = [];
export function initializeUI() {
    setupEventListeners();
    setupMobileMenu();
    renderChart();
}
function setupEventListeners() {
    const exchangeSelect = document.getElementById('exchange');
    const chartTypeSelect = document.getElementById('chartType');
    const dataTypeSelect = document.getElementById('dataType');
    const dateInput = document.getElementById('date');
    const searchInput = document.getElementById('search');
    if (exchangeSelect) {
        exchangeSelect.addEventListener('change', () => {
            updateConfig({ exchange: exchangeSelect.value });
            saveConfigToURL();
            renderChart();
        });
    }
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', () => {
            updateConfig({ chartType: chartTypeSelect.value });
            saveConfigToURL();
            renderChart();
        });
    }
    if (dataTypeSelect) {
        dataTypeSelect.addEventListener('change', () => {
            updateConfig({ dataType: dataTypeSelect.value });
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
        const debouncedSearch = debounce((value) => {
            handleSearch(value);
        }, 300);
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
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
function setupMobileMenu() {
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => {
            const isOpen = mobileMenu.classList.contains('open');
            if (isOpen) {
                mobileMenu.classList.remove('open');
            }
            else {
                mobileMenu.classList.add('open');
            }
        });
        document.addEventListener('click', (e) => {
            if (!menuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.remove('open');
            }
        });
    }
}
function handleSearch(query) {
    const filters = loadFiltersFromStorage();
    if (query.trim()) {
        const newFilters = [...new Set([...filters, query.trim().toUpperCase()])];
        saveFiltersToStorage(newFilters);
    }
    updateFilterDisplay();
    renderChart();
}
function updateFilterDisplay() {
    const filtersContainer = document.getElementById('active-filters');
    if (!filtersContainer)
        return;
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
window.removeFilter = function (filter) {
    const filters = loadFiltersFromStorage();
    const newFilters = filters.filter(f => f !== filter);
    saveFiltersToStorage(newFilters);
    updateFilterDisplay();
    renderChart();
};
export async function renderChart() {
    try {
        const container = document.getElementById('chart-container');
        if (!container)
            return;
        showLoadingState(container);
        currentData = await fetchMarketData();
        if (currentRenderer) {
            currentRenderer.destroy();
        }
        const config = getConfig();
        if (config.chartType === 'treemap') {
            currentRenderer = new D3TreemapRenderer();
        }
        else {
            currentRenderer = new D3HistogramRenderer();
        }
        const filteredData = applyFilters(currentData);
        currentRenderer.render(filteredData, container);
        updateUIState();
        hideLoadingState(container);
    }
    catch (error) {
        showErrorState(error);
    }
}
function applyFilters(data) {
    const filters = loadFiltersFromStorage();
    if (filters.length === 0)
        return data;
    return data.filter(item => filters.some(filter => item.ticker.toUpperCase().includes(filter) ||
        item.nameEng.toUpperCase().includes(filter) ||
        item.sector.toUpperCase().includes(filter)));
}
function updateUIState() {
    const config = getConfig();
    const exchangeSelect = document.getElementById('exchange');
    const chartTypeSelect = document.getElementById('chartType');
    const dataTypeSelect = document.getElementById('dataType');
    const dateInput = document.getElementById('date');
    if (exchangeSelect)
        exchangeSelect.value = config.exchange;
    if (chartTypeSelect)
        chartTypeSelect.value = config.chartType;
    if (dataTypeSelect)
        dataTypeSelect.value = config.dataType;
    if (dateInput && config.date) {
        const parts = config.date.split('/');
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
            dateInput.value = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
    }
    updateFilterDisplay();
}
function showLoadingState(container) {
    container.innerHTML = '<div class="loading">Loading...</div>';
}
function hideLoadingState(container) {
    const loading = container.querySelector('.loading');
    if (loading) {
        loading.remove();
    }
}
function showErrorState(error) {
    const container = document.getElementById('chart-container');
    if (container) {
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}
