// main_scraper.js - Structure-focused web scraper that prioritizes content extraction
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { setupResourceBlocker } = require('./utils/resourceBlocker');
const { InfiniteScrollStrategy, ClickPaginationStrategy, URLPaginationStrategy } = require('./utils/paginationStrategies');
const { MainExtractor } = require('./utils/mainExtractor');
const { sleep, waitForSelector } = require('./utils/helpers');
const cloudflareBypass = require('./utils/cloudflareBypass');
const fs = require('fs').promises;
const path = require('path');

// Initialize stealth mode
puppeteer.use(StealthPlugin());

/**
 * Parse command line arguments
 */
function parseArguments(args) {
  const options = {
    maxScrolls: 5,
    scrollDelay: 2000,
    bypassCloudflare: true,
    handlePagination: true,
    headless: true,
    paginationStrategy: null,
    output: path.join(__dirname, 'results')
  };

  let url = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const value = args[i + 1];
      switch (arg) {
        case '--maxScrolls':
          options.maxScrolls = parseInt(value, 10);
          i++;
          break;
        case '--scrollDelay':
          options.scrollDelay = parseInt(value, 10);
          i++;
          break;
        case '--bypassCloudflare':
          options.bypassCloudflare = true;
          break;
        case '--noBypassCloudflare':
          options.bypassCloudflare = false;
          break;
        case '--handlePagination':
          options.handlePagination = true;
          break;
        case '--noHandlePagination':
          options.handlePagination = false;
          break;
        case '--paginationStrategy':
          if (['infinite', 'click', 'url'].includes(value)) {
            options.paginationStrategy = value;
          }
          i++;
          break;
        case '--headless':
          options.headless = true;
          break;
        case '--noHeadless':
          options.headless = false;
          break;
        case '--output':
          options.output = value;
          i++;
          break;
        case '--help':
          showHelp();
          process.exit(0);
      }
    } else if (!url) {
      url = arg;
    }
  }

  return { url, options };
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
🔍 Prysm - Structure-Aware Web Scraper

Usage: npm run start:cli [url] [options]

Options:
  --maxScrolls <number>     Maximum scroll attempts (default: 5)
  --scrollDelay <ms>       Delay between scrolls in ms (default: 2000)
  --bypassCloudflare      Enable Cloudflare bypass (default: true)
  --noBypassCloudflare    Disable Cloudflare bypass
  --handlePagination      Enable auto pagination (default: true)
  --noHandlePagination    Disable auto pagination
  --paginationStrategy    Force pagination strategy (infinite/click/url)
  --headless             Run in headless mode (default: true)
  --noHeadless          Run with browser visible
  --output <path>       Custom output path for results
  --help                Show this help message

Examples:
  npm run start:cli "https://example.com"
  npm run start:cli "https://example.com" --maxScrolls 10 --noHeadless
  npm run start:cli "https://example.com" --output "./results"
`);
}

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

// If running from command line
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    process.exit(0);
  }

  const { url, options } = parseArguments(args);

  if (!url) {
    console.error('❌ Error: URL is required');
    showHelp();
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  fs.mkdir(options.output, { recursive: true })
    .then(async () => {
      try {
        console.log(`\n🔍 Prysm Web Scraper`);
        console.log(`=====================================`);
        console.log(`🎯 Target URL: ${url}`);
        console.log(`📁 Results will be saved to: ${options.output}`);
        console.log(`⚙️  Options: ${JSON.stringify(options, null, 2)}`);
        console.log(`=====================================\n`);

        const result = await mainScraper(url, options);
        
        // Create a safe filename from the URL
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const urlObj = new URL(url);
        const sanitizedDomain = urlObj.hostname.replace(/[^a-z0-9]/g, '_');
        const sanitizedPath = urlObj.pathname.replace(/[^a-z0-9]/g, '_').slice(0, 30);
        const filename = `${sanitizedDomain}${sanitizedPath}_${timestamp}.json`;
        const outputFile = path.join(options.output, filename);
        
        // Save the results
        await fs.writeFile(outputFile, JSON.stringify({
          url,
          scrapeDate: new Date().toISOString(),
          options,
          result
        }, null, 2));
        
        console.log('\n✨ Scraping completed successfully!');
        console.log(`\n📊 Results Summary:`);
        console.log(`=====================================`);
        console.log(`📄 Title: ${result.title}`);
        console.log(`📝 Content Items: ${result.content.length}`);
        console.log(`🔍 Structure Type: ${result.structureType}`);
        console.log(`📑 Pagination Type: ${result.paginationType}`);
        console.log(`⚙️  Extraction Method: ${result.extractionMethod}`);
        console.log(`\n💾 Full results saved to:`);
        console.log(outputFile);
        console.log(`=====================================`);
        
      } catch (error) {
        console.error('\n❌ Error during scraping:');
        console.error('=====================================');
        if (error.message) console.error(error.message);
        if (error.stack) console.error(error.stack);
        console.error('=====================================');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Error creating output directory:', error);
      process.exit(1);
    });
}

module.exports = mainScraper; 