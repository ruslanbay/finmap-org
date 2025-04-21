class MarketDataService {
  constructor() {
    this.baseUrl = 'https://raw.githubusercontent.com/finmap-org';
  }

  async fetchData(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  async getExchangeRates(currency) {
    const today = new Date().toISOString().split('T')[0];
    const url = `${this.baseUrl}/data-currency/refs/heads/main/marketdata/${currency}perUSD.json?_=${today}`;
    return this.fetchData(url);
  }

  async getBrentPrices() {
    const url = `${this.baseUrl}/data-commodity/refs/heads/main/marketdata/brent.json`;
    return this.fetchData(url);
  }

  async getMarketData(reponame, exchange) {
    const url = `${this.baseUrl}/${reponame}/refs/heads/main/history/${exchange}.json`;
    return this.fetchData(url);
  }

  async getCompanyInfo(exchange, clickedTreemapItem, currentLanguage) {
    let url, response, json, description, sourceLink, infoLang, wikiPageId;
    switch (exchange) {
      case "nasdaq":
      case "nyse":
      case "amex":
      case "us-all":
        const clickedExchange = clickedTreemapItem[0];
        const clickedLabel = clickedTreemapItem[6];
        url = `${this.baseUrl}/data-us/refs/heads/main/securities/${clickedExchange}/${clickedLabel.slice(0, 1)}/${clickedLabel}.json`;
        response = await fetch(url);
        if (response.ok) {
          json = await response.json();
          description = json.data.CompanyDescription.value;
          sourceLink = json.data.CompanyUrl.value;
        } else {
          description = "Company info not found.";
          sourceLink = "";
        }
        break;
      case "moex":
        switch (currentLanguage) {
          case "ENG":
            infoLang = "en";
            wikiPageId = clickedTreemapItem[20];
            break;
          case "RUS":
            infoLang = "ru";
            wikiPageId = clickedTreemapItem[21];
            break;
          default:
            infoLang = "en";
            wikiPageId = clickedTreemapItem[20];
            break;
        }
        url = `https://${infoLang}.wikipedia.org/w/api.php?action=query&pageids=${wikiPageId}&prop=langlinks|extracts&lllimit=500&exintro&explaintext&format=json&origin=*`;
        response = await fetch(url);
        json = await response.json();
        const pages = json.query.pages;
        const firstPage = Object.keys(pages)[0];
        description = pages[firstPage].extract;
        sourceLink = `https://${infoLang}.wikipedia.org/wiki/?curid=${wikiPageId}`;
        break;
      default:
        description = "No data available.";
        sourceLink = "";
    }
    return `<p>${description}<br><b>Link: <a href="${sourceLink}" target="_blank" rel="noopener">${sourceLink}</a></b></p>`;
  }
}

class CurrencyManager {
  constructor(marketDataService) {
    this.marketDataService = marketDataService;
    this.exchangeRatesCache = {};
  }

  async getExchangeRateByDate(currency, date) {
    if (!currency || currency === "USD") return 1;
    if (!this.exchangeRatesCache[currency]) {
      this.exchangeRatesCache[currency] = await this.marketDataService.getExchangeRates(currency);
    }
    let rates = this.exchangeRatesCache[currency];
    let rate = rates[date];
    let d = new Date(date);
    let limit = 14;
    while (typeof rate === "undefined" && limit >= 0) {
      limit--;
      d.setDate(d.getUTCDate() - 1);
      let prevDate = d.toISOString().split("T")[0];
      rate = rates[prevDate];
    }
    return typeof rate !== "undefined" ? rate : 1;
  }
}

class NewsService {
  constructor() {
    this.baseUrl = "https://d3sk7vmzjz3uox.cloudfront.net";
  }

  async getNews(clickedTreemapItem, date, currentLanguage) {
    let newsLang, companyName;
    switch (currentLanguage) {
      case "ENG":
        newsLang = "hl=en-US&gl=US&ceid=US:en";
        companyName = clickedTreemapItem[7];
        break;
      case "RUS":
        newsLang = "hl=ru&gl=RU&ceid=RU:ru";
        companyName = clickedTreemapItem[9];
        break;
      default:
        newsLang = "hl=en-US&gl=US&ceid=US:en";
        companyName = clickedTreemapItem[7];
        break;
    }
    const clickedLabel = clickedTreemapItem[6];
    const newsQuery = companyName.split(" ").slice(0, 2).join(" ");
    const url = `${this.baseUrl}/${currentLanguage}:${clickedLabel}.xml?q=${newsQuery}+before:${date}&${newsLang}&_=${new Date().toISOString().split(":")[0]}`;
    let html = "";
    try {
      const response = await fetch(url);
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      const items = Array.from(xmlDoc.getElementsByTagName("item"));
      items.sort((a, b) => this.parsePubDate(b) - this.parsePubDate(a));
      items.forEach((item) => {
        const title = item.getElementsByTagName("title")[0].textContent;
        const pubDate = item.getElementsByTagName("pubDate")[0].textContent;
        const link = item.getElementsByTagName("link")[0].textContent;
        const source = item.getElementsByTagName("source")[0]?.textContent;
        const sourceUrl = item.getElementsByTagName("source")[0]?.getAttribute("url");
        html += `
          <article>
            <h4>
              <a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a>
            </h4>
            <a href="${sourceUrl}" target="_blank" rel="noopener">${source}</a>, ${pubDate}<br><br>
          </article>
        `;
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      html = "<h1>Woops! Nothing was found 🕵🏽</h1>";
    }
    return html;
  }

  parsePubDate(item) {
    const pubDateStr = item.getElementsByTagName("pubDate")[0].textContent;
    return new Date(pubDateStr);
  }
}

class ChartManager {
  constructor(containerId, marketDataService, currencyManager) {
    this.containerId = containerId;
    this.marketDataService = marketDataService;
    this.currencyManager = currencyManager;
  }

  async refreshHistogram(reponame, exchange, dataType, currency, nativeCurrency) {
    let chartData = [];
    let dataJson;
    try {
      dataJson = await this.marketDataService.getMarketData(reponame, exchange);
    } catch (error) {
      alert("Oops! Nothing's here");
      return;
    }

    let exchangeRates, filteredExchangeRates;
    if (nativeCurrency !== "USD") {
      exchangeRates = await this.marketDataService.getExchangeRates(nativeCurrency);
      filteredExchangeRates = Object.fromEntries(
        Object.entries(exchangeRates)
          .filter(([key, value]) =>
            value !== undefined &&
            !isNaN(value) &&
            value !== 0 &&
            key >= dataJson.dates[0]
          )
      );
      chartData.push({
        name: nativeCurrency,
        type: "line",
        mode: "lines",
        yaxis: "y2",
        connectgaps: true,
        customdata: Object.values(filteredExchangeRates),
        hoverinfo: "all",
        hovertemplate: `%{x|%x}<br>%{customdata:,.2f}<br>${nativeCurrency} per USD<br>%{fullData.name}<extra></extra>`,
        x: Object.keys(filteredExchangeRates),
        y: Object.values(filteredExchangeRates).map(x => (1 / x).toFixed(4)),
      });
    }

    if (currency !== nativeCurrency && filteredExchangeRates) {
      dataJson = {
        dates: dataJson.dates.filter(date => date in filteredExchangeRates),
        sectors: dataJson.sectors.map(sector => {
          const validIndexes = dataJson.dates
            .map((date, index) => ({ date, index }))
            .filter(item => item.date in filteredExchangeRates)
            .map(item => item.index);
          return {
            sectorName: sector.sectorName,
            marketCap: validIndexes.map(i => sector.marketCap[i] / filteredExchangeRates[dataJson.dates[i]]),
            value: validIndexes.map(i => sector.value[i] / filteredExchangeRates[dataJson.dates[i]]),
            volume: sector.volume,
            priceChangePct: sector.priceChangePct,
            tradesNumber: sector.tradesNumber,
            itemsNumber: sector.itemsNumber,
          };
        }),
      };
    }

    const x = dataJson.dates;

    let brentPriceJson;
    try {
      brentPriceJson = await this.marketDataService.getBrentPrices();
    } catch (error) {
      alert("Oops! Couldn't fetch Brent prices");
      return;
    }
    brentPriceJson = Object.fromEntries(
      Object.entries(brentPriceJson).filter(([key, _]) => key >= dataJson.dates[0])
    );
    chartData.push({
      name: "Brent",
      type: "line",
      mode: "lines",
      yaxis: "y3",
      connectgaps: true,
      customdata: Object.values(brentPriceJson),
      hoverinfo: "all",
      hovertemplate: `%{x|%x}<br>%{customdata:,.2f} USD<br>%{fullData.name}<extra></extra>`,
      x: Object.keys(brentPriceJson),
      y: Object.values(brentPriceJson),
    });

    dataJson.sectors.forEach((trace) => {
      if (!trace.sectorName) return;
      let y;
      switch (dataType) {
        case "marketcap":
          y = trace.marketCap;
          break;
        case "value":
          y = trace.value;
          break;
        case "trades":
          y = trace.tradesNumber;
          break;
        case "nestedItems":
          y = trace.itemsNumber;
          break;
        default:
          y = trace.marketCap;
      }
      chartData.push({
        name: trace.sectorName,
        type: "scatter",
        mode: "lines",
        stackgroup: "one",
        connectgaps: true,
        hoverinfo: "all",
        hovertemplate: "%{x|%x}<br>%{y:,.0f}<br>%{fullData.name}<extra></extra>",
        x: x,
        y: y,
      });
    });

    // Filter out traces where all values are 0 or null
    chartData = chartData.filter(trace => trace.y && trace.y.some(v => v !== null && v !== 0 && !isNaN(v)));

    const layout = {
      showlegend: true,
      legend: {
        visible: true,
        traceorder: "normal",
        orientation: "h",
        x: 0,
        xanchor: "left",
        y: 0.89,
        yanchor: "top",
        bgcolor: "rgba(65, 69, 84, 0)",
        bordercolor: "rgba(65, 69, 84, 0)",
        borderwidth: 0,
      },
      updatemenus: [
        {
          type: "buttons",
          buttons: [
            {
              label: "Show/Hide Legend",
              method: "relayout",
              args: [{ showlegend: true }],
              args2: [{ showlegend: false }],
            },
          ],
          direction: "right",
          showactive: true,
          x: 0.02,
          xanchor: "left",
          y: 1.0,
          yanchor: "top",
          bgcolor: "rgba(65, 69, 84, 1)",
          bordercolor: "rgba(65, 69, 84, 1)",
          borderwidth: 0,
          font: {
            lineposition: "none",
            color: "black",
            size: 14,
            variant: "all-small-caps",
          },
        },
      ],
      yaxis: {
        visible: true,
        fixedrange: true,
        side: "right",
        showgrid: true,
      },
      yaxis2: {
        title: "Currency Rate",
        overlaying: "y",
        visible: false,
        fixedrange: true,
        side: "left",
      },
      yaxis3: {
        title: "Oil prices",
        overlaying: "y",
        visible: false,
        fixedrange: true,
        side: "left",
      },
      xaxis: {
        type: "date",
        range: [chartData[2]?.x[0], chartData[2]?.x[chartData[2]?.x.length - 1]],
        fixedrange: false,
        tickformatstops: [
          { dtickrange: [null, "M1"], value: "%e\n%b %Y" },
          { dtickrange: ["M1", "M12"], value: "%b\n%Y" },
          { dtickrange: ["M12", null], value: "%Y" },
        ],
        rangeslider: { visible: true },
        rangeselector: {
          visible: true,
          activecolor: "#000000",
          bgcolor: "rgb(38, 38, 39)",
          buttons: [
            { step: "month", stepmode: "backward", count: 1, label: "1m" },
            { step: "month", stepmode: "backward", count: 6, label: "6m" },
            { step: "year", stepmode: "todate", count: 1, label: "YTD" },
            { step: "year", stepmode: "backward", count: 1, label: "1y" },
            { step: "all" },
          ],
        },
        showgrid: true,
      },
      autosize: true,
      margin: { l: 0, r: 30, t: 0, b: 20 },
      plot_bgcolor: "rgb(66, 70, 83)",
      paper_bgcolor: "rgb(65, 69, 85)",
      font: { family: "Arial", size: 12, color: "rgba(245, 246, 249, 1)" },
    };

    const config = {
      responsive: true,
      displaylogo: false,
      displayModeBar: true,
      modeBarButtonsToRemove: ["toImage", "lasso2d", "select2d"],
      scrollZoom: true,
    };

    Plotly.react(this.containerId, chartData, layout, config);
  }
}

class OverlayWidget {
  constructor(marketDataService, newsService) {
    this.marketDataService = marketDataService;
    this.newsService = newsService;
    this.overlayDiv = null;
    this.newsDiv = null;
    this.infoDiv = null;
  }

  async addOverlayWidget(exchange, clickedTreemapItem, date, currentLanguage) {
    if (this.overlayDiv) {
      this.overlayDiv.style.visibility = "visible";
      this.newsDiv.innerHTML = "";
      this.infoDiv.innerHTML = "";
      this.newsDiv.innerHTML = await this.newsService.getNews(clickedTreemapItem, date, currentLanguage);
      this.infoDiv.innerHTML = await this.marketDataService.getCompanyInfo(exchange, clickedTreemapItem, currentLanguage);
      return;
    }

    this.overlayDiv = document.createElement("div");
    this.overlayDiv.id = "overlay";
    this.overlayDiv.style.position = "absolute";
    this.overlayDiv.style.backgroundColor = "white";
    this.overlayDiv.style.border = "1px solid #ccc";
    this.overlayDiv.style.padding = "10px";
    this.overlayDiv.style.zIndex = "1000";
    this.overlayDiv.style.width = "95%";
    this.overlayDiv.style.maxWidth = "960px";
    this.overlayDiv.style.height = "75%";
    this.overlayDiv.style.display = "flex";
    this.overlayDiv.style.flexDirection = "column";
    this.overlayDiv.style.left = "10px";
    this.overlayDiv.style.top = "150px";

    const closeOverlayBtn = document.createElement("button");
    closeOverlayBtn.innerHTML = "close";
    closeOverlayBtn.style.position = "absolute";
    closeOverlayBtn.style.top = "5px";
    closeOverlayBtn.style.right = "10px";
    closeOverlayBtn.onclick = () => {
      this.overlayDiv.style.visibility = "hidden";
    };

    const showNewsBtn = document.createElement("button");
    showNewsBtn.innerHTML = "news";
    showNewsBtn.style.position = "absolute";
    showNewsBtn.style.top = "5px";
    showNewsBtn.style.right = "100px";
    showNewsBtn.onclick = () => {
      this.infoDiv.setAttribute("hidden", "true");
      this.newsDiv.removeAttribute("hidden");
    };

    const showInfoBtn = document.createElement("button");
    showInfoBtn.innerHTML = "info";
    showInfoBtn.style.position = "absolute";
    showInfoBtn.style.top = "5px";
    showInfoBtn.style.right = "190px";
    showInfoBtn.onclick = () => {
      this.newsDiv.setAttribute("hidden", "true");
      this.infoDiv.removeAttribute("hidden");
    };

    this.newsDiv = document.createElement("div");
    this.newsDiv.style.overflowY = "auto";
    this.newsDiv.style.maxHeight = "60%";
    this.newsDiv.setAttribute("hidden", "true");

    this.infoDiv = document.createElement("div");
    this.infoDiv.style.overflowY = "auto";
    this.infoDiv.style.maxHeight = "60%";

    this.overlayDiv.appendChild(showInfoBtn);
    this.overlayDiv.appendChild(showNewsBtn);
    this.overlayDiv.appendChild(closeOverlayBtn);
    this.overlayDiv.appendChild(this.infoDiv);
    this.overlayDiv.appendChild(this.newsDiv);

    document.getElementById("chart").appendChild(this.overlayDiv);

    this.newsDiv.innerHTML = await this.newsService.getNews(clickedTreemapItem, date, currentLanguage);
    this.infoDiv.innerHTML = await this.marketDataService.getCompanyInfo(exchange, clickedTreemapItem, currentLanguage);
  }
}

class FinMapApp {
  constructor() {
    this.marketDataService = new MarketDataService();
    this.currencyManager = new CurrencyManager(this.marketDataService);
    this.newsService = new NewsService();
    this.chartManager = new ChartManager("chart", this.marketDataService, this.currencyManager);
    this.overlayWidget = new OverlayWidget(this.marketDataService, this.newsService);
    this.currentLanguage = "ENG";
    this.reponame = "data-us";
    this.nativeCurrency = "USD";
    this.currency = "USD";
    this.dataType = "marketcap";
    this.exchange = this.getExchangeFromUrl();
    this.isCurrencyToggled = false;
    this.initializeUI();
    this.setupEventListeners();
  }

  initializeUI() {
    this.dateInput = document.getElementById("inputDate");
    this.dataTypeInput = document.getElementById("inputDataType");
    this.searchInput = document.getElementById("inputSearch");
    this.currencyToggle = document.getElementById("currencyToggle");
    const today = new Date();
    this.dateInput.max = today.toISOString().split("T")[0];
    this.setInitialDateRange();
  }

  setInitialDateRange() {
    const minDates = {
      lse: "2025-02-07",
      moex: "2011-12-19",
      bist: "2015-11-30",
      default: "2024-12-09",
    };
    const minDate = minDates[this.exchange] || minDates.default;
    this.dateInput.min = new Date(`${minDate}T13:00:00`).toISOString().split("T")[0];
  }

  setupEventListeners() {
    this.dateInput.addEventListener("change", () => this.refreshChart());
    this.dataTypeInput.addEventListener("change", () => this.refreshChart());
    this.searchInput.addEventListener("keypress", this.handleSearch.bind(this));
    this.currencyToggle.addEventListener("click", () => this.toggleCurrency());
    document.getElementById("chart").addEventListener("click", (event) => {
      if (event.target.classList.contains("slice") && event.target.__data__) {
        const clickedTreemapItem = event.target.__data__.data;
        const date = this.dateInput.value;
        this.overlayWidget.addOverlayWidget(this.exchange, clickedTreemapItem, date, this.currentLanguage);
      }
    });
  }

  getExchangeFromUrl() {
    const url = new URL(window.location.href);
    const urlExchange = url.searchParams.get("exchange");
    const validExchanges = ["nasdaq", "nyse", "amex", "us-all", "moex", "lse", "bist"];
    return validExchanges.includes(urlExchange) ? urlExchange : "nasdaq";
  }

  getReponame(exchange) {
    switch (exchange) {
      case "moex":
        return "data-russia";
      default:
        return "data-us";
    }
  }

  async refreshChart() {
    this.exchange = this.getExchangeFromUrl();
    const date = this.dateInput.value;
    this.dataType = this.dataTypeInput.value;
    this.reponame = this.getReponame(this.exchange);
    await this.chartManager.refreshHistogram(
      this.reponame,
      this.exchange,
      this.dataType,
      this.currency,
      this.nativeCurrency
    );
  }

  handleSearch(event) {
    if (event.key === "Enter") {
      // Implement search logic if needed
      console.log("Search query:", this.searchInput.value);
    }
  }

  async toggleCurrency() {
    this.isCurrencyToggled = !this.isCurrencyToggled;
    if (this.isCurrencyToggled) {
      this.currency = this.nativeCurrency;
    } else {
      this.currency = "USD";
    }
    this.refreshChart();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new FinMapApp();
  app.refreshChart();
});