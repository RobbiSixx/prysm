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
const { URL } = require('url');

// Initialize stealth mode
puppeteer.use(StealthPlugin());

/**
 * Parse command line arguments
 */
function parseArguments(args) {
  const options = {
    maxScrolls: 100,
    scrollDelay: 1000,
    bypassCloudflare: true,
    handlePagination: true,
    headless: true,
    paginationStrategy: null,
    output: path.join(__dirname, 'results'),
    pages: 1, // Default to 1 page (single page scrape)
    followLinks: false, // By default, don't follow links
    linkSelector: 'a', // Default link selector
    sameDomainOnly: true // Only follow links on the same domain
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
        case '--pages':
          const pageCount = parseInt(value, 10);
          options.pages = pageCount;
          if (pageCount > 1) {
            options.followLinks = true; // Enable link following if pages > 1
          }
          i++;
          break;
        case '--followLinks':
          options.followLinks = true;
          break;
        case '--noFollowLinks':
          options.followLinks = false;
          break;
        case '--linkSelector':
          options.linkSelector = value;
          i++;
          break;
        case '--allDomains':
          options.sameDomainOnly = false;
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
  --pages <number>        Maximum number of pages to scrape (default: 1)
  --followLinks           Enable link following (required for multi-page scraping)
  --noFollowLinks         Disable link following
  --linkSelector <selector> CSS selector for links to follow (default: 'a')
  --allDomains            Follow links to any domain (default: same domain only)
  --maxScrolls <number>   Maximum scroll attempts (default: 50)
  --scrollDelay <ms>      Delay between scrolls in ms (default: 1000)
  --bypassCloudflare      Enable Cloudflare bypass (default: true)
  --noBypassCloudflare    Disable Cloudflare bypass
  --handlePagination      Enable auto pagination (default: true)
  --noHandlePagination    Disable auto pagination
  --paginationStrategy    Force pagination strategy (infinite/click/url)
  --headless              Run in headless mode (default: true)
  --noHeadless            Run with browser visible
  --output <path>         Custom output path for results
  --help                  Show this help message

Examples:
  npm run start:cli "https://example.com"
  npm run start:cli "https://example.com" --pages 5
  npm run start:cli "https://example.com" --maxScrolls 50 --noHeadless
`);
}

/**
 * Extract links from a page
 */
async function extractLinks(url, options) {
  const browser = await puppeteer.launch({
    headless: options.headless ? 'new' : false
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(2000);
    
    // Extract all links matching the selector
    const links = await page.evaluate((selector) => {
      const linkElements = Array.from(document.querySelectorAll(selector));
      return linkElements
        .map(link => link.href)
        .filter(href => href && href.startsWith('http'));
    }, options.linkSelector);
    
    return links;
  } catch (error) {
    console.error(`Error extracting links from ${url}:`, error);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * Filter links to only include those from the same domain
 */
function filterLinksBySameDomain(links, baseUrl) {
  try {
    const baseUrlObj = new URL(baseUrl);
    const baseDomain = baseUrlObj.hostname;
    
    return links.filter(link => {
      try {
        const linkUrl = new URL(link);
        return linkUrl.hostname === baseDomain;
      } catch (e) {
        return false;
      }
    });
  } catch (e) {
    console.error('Error filtering links:', e);
    return links;
  }
}

/**
 * Main scraper function that focuses on structure detection and content extraction.
 * @param {string} url - The target URL.
 * @param {object} [options={}] - Configuration options.
 */
async function mainScraper(url, options = {}) {
  // If multiple pages are requested, handle it with multi-page scraping
  if ((options.pages && options.pages > 1) || options.followLinks) {
    return await multiPageScrape(url, options);
  }
  
  // Otherwise, just scrape a single page
  return await singlePageScrape(url, options);
}

/**
 * Scrape a single page
 */
async function singlePageScrape(url, options = {}) {
  const {
    maxScrolls,
    scrollDelay,
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
  let progressInterval;
  
  try {
    // Browser launch and setup
    const browserOptions = cloudflareBypass.getBrowserLaunchArgs();
    browserOptions.headless = headless;
    
    if (proxy) {
      browserOptions.args.push(`--proxy-server=${proxy}`);
    }

    console.log(`🚀 Starting Prysm scraper for ${url}`);
    browser = await puppeteer.launch(browserOptions);

    // Navigation with Cloudflare bypass if enabled
    if (bypassCloudflare) {
      page = await cloudflareBypass.navigateWithBypass(browser, url);
      
      if (!page) {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      }
    } else {
      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
      );
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    }

    await page.setDefaultNavigationTimeout(90000);

    if (useResourceBlocker) {
      await setupResourceBlocker(page);
    }

    await sleep(2000);

    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 60000 });
      } catch (e) {
        // Silently continue if selector not found
      }
    }

    // Initialize MainExtractor
    const extractor = new MainExtractor(page);
    
    if (!handlePagination) {
      extractor.handlePagination = async () => false;
    }
    
    console.log(`\n⏳ Extracting content (this may take several minutes to complete)...`);
    
    // Create a simple progress indicator
    progressInterval = setInterval(() => {
      process.stdout.write('.');
    }, 1000);
    
    // First extraction before pagination
    await extractor.extract();
    
    // Handle pagination based on strategy if specified before extraction
    if (handlePagination) {
      // Create pagination options
      const paginationOptions = {
        maxScrolls: maxScrolls,
        scrollDelay: scrollDelay,
        clickSelector: clickSelector,
        waitForSelector: waitForSelector
      };
      
      // Set up and run scroll strategies
      const infiniteScroll = await setupInfiniteScroll(page, paginationOptions);
      await infiniteScroll.paginate();
      
      // Extract content again after all scroll strategies
      await extractor.extract();
    }
    
    // Clear the progress indicator
    clearInterval(progressInterval);
    process.stdout.write('\n\n');
    
    return {
      title: extractor.data.title,
      content: extractor.data.content,
      url: extractor.data.url
    };

  } catch (error) {
    // Clear the progress indicator if there's an error
    if (progressInterval) clearInterval(progressInterval);
    console.error(`❌ Error during scraping:`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape multiple pages by following links
 */
async function multiPageScrape(url, options = {}) {
  // Ensure default options are set
  options = {
    maxScrolls: 100,
    scrollDelay: 1000,
    bypassCloudflare: true,
    handlePagination: true,
    headless: true,
    paginationStrategy: null,
    output: path.join(__dirname, 'results'),
    pages: 5,
    followLinks: true,
    linkSelector: 'a',
    sameDomainOnly: true,
    ...options
  };

  // Create output directory
  await fs.mkdir(options.output, { recursive: true });
  
  // Results array
  const results = [];
  
  // Set to track visited URLs (to avoid duplicates)
  const visitedUrls = new Set();
  
  // Queue of URLs to visit
  let urlsToVisit = [url];
  visitedUrls.add(url);
  
  console.log(`\n🔍 Prysm Multi-Page Scraper`);
  console.log(`=====================================`);
  console.log(`🎯 Starting URL: ${url}`);
  console.log(`📖 Max pages to scrape: ${options.pages}`);
  console.log(`📁 Results will be saved to: ${options.output}`);
  console.log(`=====================================\n`);
  
  // Scrape pages until we hit the limit or run out of URLs
  let pageCount = 0;
  let domain = '';
  
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    console.error('Invalid URL:', url);
    return { multiPageResults: [], mainPage: null };
  }
  
  let mainPageResult = null;
  
  while (urlsToVisit.length > 0 && pageCount < options.pages) {
    const currentUrl = urlsToVisit.shift();
    pageCount++;
    
    try {
      // Scrape the current URL using single page scraper
      const result = await singlePageScrape(currentUrl, options);
      
      // Store the first page result separately
      if (pageCount === 1) {
        mainPageResult = result;
      }
      
      // Add result to the results array
      results.push({
        url: currentUrl,
        result: result
      });
      
      // Create a filename based on URL path and timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const urlObj = new URL(currentUrl);
      const sanitizedPath = urlObj.pathname.replace(/[^a-z0-9]/g, '_').slice(0, 30);
      const filename = `${domain}${sanitizedPath}_${timestamp}.json`;
      const outputFile = path.join(options.output, filename);
      
      // Save the individual result
      await fs.writeFile(outputFile, JSON.stringify({
        url: currentUrl,
        scrapeDate: new Date().toISOString(),
        result: result
      }, null, 2));
      
      console.log(`✅ Saved results to: ${outputFile}`);
      
      // If this isn't the last page, find links to follow
      if (pageCount < options.pages) {
        console.log(`🔍 Finding links to follow...`);
        
        // Extract links from the current page
        let links = await extractLinks(currentUrl, options);
        console.log(`  Found ${links.length} links`);
        
        // Filter links if needed
        if (options.sameDomainOnly) {
          links = filterLinksBySameDomain(links, url);
          console.log(`  Filtered to ${links.length} links on same domain`);
        }
        
        // Add new links to the queue if they haven't been visited
        for (const link of links) {
          if (!visitedUrls.has(link)) {
            urlsToVisit.push(link);
            visitedUrls.add(link);
            
            // Break if we've queued enough URLs to reach our page limit
            if (visitedUrls.size >= options.pages) {
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error scraping ${currentUrl}:`, error);
    }
  }
  
  // Create a summary file with links to all individual results
  const summaryFile = path.join(options.output, `${domain}_summary_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(summaryFile, JSON.stringify({
    startUrl: url,
    pagesScraped: pageCount,
    scrapeDate: new Date().toISOString(),
    pages: results.map(r => ({
      url: r.url,
      title: r.result.title,
      contentItems: r.result.content.length
    }))
  }, null, 2));
  
  console.log(`\n✨ Scraping completed successfully!`);
  console.log(`📊 Results Summary:`);
  console.log(`=====================================`);
  console.log(`📄 Pages scraped: ${pageCount}`);
  console.log(`🔗 Starting URL: ${url}`);
  console.log(`💾 Summary saved to: ${summaryFile}`);
  console.log(`=====================================`);
  
  // Return both multi-page results and the main page result
  return {
    multiPageResults: results,
    mainPage: mainPageResult || (results.length > 0 ? results[0].result : null)
  };
}

/**
 * Setup scroll and pagination based on strategy
 */
async function setupInfiniteScroll(page, options) {
  const { maxScrolls, scrollDelay, scrollContainerSelector } = options;
  
  const infiniteScroll = new InfiniteScrollStrategy(page, {
    maxAttempts: maxScrolls,
    delay: scrollDelay,
    scrollContainerSelector
  });
  
  return infiniteScroll;
}

/**
 * Handle pagination based on strategy
 */
async function handleManualPagination(page, strategyType, options) {
  try {
    if (strategyType === 'infinite') {
      const infiniteScroll = await setupInfiniteScroll(page, options);
      await infiniteScroll.paginate();
    } else if (strategyType === 'click' && options.clickSelector) {
      const clickStrategy = new ClickPaginationStrategy(page, {
        maxAttempts: options.maxScrolls,
        delay: options.scrollDelay,
        buttonSelector: options.clickSelector
      });
      await clickStrategy.paginate();
    } else if (strategyType === 'url') {
      const urlPattern = '[PAGE]';
      const baseUrl = page.url().replace(/(\?|#).*$/, '');
      const urlStrategy = new URLPaginationStrategy(page, {
        maxAttempts: options.maxScrolls,
        delay: options.scrollDelay,
        urlPattern,
        baseUrl,
        contentSelector: options.waitForSelector
      });
      await urlStrategy.paginate();
    }
  } catch (error) {
    // Silent error handling
  }
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
      if (options.pages > 1) {
        console.log(`📑 Multi-page mode: Will scrape up to ${options.pages} pages`);
      }
      
      try {
        const result = await mainScraper(url, options);
        
        // If it's a multi-page result, the format is different
        if (result.multiPageResults) {
          // Main page result is already saved by the multi-page scraper
          console.log(`\n✨ Multi-page scraping completed successfully!`);
          console.log(`📊 Scraped ${result.multiPageResults.length} pages in total`);
        } else {
          // Single page result
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
          console.log(`\n💾 Results saved to:`);
          console.log(outputFile);
          console.log(`=====================================`);
        }
        
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