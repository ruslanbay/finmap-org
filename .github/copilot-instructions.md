# FinMap.org AI Coding Instructions

## Project Overview
FinMap.org is a PWA financial visualization tool that displays global stock market data using D3.js treemaps and histograms. The project is transitioning from vanilla JS + Plotly.js to TypeScript + D3.js while maintaining zero-build deployment to GitHub Pages.

## Architecture Patterns

### Data Flow Architecture
```
URL params → Global config → Direct fetch → Chart render
User input → Config update → Chart re-render
```

- **No complex state management**: Single global config object in `config.ts`
- **Direct data fetching**: No data layers, direct GitHub raw API calls
- **Event-driven rendering**: DOM events trigger config updates and chart re-renders

### File Structure & Responsibilities
- `main.ts` - Entry point, DOMContentLoaded initialization
- `config.ts` - Global state, URL sync, localStorage filters
- `data.ts` - API fetching, response parsing with column/row format
- `charts.ts` - D3.js renderers (D3TreemapRenderer, D3HistogramRenderer)
- `ui.ts` - DOM interactions, event delegation
- `types.ts` - All TypeScript interfaces
- `utils.ts` - Pure helper functions

### Data API Patterns
```typescript
// All APIs return {securities: {columns: string[], data: any[][]}} format
const urls = {
  marketData: `https://raw.githubusercontent.com/finmap-org/data-{region}/refs/heads/main/marketdata/{date}/{exchange}.json`,
  companyInfo: `https://raw.githubusercontent.com/finmap-org/data-us/refs/heads/main/securities/{exchange}/{ticker[0]}/{ticker}.json`,
  news: `https://news.cloudflare-cpr0d.workers.dev/{lang}:{ticker}.xml`,
  currency: `https://raw.githubusercontent.com/finmap-org/data-currency/refs/heads/main/marketdata/{currency}perUSD.json`
};
```

## Critical Development Workflows

### TypeScript Compilation
```bash
npx tsc          # Compile TS to JS for production
npx tsc --watch  # Development mode
```
- **No build tools**: Direct .ts → .js compilation, ES2024 modules
- **GitHub Pages deployment**: Compiled .js files committed to repo
- **Import pattern**: Always use `.js` extensions in imports, even from `.ts` files

### Chart Implementation Pattern
```typescript
// All chart renderers follow this interface
interface ChartRenderer {
  render(data: MarketData[], container: HTMLElement): void;
  destroy(): void;
}

// Canvas-based for performance, not SVG
class D3TreemapRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  // Position calculations must account for devicePixelRatio
  // Drill-down via currentRoot node switching
}
```

### D3.js Treemap Specifics
- **Canvas rendering**: Performance over SVG for large datasets
- **Hierarchical drill-down**: `currentRoot` node switching, pathbar navigation
- **Plotly color compatibility**: `rgb(236,48,51)` to `rgb(42,202,85)` gradient for -3% to +3%
- **Portfolio mode**: CSV upload → localStorage → filtered rendering with position sizing

## Project-Specific Conventions

### Exchange-Specific Data Mapping
```typescript
// Different repos per region, consistent URL patterns
const repoMapping = {
  'nasdaq|nyse|amex|us-all': 'data-us',
  'moex': 'data-russia', 
  'lse': 'data-uk',
  'bist': 'data-turkey'
};

// Currency per exchange for conversion
const nativeCurrencies = {
  'moex': 'RUB', 'lse': 'GBP', 'bist': 'TRY', 
  'nasdaq|nyse|amex|us-all': 'USD'
};
```

### Portfolio Analysis Pattern
```typescript
// CSV format: ticker,amount,date,price,operation
// Stored in localStorage as 'finmap-filters'
// Renders treemap with position-weighted sizing
// Portfolio mode detected by filterList.amount.some(v => v > 0)
```

### UI Interaction Patterns
- **Event delegation**: Single document click handler for data-* attributes
- **Mobile-first**: Hamburger menu, touch interactions, responsive canvas
- **PWA features**: Service worker caching, manifest shortcuts per exchange
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation

## Integration Points

### Service Worker Caching Strategy
```javascript
// Static assets: cache-first
// Market data: network-first with offline fallback  
// Company info: runtime caching
// News feeds: network-only
```

### External Dependencies
- **D3.js v7**: CDN import, treemap/hierarchy/scale functions
- **GitHub raw API**: Primary data source, rate limit considerations
- **News API**: RSS/XML feeds via CloudFlare worker proxy
- **Wikipedia API**: Company descriptions for MOEX stocks

### Component Communication
- **No event system**: Direct function calls between modules
- **Shared state**: Single config object, no observers/subscriptions
- **Error handling**: User alerts, graceful degradation, no crash recovery

## Key Performance Constraints
- **Bundle size**: <200KB total (currently ~150KB)
- **Initial load**: <2s on 3G
- **Chart render**: <500ms for 1000+ securities
- **Memory**: No leaks, proper cleanup in destroy() methods

## Testing & Debugging
- **No automated tests**: Manual testing only per project constraints
- **Browser devtools**: Canvas debugging via coordinate logging
- **API testing**: Direct fetch calls in console
- **PWA testing**: Chrome DevTools Application tab

Remember: This is a zero-build, GitHub Pages deployed PWA. All code must work in modern browsers without transpilation beyond TypeScript compilation.

Keep the code clean and simple by following modern best practices. Avoid overengineering, redundancy, and unnecessary fallbacks. Don't write comments, tests, or documentation.