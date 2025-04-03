// main_scraper.js - Structure-focused web scraper that prioritizes content extraction
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { setupResourceBlocker } = require('./utils/resourceBlocker');
const { 
  InfiniteScrollStrategy, 
  ClickPaginationStrategy, 
  URLPaginationStrategy,
  URLParameterPaginationStrategy 
} = require('./utils/paginationStrategies');
const { MainExtractor } = require('./utils/mainExtractor');
const { sleep, waitForSelector } = require('./utils/helpers');
const cloudflareBypass = require('./utils/cloudflareBypass');
const { extractImages, downloadImage } = require('./utils/imageExtractor');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');
const chalk = require('chalk');
const packageJson = require('./package.json');
const { DEFAULT_OPTIONS } = require('./utils/defaultOptions');

// Initialize stealth mode
puppeteer.use(StealthPlugin());

/**
 * Generate a colorful ASCII banner
 */
function generateBanner() {
  const colors = [
    chalk.magentaBright,
    chalk.magenta,
    chalk.blueBright,
    chalk.blue,
    chalk.cyanBright,
    chalk.cyan,
  ];
  
  const banner = `
   ██████╗ ██████╗ ██╗   ██╗███████╗███╗   ███╗
   ██╔══██╗██╔══██╗╚██╗ ██╔╝██╔════╝████╗ ████║
   ██████╔╝██████╔╝ ╚████╔╝ ███████╗██╔████╔██║
   ██╔═══╝ ██╔══██╗  ╚██╔╝  ╚════██║██║╚██╔╝██║
   ██║     ██║  ██║   ██║   ███████║██║ ╚═╝ ██║
   ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝     ╚═╝
  `;
  
  // Split banner into lines and apply different colors
  const lines = banner.split('\n');
  let colorfulBanner = '';
  
  for (let i = 0; i < lines.length; i++) {
    colorfulBanner += colors[i % colors.length](lines[i]) + '\n';
  }
  
  // Add package info
  colorfulBanner += '\n';
  colorfulBanner += chalk.cyanBright('  ✨ ') + chalk.greenBright(`${packageJson.name}`) + chalk.whiteBright(' v') + chalk.yellowBright(`${packageJson.version}`) + '\n';
  
  return colorfulBanner;
}

/**
 * Parse command line arguments
 */
function parseArguments(args) {
  // Start with default options
  const options = {
    ...DEFAULT_OPTIONS,
    output: path.join(__dirname, 'results') // Set dynamic defaults
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
        case '--allDomains':
          options.sameDomainOnly = false;
          break;
        case '--scrapeImages':
          options.scrapeImages = true;
          break;
        case '--noScrapeImages':
          options.scrapeImages = false;
          options.downloadImages = false; // Can't download if not scraping
          break;
        case '--downloadImages':
          options.downloadImages = true;
          options.scrapeImages = true; // Must scrape to download
          break;
        case '--maxImages':
          options.maxImages = parseInt(value, 10);
          i++;
          break;
        case '--minImageSize':
          options.minImageSize = parseInt(value, 10);
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
  console.log(generateBanner());
  console.log(`
${chalk.cyanBright('🔍')} ${chalk.bold('Prysm - Structure-Aware Web Scraper')}

${chalk.whiteBright('Usage:')} ${chalk.greenBright('npm run start:cli')} ${chalk.yellowBright('[url]')} ${chalk.blueBright('[options]')}

${chalk.whiteBright('Options:')}
  ${chalk.yellowBright('--pages <number>')}        Maximum number of pages to scrape (default: 1)
  ${chalk.yellowBright('--followLinks')}           Enable link following (required for multi-page scraping)
  ${chalk.yellowBright('--noFollowLinks')}         Disable link following
  ${chalk.yellowBright('--allDomains')}            Follow links to any domain (default: same domain only)
  ${chalk.yellowBright('--maxScrolls <number>')}   Maximum scroll attempts (default: 100)
  ${chalk.yellowBright('--scrollDelay <ms>')}      Delay between scrolls in ms (default: 1000)
  ${chalk.yellowBright('--headless')}              Run in headless mode (default: true)
  ${chalk.yellowBright('--noHeadless')}            Run with browser visible
  ${chalk.yellowBright('--output <path>')}         Custom output path for results
  ${chalk.yellowBright('--scrapeImages')}          Enable image scraping (default: false)
  ${chalk.yellowBright('--noScrapeImages')}        Disable image scraping
  ${chalk.yellowBright('--downloadImages')}        Download images locally (enables scrapeImages)
  ${chalk.yellowBright('--maxImages <number>')}    Maximum images to extract per page (default: 100)
  ${chalk.yellowBright('--minImageSize <pixels>')} Minimum width/height for images (default: 100)
  ${chalk.yellowBright('--help')}                  Show this help message

${chalk.whiteBright('Examples:')}
  ${chalk.greenBright('npm run start:cli')} ${chalk.yellowBright('"https://example.com"')}
  ${chalk.greenBright('npm run start:cli')} ${chalk.yellowBright('"https://example.com"')} ${chalk.blueBright('--pages 5')}
  ${chalk.greenBright('npm run start:cli')} ${chalk.yellowBright('"https://example.com"')} ${chalk.blueBright('--maxScrolls 50 --noHeadless')}
  ${chalk.greenBright('npm run start:cli')} ${chalk.yellowBright('"https://example.com"')} ${chalk.blueBright('--scrapeImages --downloadImages')}
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
  const startTime = Date.now();
  
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
  let dotColorIndex = 0;
  const dotColors = [
    chalk.magentaBright,
    chalk.blueBright,
    chalk.greenBright,
    chalk.cyanBright,
    chalk.yellowBright
  ];
  
  try {
    // Browser launch and setup
    const browserOptions = cloudflareBypass.getBrowserLaunchArgs();
    browserOptions.headless = headless;
    
    if (proxy) {
      browserOptions.args.push(`--proxy-server=${proxy}`);
    }

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
      await setupResourceBlocker(page, {
        scrapeImages: options.scrapeImages
      });
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
    
    // First extraction before pagination
    await extractor.extract();
    
    // ------------------------------------
    // APPLY ALL PAGINATION STRATEGIES IN BRUTE FORCE MODE
    // Silent execution with only minimal output
    // ------------------------------------
    
    // Show only the output as per user's request - clean console
    console.log(generateBanner());
    console.log(`\n🚀 Starting Prysm scraper for ${url}`);
    console.log(`\n⏳ Extracting content (this may take several minutes to complete)...`);
    
    // Create the colorful progress indicator
    const dotColors = [
      chalk.magentaBright,
      chalk.blueBright,
      chalk.greenBright,
      chalk.cyanBright,
      chalk.yellowBright
    ];
    let dotColorIndex = 0;
    
    // Start the progress dots
    progressInterval = setInterval(() => {
      process.stdout.write(dotColors[dotColorIndex](`.`));
      dotColorIndex = (dotColorIndex + 1) % dotColors.length;
    }, 1000);
    
    // Apply all strategies silently without logging each one
    await extractor.handleUrlPagination('page/{num}', options.pages || 15);
    await extractor.handleInfiniteScroll(maxScrolls);
    
    // Try each click pagination selector without logging
    const paginationSelectors = [
      '.pagination a', '.pager a', '.page-numbers', 
      '[aria-label*="page"]', '[aria-label*="Page"]', '.pages a',
      'a.next', 'button.next', '[rel="next"]', '.load-more',
      '.more', '.next', '.view-more', '.show-more', 
      '.load-more-button', '.load-more-link', '.pagination__next',
      '.pagination-next', '.pagination__item--next', '.pagination-item-next',
      '[data-page-next]', '[data-testid="pagination-next"]', 
      '.react-paginate .next', '.rc-pagination-next',
      '.paging-next', '.nextPage', '.next-page',
      'li.next a', 'span.next a', 'button[rel="next"]',
      'a[rel="next"]', 'a.nextLink', 'a.nextpage',
      '[data-pagination="next"]', '[data-test="pagination-next"]',
      '.Pagination-module--next', '[data-component="next"]',
      'button:contains("Next")', 'a:contains("Next")', 
      'button:contains("More")', 'a:contains("More")',
      'button:contains("Load")', 'a:contains("Load")',
      'button:contains("Show")', 'a:contains("Show")'
    ];
    
    for (const selector of paginationSelectors) {
      await extractor.handleClickPagination(selector, maxScrolls);
    }
    
    // Extract content again after all pagination attempts
    await extractor.extract();

    // Clear the progress indicator
    clearInterval(progressInterval);
    process.stdout.write('\n\n');
    
    const result = {
      title: extractor.data.title,
      content: extractor.data.content,
      images: extractor.data.images,
      url: extractor.data.url
    };

    // Process images if scraping is enabled
    if (options.scrapeImages && result.images && result.images.length > 0) {
      console.log(`📸 Found ${result.images.length} images`);
      
      // Download images if the option is enabled
      if (options.downloadImages) {
        const safeHostname = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const imageDir = path.join(options.output, `${safeHostname}_images_${timestamp}`);
        
        console.log(`📥 Downloading images to ${imageDir}`);
        
        // Download images in parallel with a concurrency limit
        const concurrencyLimit = 5;
        const chunks = [];
        
        // Split images into chunks for parallel download
        // Use unique images to avoid downloading duplicates
        const uniqueImages = result.images.filter((img, index) => {
          return result.images.findIndex(i => i.url === img.url) === index;
        });
        
        for (let i = 0; i < uniqueImages.length; i += concurrencyLimit) {
          chunks.push(uniqueImages.slice(i, i + concurrencyLimit));
        }
        
        let downloadedCount = 0;
        let failedCount = 0;
        
        // Process chunks sequentially to control concurrency
        for (const chunk of chunks) {
          // Process each chunk in parallel
          const downloadPromises = chunk.map(async (image, index) => {
            try {
              const imagePath = await downloadImage(image.url, imageDir);
              if (imagePath) {
                // Add local path to the image object
                image.localPath = imagePath.replace(options.output, '').replace(/^\//, '');
                downloadedCount++;
                process.stdout.write('.');
              } else {
                failedCount++;
                process.stdout.write('x');
              }
            } catch (error) {
              failedCount++;
              process.stdout.write('x');
            }
          });
          
          // Wait for all downloads in this chunk to complete
          await Promise.all(downloadPromises);
        }
        
        console.log(`\n✅ Downloaded ${downloadedCount} images (${failedCount} failed)`);
      }
    }

    // Save results to file
    const safeHostname = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const outputFile = path.join(options.output, `${safeHostname}_${timestamp}.json`);
    
    // Create the output directory if it doesn't exist
    await fs.mkdir(options.output, { recursive: true });
    
    await fs.writeFile(outputFile, JSON.stringify({
      url,
      title: result.title,
      timestamp: new Date().toISOString(),
      content: result.content,
      images: result.images || [], // Include images in the output
      stats: {
        contentItems: result.content.length,
        imageCount: result.images ? result.images.length : 0, // Add image count
        extractionTime: Math.round((Date.now() - startTime) / 1000)
      }
    }, null, 2));

    // Display results summary like in the original format
    console.log(`\n✨ Scraping completed successfully!\n`);
    console.log(`📊 Results Summary:`);
    console.log(`=====================================`);
    console.log(`📄 Title: ${result.title}`);
    console.log(`📝 Content Items: ${result.content.length}`);
    console.log(`📸 Images: ${result.images ? result.images.length : 0}`);
    console.log(`\n💾 Results saved to:\n${outputFile}`);
    
    return result;

  } catch (error) {
    // Clear the progress indicator if there's an error
    if (progressInterval) clearInterval(progressInterval);
    console.error(`Error during scraping: ${error.message}`);
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
  // Merge with default options 
  options = {
    ...DEFAULT_OPTIONS,
    output: path.join(__dirname, 'results'),
    pages: 5,                // Override default for multipage
    followLinks: true,       // Override default for multipage
    ...options               // User provided options take precedence
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
function setupInfiniteScroll(page, options) {
  const { maxScrolls, scrollDelay, scrollContainerSelector } = options;
  
  return new InfiniteScrollStrategy(page, {
    maxAttempts: maxScrolls,
    delay: scrollDelay,
    scrollContainerSelector
  });
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

/**
 * Attempts to paginate through the site
 */
async function attemptPagination(page, url, options) {
  if (!options.handlePagination) {
    return 1; // Pagination not requested
  }
  
  try {
    // If no pagination strategy is specified, try to auto-detect
    let strategy = options.paginationStrategy;
    
    // First check if URLParameterPaginationStrategy is applicable
    if (!strategy && await URLParameterPaginationStrategy.isApplicable(page, url)) {
      console.log('🔍 Auto-detected URL parameter pagination strategy');
      strategy = 'parameter';
    }
    
    // Create pagination strategy instance based on detected or specified strategy
    let paginationStrategy;
    let maxPages = options.pages || 1;
    
    if (strategy === 'infinite') {
      console.log('📃 Using infinite scroll pagination strategy');
      paginationStrategy = new InfiniteScrollStrategy(page, {
        maxAttempts: options.maxScrolls,
        delay: options.scrollDelay || DEFAULT_OPTIONS.scrollDelay
      });
    } else if (strategy === 'click') {
      console.log('🖱️ Using click pagination strategy');
      paginationStrategy = new ClickPaginationStrategy(page, {
        maxAttempts: options.maxScrolls,
        delay: options.scrollDelay || DEFAULT_OPTIONS.scrollDelay,
        buttonSelector: options.paginationSelector || 'button.load-more, .pagination a, a.next, button.show-more, .more-link'
      });
    } else if (strategy === 'url') {
      console.log('🔗 Using URL pagination strategy');
      paginationStrategy = new URLPaginationStrategy(page, {
        maxAttempts: options.maxScrolls,
        delay: options.scrollDelay || DEFAULT_OPTIONS.scrollDelay,
        baseUrl: url,
        urlPattern: options.urlPattern || '/page/{num}'
      });
    } else if (strategy === 'parameter') {
      console.log('🔄 Using URL parameter pagination strategy');
      
      // Create and initialize the URL parameter pagination strategy
      const paramStrategy = new URLParameterPaginationStrategy(page, {
        maxScrollsPerPage: options.maxScrolls,
        scrollDelay: options.scrollDelay || DEFAULT_OPTIONS.scrollDelay,
        maxPages: maxPages,
        pageParameter: options.pageParameter || 'page',
        waitForSelector: options.contentSelector || 'article, .post, .entry, .item, .product',
        contentVerificationSelector: options.contentSelector || 'article, .post, .entry, .item, .product, img'
      });
      
      await paramStrategy.initialize(url);
      
      // Paginate through all pages
      let pagesProcessed = 1;
      let hasMorePages = true;
      
      // Process the first page (already loaded)
      console.log('📄 Processing page 1...');
      
      // Scroll the first page to ensure all content is loaded
      await paramStrategy.scrollCurrentPage();
      
      // Process subsequent pages
      while (pagesProcessed < maxPages && hasMorePages) {
        hasMorePages = await paramStrategy.next();
        if (hasMorePages) {
          pagesProcessed++;
          console.log(`📄 Processing page ${pagesProcessed}...`);
        }
      }
      
      return pagesProcessed;
    } else {
      // Default: basic infinite scroll
      console.log('📜 Using default scroll strategy (no pagination)');
      paginationStrategy = new InfiniteScrollStrategy(page, {
        maxAttempts: options.maxScrolls,
        delay: options.scrollDelay || DEFAULT_OPTIONS.scrollDelay
      });
    }
    
    // Only process standard strategies if not using parameter strategy
    if (strategy !== 'parameter') {
      await paginationStrategy.paginate();
    }
    
    return maxPages;
  } catch (error) {
    console.error(`⚠️ Error during pagination: ${error.message}`);
    return 1;
  }
}

/**
 * Apply URL parameter pagination strategy
 */
async function applyURLParameterPagination(page, url, maxScrolls, scrollDelay, maxPages) {
  try {
    // Initialize the parameter pagination strategy
    const paramStrategy = new URLParameterPaginationStrategy(page, {
      maxScrollsPerPage: maxScrolls,        // Use the passed maxScrolls value
      scrollDelay: scrollDelay,             // Use the passed scrollDelay value
      maxPages: maxPages,                   // Use the passed maxPages value
      contentVerificationSelector: 'article, .post, [class*="post"], [class*="content"], [class*="feed"], [class*="item"], img, div'
    });
    
    // Try to initialize with the URL
    if (await paramStrategy.initialize(url)) {
      let paginationCount = 0;
      
      // Process the first page (already loaded)
      await paramStrategy.scrollCurrentPage();
      
      // Process subsequent pages
      while (paginationCount < maxPages - 1) { // -1 because we already processed first page
        const hasNext = await paramStrategy.next();
        if (!hasNext) break;
        
        paginationCount++;
      }
      
      return paginationCount > 0;
    }
    
    return false;
  } catch (error) {
    return false;
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
    console.error(`${chalk.redBright('❌')} ${chalk.whiteBright('Error: URL is required')}`);
    showHelp();
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  fs.mkdir(options.output, { recursive: true })
    .then(async () => {
      if (options.pages > 1) {
        console.log(`${chalk.blueBright('📑')} ${chalk.whiteBright(`Multi-page mode: Will scrape up to ${options.pages} pages`)}`);
      }
      
      try {
        const result = await mainScraper(url, options);
        
        // If it's a multi-page result, the format is different
        if (result.multiPageResults) {
          // Main page result is already saved by the multi-page scraper
          console.log(`\n${chalk.greenBright('✨')} ${chalk.whiteBright('Multi-page scraping completed successfully!')}`);
          console.log(`${chalk.blueBright('📊')} ${chalk.whiteBright(`Scraped ${result.multiPageResults.length} pages in total`)}`);
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
          
          console.log(`\n${chalk.greenBright('✨')} ${chalk.whiteBright('Scraping completed successfully!')}`);
        }
        
      } catch (error) {
        console.error(`\n${chalk.redBright('❌')} Error: ${error.message}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`\n${chalk.redBright('❌')} Error creating output directory: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  scrape: mainScraper,
  scrapeMultiple: multiPageScrape,
  extractImages,
  downloadImage
}; 