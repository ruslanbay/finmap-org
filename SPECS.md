# FinMap.org Specifications

## Objectives
Transform finmap.org PWA from vanilla JavaScript + Plotly.js to TypeScript + D3.js with zero-build complexity, maintaining GitHub Pages deployment and offline capabilities.

## PWA Caching Strategy
- **Service Worker**: Cache static assets (HTML, CSS, JS, images)
- **Network First**: Market data (JSON files) with offline fallback
- **Cache First**: Static resources, D3.js library
- **Runtime Caching**: GitHub raw API responses
- **Storage Quota**: Manage cache size for mobile devices

## Core Principles
- **KISS**: No build tools, native ES2024 modules
- **DRY**: Centralized utilities, typed interfaces
- **YAGNI**: Essential features only
- **Performance**: D3.js over Plotly.js for speed/size

## Technology Stack
```
TypeScript 5.8.2   - Type safety, ES2024 target
D3.js 7.9.0        - Chart rendering
ES2024 Modules     - Native browser support
ESLint 9.32.0      - Code quality
Prettier 3.6.2     - Formatting
```

## UI/UX Strategy
### Current Layout (Keep)
- **Header**: Fixed 45px height, horizontal scroll, dark theme
- **Chart Area**: `calc(100% - 50px)` height, full width
- **Footer**: Fixed 25px height, minimal info
- **Mobile Menu**: Hamburger overlay, full-screen slide-down

### Elements to Preserve
- **Color Scheme**: `rgb(65, 69, 84)` background, white text
- **Chart Container**: Full-screen positioning
- **Responsive Design**: Mobile-first touch-friendly approach

## File Structure
```
/
├── main.ts                    # Entry point
├── types.ts                   # All interfaces  
├── config.ts                  # Global configuration
├── data.ts                    # Data fetching
├── charts.ts                  # D3 renderers
├── ui.ts                      # DOM interactions
├── utils.ts                   # Helpers
├── index.html                 # Main HTML
├── service-worker.js          # PWA worker
```

## Core Interfaces
```typescript
// Raw API response structure for current market data
interface MarketDataResponse {
  securities: {
    columns: string[];  // Column names array
    data: any[][];      // Array of arrays with values matching columns
  };
}

// Parsed market data item (single security/sector)
interface MarketData {
  exchange: string;               // Exchange name (e.g., "nasdaq", "amex")
  country: string;               // Country code (e.g., "United States", may be empty string)
  type: 'stock' | 'etf' | 'sector'; // Security type
  sector: string;                // Sector name
  industry: string;              // Industry classification
  currencyId: string;            // Currency code (e.g., "USD")
  ticker: string;                // Security symbol
  nameEng: string;               // English name
  nameEngShort: string;          // Short English name
  nameOriginal: string;          // Original name
  nameOriginalShort: string;     // Short original name
  priceOpen: number;             // Opening price
  priceLastSale: number;         // Last trade price
  priceChangePct: number | null; // Price change percentage (can be null)
  volume: number;                // Trading volume
  value: number;                 // Trading value
  numTrades: number;             // Number of trades
  marketCap: number;             // Market capitalization
  listedFrom: string;            // Listing start date (may be empty string)
  listedTill: string;            // Listing end date (may be empty string)
  wikiPageIdEng: string;         // English Wikipedia page ID (may be empty string)
  wikiPageIdOriginal: string;    // Original Wikipedia page ID (may be empty string)
  nestedItemsCount: number;      // Count of nested items (for sectors)
}

// Historical data structure
interface HistoricalDataResponse {
  dates: string[];               // Array of date strings
  sectors: HistoricalSector[];   // Array of sector historical data
}

interface HistoricalSector {
  sectorName: string;            // Sector name
  itemsNumber: number[];         // Time series of item counts
  marketCap: number[];           // Time series of market cap values
  priceChangePct: number[];      // Time series of price change percentages
}

type Exchange = 'nasdaq' | 'nyse' | 'amex' | 'us-all' | 'moex' | 'lse' | 'bist';
type ChartType = 'treemap' | 'histogram';
type DataType = 'marketcap' | 'value' | 'trades' | 'nestedItems';
type Currency = 'USD' | 'RUB' | 'GBP' | 'TRY';
type Language = 'ENG' | 'RUS';

interface AppConfig {
  exchange: Exchange;
  chartType: ChartType;
  dataType: DataType;
  date: string;
  currency: Currency;
  language: Language;
}

interface FilterCriteria {
  ticker: string[];
  amount: number[];
}

interface DataParsingService {
  parseMarketData(response: MarketDataResponse): MarketData[];
  parseHistoricalData(response: HistoricalDataResponse): HistoricalSector[];
}

// Data parsing utility - converts column/data format to typed objects
interface DataParser {
  parseSecurityRow(columns: string[], row: any[]): MarketData;
  validateDataIntegrity(data: MarketDataResponse): boolean;
}
```

## Critical Implementation Details
### Data URLs
- US markets: `https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/marketdata/{date}.json`
- UK markets: `https://raw.githubusercontent.com/finmap-org/data-uk/refs/heads/main/marketdata/{date}.json`
- Russia: `https://raw.githubusercontent.com/finmap-org/data-russia/refs/heads/main/marketdata/{date}.json`

### Company Info APIs
- US: `https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/securities/{exchange}/{ticker[0]}/{ticker}.json`
- News: `https://news.cloudflare-cpr0d.workers.dev/{lang}:{ticker}.xml`
- Wikipedia: `https://{lang}.wikipedia.org/w/api.php?action=query&pageids={id}&prop=extracts`

### DOM Requirements (Modern Best Practices)
- Use semantic HTML elements and modern selectors
- CSS Grid/Flexbox for layouts
- CSS custom properties for theming
- Modern event delegation patterns
- Accessible form controls and ARIA labels

### Chart Behavior Requirements
- Treemap: Click drill-down, hover tooltips, color by price change
- Histogram: Zoom/pan, range selector, time-series display
- Mobile: Touch interactions, responsive layout
- Overlays: Company info popups with news feeds

## Architecture
- **Simple State**: Type-safe global config object, no observers
- **Data Layer**: Direct fetch calls, localStorage for filters only
- **Chart Factory**: D3TreemapRenderer, D3HistogramRenderer
- **Event-Driven**: DOM events → direct config updates → chart re-render

## D3.js Implementation
- **Treemap**: Canvas-based, hierarchical data grouping, click drill-down
- **Histogram**: Canvas-based, time-series data, zoom/pan interactions
- **Color Scale**: d3.scaleSequential for price changes (-3% to +3%)
- **Interactions**: Mouse events on canvas with coordinate mapping

## Data Flow
```
URL params → Global config → Direct fetch → Chart render
User input → Config update → Chart re-render
```

## Performance Targets
- Initial load: <2s
- Chart render: <500ms
- Bundle size: <200KB
- No memory leaks

## Development
```bash
tsc --watch                    # Development
tsc                           # Production build
```

## Constraints
- No tests creation
- No comments or console output
- No documentation generation
- No legacy code preservation
- No fallback implementations
- Complete rewrite only
- No loading indicators (modern async UI patterns)

## Implementation Order
1. Types and interfaces
2. Global configuration
3. Data fetching utilities
4. Chart renderers
5. UI event handlers
6. Main entry point
7. HTML integration
8. Service worker updates

## Success Criteria
- All current functionality preserved
- Type safety enforced
- Zero runtime errors
- Mobile responsive maintained
- PWA capabilities enhanced
- Offline functionality preserved
- Install prompt working
- Service worker updated for new structure
- Visual consistency with current app
- Modern accessibility standards
- URL compatibility maintained
