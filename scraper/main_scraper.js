// main_scraper.js - Structure-focused web scraper that prioritizes content extraction
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { setupResourceBlocker } = require('./utils/resourceBlocker');
const { InfiniteScrollStrategy, ClickPaginationStrategy, URLPaginationStrategy } = require('./utils/paginationStrategies');
const { MainExtractor } = require('./utils/mainExtractor');
const { sleep, waitForSelector } = require('./utils/helpers');
const cloudflareBypass = require('./utils/cloudflareBypass');

// Initialize stealth mode
puppeteer.use(StealthPlugin());

/**
 * Main scraper function that focuses on structure detection and content extraction.
 * @param {string} url - The target URL.
 * @param {object} [options={}] - Configuration options.
 *   @param {number} [options.maxScrolls=5] - Max number of scroll attempts.
 *   @param {number} [options.scrollDelay=2000] - Delay in ms between scroll actions.
 *   @param {string|null} [options.waitForSelector=null] - CSS selector to wait for before starting.
 *   @param {boolean} [options.headless=true] - Whether to run Puppeteer in headless mode.
 *   @param {string|null} [options.proxy=null] - Proxy server URL.
 *   @param {boolean} [options.useResourceBlocker=true] - Whether to use resource blocker.
 *   @param {boolean} [options.bypassCloudflare=true] - Whether to attempt to bypass Cloudflare.
 *   @param {boolean} [options.handlePagination=true] - Whether to automatically handle pagination.
 *   @param {string|null} [options.paginationStrategy=null] - Force a specific pagination strategy ('infinite', 'click', 'url').
 *   @param {string|null} [options.clickSelector=null] - CSS selector for click-based pagination.
 * @returns {Promise<{ title: string, content: string[], metadata: object, structureType: string, paginationType: string }>}
 */
async function mainScraper(url, options = {}) {
  const {
    maxScrolls = 10,
    scrollDelay = 2000,
    waitForSelector = null,
    headless = true,
    proxy = null,
    useResourceBlocker = true,
    bypassCloudflare = true,
    handlePagination = true,
    paginationStrategy = null,
    clickSelector = null
  } = options;

  let browser;
  let page;
  
  try {
    console.log(`🌐 Starting main scraper for ${url}`);
    
    // Get enhanced browser launch options that help with Cloudflare bypass
    const browserOptions = cloudflareBypass.getBrowserLaunchArgs();
    
    // Override headless setting if specified
    browserOptions.headless = headless;
    
    // Add proxy if specified
    if (proxy) {
      console.log(`🔒 Using proxy server: ${proxy}`);
      browserOptions.args.push(`--proxy-server=${proxy}`);
    }

    console.log(`🚀 Launching browser...`);
    browser = await puppeteer.launch(browserOptions);

    // Navigation with Cloudflare bypass if enabled
    if (bypassCloudflare) {
      console.log(`🛡️ Navigating with Cloudflare bypass...`);
      page = await cloudflareBypass.navigateWithBypass(browser, url);
      
      // If Cloudflare bypass failed, try again with standard navigation
      if (!page) {
        console.warn('⚠️ Cloudflare bypass failed, trying standard navigation...');
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      }
    } else {
      // Standard navigation
      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
      );
      
      console.log(`🔗 Navigating to ${url} (standard mode)...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    }

    // Set default navigation timeout
    await page.setDefaultNavigationTimeout(90000);

    // Set up resource blocking if enabled
    if (useResourceBlocker) {
      await setupResourceBlocker(page);
    }

    console.log(`📄 Navigation complete. Waiting for content to load...`);
    await sleep(2000);

    // Wait for base elements if specified
    if (waitForSelector) {
      console.log(`🔍 Waiting for selector: ${waitForSelector}...`);
      try {
        await page.waitForSelector(waitForSelector, { timeout: 60000 });
        console.log(`✅ Selector found.`);
      } catch (e) {
        console.warn(`⚠️ Selector "${waitForSelector}" not found within timeout.`);
      }
    }

    // Handle pagination based on strategy if specified before extraction
    if (paginationStrategy && !handlePagination) {
      console.log(`📖 Using manual pagination strategy: ${paginationStrategy}`);
      await handleManualPagination(page, paginationStrategy, {
        maxScrolls,
        scrollDelay,
        clickSelector,
        waitForSelector
      });
    }

    // Initialize MainExtractor
    const extractor = new MainExtractor(page);
    
    // If handlePagination is true, let the MainExtractor handle pagination automatically
    if (!handlePagination) {
      // Disable pagination in the extractor
      extractor.handlePagination = async () => {
        console.log('📃 Pagination handling disabled by user.');
        return false;
      };
    }
    
    console.log(`🧠 Extracting content...`);
    await extractor.extract();
    
    // Return the extracted data
    return {
      title: extractor.data.title,
      content: extractor.data.content,
      metadata: extractor.data.metadata,
      structureType: extractor.data.structureType,
      paginationType: extractor.data.paginationType,
      extractionMethod: extractor.data.extractionMethod,
      url: extractor.data.url
    };

  } catch (error) {
    console.error(`❌ Error during scraping process for ${url}:`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log(`🏁 Browser closed.`);
    }
  }
}

/**
 * Handles manual pagination based on specified strategy
 */
async function handleManualPagination(page, strategy, options) {
  const {
    maxScrolls,
    scrollDelay,
    clickSelector,
    waitForSelector
  } = options;

  let paginationStrategy;
  
  switch (strategy) {
    case 'infinite':
      console.log(`🔄 Using infinite scroll strategy, max scrolls: ${maxScrolls}`);
      paginationStrategy = new InfiniteScrollStrategy(page, {
        maxAttempts: maxScrolls,
        delay: scrollDelay,
        scrollContainerSelector: null,
        minHeightChange: 10
      });
      break;
    case 'click':
      if (!clickSelector) {
        console.warn('⚠️ clickSelector is required for click pagination. Skipping pagination.');
        return;
      }
      console.log(`🖱️ Using click pagination strategy with selector: ${clickSelector}`);
      paginationStrategy = new ClickPaginationStrategy(page, {
        maxAttempts: maxScrolls,
        delay: scrollDelay,
        buttonSelector: clickSelector
      });
      break;
    case 'url':
      console.warn('⚠️ URL pagination strategy requires URL pattern. Using infinite scroll instead.');
      paginationStrategy = new InfiniteScrollStrategy(page, {
        maxAttempts: maxScrolls,
        delay: scrollDelay,
        scrollContainerSelector: null,
        minHeightChange: 10
      });
      break;
    default:
      console.warn(`⚠️ Unknown pagination strategy: ${strategy}. Using infinite scroll.`);
      paginationStrategy = new InfiniteScrollStrategy(page, {
        maxAttempts: maxScrolls,
        delay: scrollDelay,
        scrollContainerSelector: null,
        minHeightChange: 10
      });
  }

  await paginationStrategy.paginate();
}

module.exports = mainScraper; 