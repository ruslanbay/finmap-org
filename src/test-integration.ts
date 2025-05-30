/* eslint-disable no-console */

// Integration test for finmap.org application
// This test verifies core functionality works correctly

import { HistogramRenderer } from '../src/lib/charts/HistogramRenderer.js';
import { TreemapRenderer } from '../src/lib/charts/TreemapRenderer.js';
import { MarketDataService } from '../src/lib/data/MarketDataService.js';
import { MockDataService } from '../src/lib/data/MockDataService.js';
import type { ChartData, Exchange } from '../src/types/index.js';

async function testDataServices(): Promise<ChartData | null> {
  console.log('🧪 Testing Data Services...');

  try {
    // Test mock data service
    const mockData = await MockDataService.getMockData('nasdaq');
    console.log(`✅ Mock data service: loaded ${String(mockData.length)} NASDAQ securities`);

    // Test market data service (should fallback to mock)
    const marketData = await MarketDataService.fetchMarketData('nasdaq');
    console.log(`✅ Market data service: loaded ${String(marketData.length)} securities`);

    // Test data processing
    const chartData = MarketDataService.processChartData(
      marketData,
      'marketcap',
      'nasdaq',
      new Date().toISOString().split('T')[0] || '2024-01-01'
    );
    console.log(
      `✅ Data processing: created chart data with ${String(chartData.securities.length)} securities`
    );

    return chartData;
  } catch (error) {
    console.error('❌ Data service test failed:', error);
    return null;
  }
}

function testChartRenderers(chartData: ChartData): boolean {
  console.log('🧪 Testing Chart Renderers...');

  try {
    // Create test container
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    // Test treemap renderer
    console.log('Testing treemap renderer...');
    const treemapRenderer = new TreemapRenderer(container);
    treemapRenderer.render(chartData);
    console.log('✅ Treemap renderer: rendered successfully');

    // Test search functionality
    const searchResult = treemapRenderer.searchAndHighlight('AAPL');
    console.log(`✅ Treemap search: ${searchResult ? 'found' : 'not found'} AAPL`);

    // Clean up
    treemapRenderer.destroy();
    container.innerHTML = '';

    // Test histogram renderer
    console.log('Testing histogram renderer...');
    const histogramRenderer = new HistogramRenderer(container);
    histogramRenderer.render(chartData);
    console.log('✅ Histogram renderer: rendered successfully');

    // Test search functionality
    const histSearchResult = histogramRenderer.searchAndHighlight('MSFT');
    console.log(`✅ Histogram search: ${histSearchResult ? 'found' : 'not found'} MSFT`);

    // Clean up
    histogramRenderer.destroy();
    document.body.removeChild(container);

    return true;
  } catch (error) {
    console.error('❌ Chart renderer test failed:', error);
    return false;
  }
}

function testPerformance(chartData: ChartData): boolean {
  console.log('🧪 Testing Performance...');

  try {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    // Test treemap performance
    const treemapStart = performance.now();
    const treemapRenderer = new TreemapRenderer(container);
    treemapRenderer.render(chartData);
    const treemapTime = performance.now() - treemapStart;
    console.log(`✅ Treemap render time: ${treemapTime.toFixed(2)}ms`);

    treemapRenderer.destroy();
    container.innerHTML = '';

    // Test histogram performance
    const histogramStart = performance.now();
    const histogramRenderer = new HistogramRenderer(container);
    histogramRenderer.render(chartData);
    const histogramTime = performance.now() - histogramStart;
    console.log(`✅ Histogram render time: ${histogramTime.toFixed(2)}ms`);

    histogramRenderer.destroy();
    document.body.removeChild(container);

    // Performance check
    if (treemapTime < 1000 && histogramTime < 1000) {
      console.log('✅ Performance: Both charts render under 1 second');
      return true;
    } else {
      console.warn('⚠️ Performance: Charts taking longer than expected');
      return false;
    }
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return false;
  }
}

async function testExchangeSupport(): Promise<boolean> {
  console.log('🧪 Testing Multi-Exchange Support...');

  const exchanges: Exchange[] = ['nasdaq', 'nyse'];
  let passedTests = 0;

  for (const exchange of exchanges) {
    try {
      const data = await MarketDataService.fetchMarketData(exchange);
      if (data.length > 0) {
        console.log(`✅ ${exchange.toUpperCase()}: ${String(data.length)} securities loaded`);
        passedTests++;
      } else {
        console.warn(`⚠️ ${exchange.toUpperCase()}: No securities loaded`);
      }
    } catch (error) {
      console.error(`❌ ${exchange.toUpperCase()}: Failed to load data`, error);
    }
  }

  return passedTests === exchanges.length;
}

// Run all tests
async function runIntegrationTests(): Promise<boolean> {
  console.log('🚀 Starting Finmap.org Integration Tests');
  console.log('=====================================');

  let allTestsPassed = true;

  // Test 1: Data Services
  const chartData = await testDataServices();
  if (!chartData) {
    allTestsPassed = false;
    console.log('❌ Some integration tests FAILED');
    console.log('🔧 Please review the errors above');
    return false;
  }

  // Test 2: Chart Renderers
  const renderersPass = testChartRenderers(chartData);
  if (!renderersPass) allTestsPassed = false;

  // Test 3: Performance
  const performancePass = testPerformance(chartData);
  if (!performancePass) allTestsPassed = false;

  // Test 4: Multi-Exchange Support
  const exchangePass = await testExchangeSupport();
  if (!exchangePass) allTestsPassed = false;

  // Results
  console.log('=====================================');
  if (allTestsPassed) {
    console.log('🎉 All integration tests PASSED! ✅');
    console.log('📊 Finmap.org application is ready for production');
  } else {
    console.log('❌ Some integration tests FAILED');
    console.log('🔧 Please review the errors above');
  }

  return allTestsPassed;
}

// Export for use in console
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(window as any).runFinmapTests = runIntegrationTests;

// Auto-run tests if in development mode
if (window.location.hostname === 'localhost') {
  console.log('🔧 Development mode detected - running integration tests...');
  void runIntegrationTests();
}
