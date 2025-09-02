import type { MarketData, ChartRenderer } from "./treemap/types.js";
import { fetchMarketData } from "./treemap/data.js";
import { TreemapChart } from "./treemap/index.js";
import { HistogramChart } from "./histogram/index.js";
import {
  getConfig,
  updateConfig,
  saveConfigToURL,
  EXCHANGE_INFO,
  getDateRange,
  toggleLanguage,
} from "./config.js";
import { toggleCurrency } from "./currency/data.js";
import { OverlayComponent } from "./overlay/index.js";

let currentRenderer: ChartRenderer | null = null;
let currentData: MarketData[] = [];

function loadFiltersFromStorage(): string[] {
  const stored = localStorage.getItem("finmap-filters");
  return stored ? JSON.parse(stored) : [];
}

function saveFiltersToStorage(filters: string[]): void {
  localStorage.setItem("finmap-filters", JSON.stringify(filters));
}

export function initializeUI(): void {
  setupEventListeners();
  setupMenu();
  setupShareFeature();
  setupInstallFeature();
  renderChart();
}

function setupEventListeners(): void {
  const dataTypeSelect = document.getElementById(
    "dataType",
  ) as HTMLSelectElement;
  const dateInput = document.getElementById("date") as HTMLInputElement;
  const searchInput = document.getElementById("search") as HTMLInputElement;
  const fileInput = document.getElementById("inputFile") as HTMLInputElement;

  if (dataTypeSelect) {
    dataTypeSelect.addEventListener("change", () => {
      updateConfig({ dataType: dataTypeSelect.value as any });
      saveConfigToURL();
      renderChart();
    });
  }

  if (dateInput) {
    dateInput.addEventListener("change", () => {
      const dateParts = dateInput.value.split("-");
      if (
        dateParts.length === 3 &&
        dateParts[0] &&
        dateParts[1] &&
        dateParts[2]
      ) {
        const formattedDate = `${dateParts[0]}/${dateParts[1].padStart(2, "0")}/${dateParts[2].padStart(2, "0")}`;
        updateConfig({ date: formattedDate });
        saveConfigToURL();
        renderChart();
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const query = (e.target as HTMLInputElement).value.trim();
        if (
          query &&
          currentRenderer &&
          "searchAndHighlight" in currentRenderer
        ) {
          (currentRenderer as any).searchAndHighlight(query);
        }
        (e.target as HTMLInputElement).value = "";
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvContent = e.target?.result as string;
          if (csvContent) {
            localStorage.setItem("filterCsv", csvContent);
            updateFilterVisibility();
            renderChart();
          }
        };
        reader.readAsText(file);
      }
      (event.target as HTMLInputElement).value = "";
    });
  }

  const filterLabel = document.getElementById("inputFileLabel");
  if (filterLabel) {
    filterLabel.addEventListener("click", (event) => {
      const hasFilter = localStorage.getItem("filterCsv") !== null;
      if (hasFilter) {
        event.preventDefault();
        localStorage.removeItem("filterCsv");
        updateFilterVisibility();
        renderChart();
      }
    });
  }

  document.addEventListener("click", (event) => {
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
      cleanupOnConfigChange();
      updateConfig({ exchange: target.dataset.exchange as any });
      saveConfigToURL();
      updateDateInputLimits();
      renderChart();
      return;
    }

    if (target.dataset.action === "currency-toggle") {
      event.preventDefault();

      if (target.hasAttribute("currency-toggle-disabled")) {
        return;
      }

      const config = getConfig();
      const exchangeInfo = EXCHANGE_INFO[config.exchange];

      if (exchangeInfo && exchangeInfo.nativeCurrency !== "USD") {
        cleanupOnConfigChange();
        toggleCurrency();
        const newConfig = getConfig();
        target.textContent = newConfig.currency;
        saveConfigToURL();
        renderChart();
      }
      return;
    }

    if (target.id === "langToggle") {
      event.preventDefault();
      cleanupOnConfigChange();
      toggleLanguage();
      const newConfig = getConfig();
      target.textContent = newConfig.language;
      saveConfigToURL();
      renderChart();
      return;
    }

    if (target.dataset.action === "erase-filter") {
      event.preventDefault();
      localStorage.removeItem("filterCsv");
      updateFilterVisibility();
      renderChart();
      return;
    }
  });
}

function setupMenu(): void {
  const menuButton = document.querySelector(".hamburger") as HTMLElement;
  const menu = document.querySelector(".menu") as HTMLElement;

  if (menuButton && menu) {
    menuButton.addEventListener("click", () => {
      const isOpen = menu.classList.contains("showMenu");
      if (isOpen) {
        menu.classList.remove("showMenu");
        menuButton.classList.remove("active");
      } else {
        menu.classList.add("showMenu");
        menuButton.classList.add("active");
      }
    });

    // Close menu when clicking on menu items
    menu.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("menuItem")) {
        menu.classList.remove("showMenu");
        menuButton.classList.remove("active");
      }
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !menuButton.contains(e.target as Node) &&
        !menu.contains(e.target as Node)
      ) {
        menu.classList.remove("showMenu");
        menuButton.classList.remove("active");
      }
    });
  }
}

function updateFilterDisplay(): void {
  const filtersContainer = document.getElementById("active-filters");
  if (!filtersContainer) return;

  const filters = loadFiltersFromStorage();
  filtersContainer.innerHTML = "";

  filters.forEach((filter: string) => {
    const filterTag = document.createElement("div");
    filterTag.className = "filter-tag";
    filterTag.innerHTML = `
      ${filter}
      <button onclick="removeFilter('${filter}')" aria-label="Remove filter">×</button>
    `;
    filtersContainer.appendChild(filterTag);
  });
}

(window as any).removeFilter = function (filter: string): void {
  const filters = loadFiltersFromStorage();
  const newFilters = filters.filter((f: string) => f !== filter);
  saveFiltersToStorage(newFilters);
  updateFilterDisplay();
  renderChart();
};

export async function renderChart(): Promise<void> {
  try {
    const container = document.getElementById("chart");
    if (!container) return;

    showLoadingState(container);

    currentData = await fetchMarketData();

    if (currentRenderer) {
      currentRenderer.destroy();
    }

    const config = getConfig();

    switch (config.chartType) {
      case "treemap":
        currentRenderer = new TreemapChart();
        break;
      case "histogram":
        currentRenderer = new HistogramChart();
        break;
      default:
        currentRenderer = new TreemapChart();
    }

    const filteredData = applyFilters(currentData);
    if (currentRenderer) {
      currentRenderer.render(filteredData, container);
    }

    updateUIState();
    hideLoadingState(container);
  } catch (error) {
    showErrorState(error as Error);
  }
}

function cleanupOnConfigChange(): void {
  OverlayComponent.destroyInstance();
  currentData.length = 0;

  if (currentRenderer) {
    currentRenderer.destroy();
    currentRenderer = null;
  }
}

function applyFilters(data: MarketData[]): MarketData[] {
  const csvData = localStorage.getItem("filterCsv");
  if (!csvData) return data;

  try {
    const portfolioData = parsePortfolioCSV(csvData);
    if (portfolioData.length === 0) return data;

    const portfolioTickers = portfolioData.map((item) =>
      item.ticker.toUpperCase(),
    );
    const filteredData = data.filter(
      (item) =>
        portfolioTickers.includes(item.ticker.toUpperCase()) ||
        item.type === "sector",
    );

    return filteredData.map((item) => {
      if (item.type === "sector") return item;

      const portfolioItem = portfolioData.find(
        (p) => p.ticker.toUpperCase() === item.ticker.toUpperCase(),
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
    console.warn("Failed to parse portfolio CSV:", error);
    return data;
  }
}

function parsePortfolioCSV(
  csvContent: string,
): Array<{ ticker: string; amount: number }> {
  const lines = csvContent.split("\n").filter((line) => line.trim());
  const portfolioData: Array<{ ticker: string; amount: number }> = [];

  for (const line of lines) {
    const parts = line.split(",").map((part) => part.trim());
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

  const exchangeSelect = document.getElementById(
    "exchange",
  ) as HTMLSelectElement;
  const chartTypeSelect = document.getElementById(
    "chartType",
  ) as HTMLSelectElement;
  const dataTypeSelect = document.getElementById(
    "dataType",
  ) as HTMLSelectElement;
  const dateInput = document.getElementById("date") as HTMLInputElement;
  const currencyToggle = document.querySelector(
    '[data-action="currency-toggle"]',
  ) as HTMLElement;
  const langToggle = document.getElementById("langToggle") as HTMLElement;

  if (exchangeSelect) exchangeSelect.value = config.exchange;
  if (chartTypeSelect) chartTypeSelect.value = config.chartType;
  if (dataTypeSelect) dataTypeSelect.value = config.dataType;

  if (dateInput && config.date) {
    const parts = config.date.split("/");
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      dateInput.value = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
  }

  if (currencyToggle) {
    const exchangeInfo = EXCHANGE_INFO[config.exchange];
    currencyToggle.textContent = config.currency;
    currencyToggle.style.display = "inline-block";

    if (!exchangeInfo || exchangeInfo.nativeCurrency === "USD") {
      currencyToggle.setAttribute("currency-toggle-disabled", "true");
    } else {
      currencyToggle.removeAttribute("currency-toggle-disabled");
    }
  }

  if (langToggle) {
    langToggle.textContent = config.language;
  }

  updateDateInputLimits();
  updateFilterVisibility();
}

function updateDateInputLimits(): void {
  const config = getConfig();
  const dateInput = document.getElementById("date") as HTMLInputElement;

  if (dateInput) {
    const { min, max } = getDateRange(config.exchange);
    dateInput.min = min;
    dateInput.max = max;

    // Set current value if not already set or if it's outside the new range
    if (!dateInput.value || dateInput.value < min || dateInput.value > max) {
      dateInput.value = max;
      updateConfig({ date: max.replace(/-/g, "/") });
    }
  }
}

function updateFilterVisibility(): void {
  const filterLabel = document.getElementById("inputFileLabel");
  const eraseFilterLink = document.getElementById("linkEraseFilter");
  const hasFilter = localStorage.getItem("filterCsv") !== null;

  if (filterLabel) {
    filterLabel.style.display = "inline-block";
    const img = filterLabel.querySelector("img");
    if (img) {
      if (hasFilter) {
        img.src = "images/icons/erasefilter.png";
        img.title = "Remove filter";
      } else {
        img.src = "images/icons/filter.png";
        img.title = "Apply filter";
      }
    }
  }

  if (eraseFilterLink) {
    eraseFilterLink.style.display = "none";
  }
}

function showLoadingState(container: HTMLElement): void {
  container.innerHTML = '<div class="loading">Loading...</div>';
}

function hideLoadingState(container: HTMLElement): void {
  const loading = container.querySelector(".loading");
  if (loading) {
    loading.remove();
  }
}

function showErrorState(error: Error): void {
  const container = document.getElementById("chart");
  if (container) {
    container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
  }
}

function setupShareFeature(): void {
  const shareLink = document.getElementById("share");
  if (shareLink) {
    shareLink.addEventListener("click", handleShareClick);
  }
}

function setupInstallFeature(): void {
  const installLink = document.getElementById("install");
  if (installLink) {
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    installLink.addEventListener("click", handleInstallClick);
  }
}

let installPrompt: any = null;

function handleShareClick(): void {
  if (navigator.share) {
    navigator
      .share({
        title: document.title,
        url: window.location.href,
      })
      .catch(console.error);
  }
}

function handleBeforeInstallPrompt(event: Event): void {
  event.preventDefault();
  installPrompt = event;
  const installLink = document.getElementById("install");
  if (installLink) {
    installLink.removeAttribute("hidden");
  }
}

function handleAppInstalled(): void {
  installPrompt = null;
  const installLink = document.getElementById("install");
  if (installLink) {
    installLink.setAttribute("hidden", "");
  }
}

async function handleInstallClick(): Promise<void> {
  if (!installPrompt) return;

  const result = await installPrompt.prompt();
  console.log(`Install prompt result: ${result.outcome}`);

  installPrompt = null;
  const installLink = document.getElementById("install");
  if (installLink) {
    installLink.setAttribute("hidden", "");
  }
}
