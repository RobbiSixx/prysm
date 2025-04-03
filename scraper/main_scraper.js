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
    sameDomainOnly: true, // Only follow links on the same domain
    scrapeImages: false, // Whether to scrape images
    downloadImages: false, // Whether to download images
    maxImages: 100, // Maximum number of images to extract per page
    minImageSize: 100, // Minimum size for images in pixels
    imageOutputDir: null // Will be set dynamically based on output path
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
          if (['infinite', 'click', 'url', 'parameter'].includes(value)) {
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
  ${chalk.yellowBright('--linkSelector <selector>')} CSS selector for links to follow (default: 'a')
  ${chalk.yellowBright('--allDomains')}            Follow links to any domain (default: same domain only)
  ${chalk.yellowBright('--maxScrolls <number>')}   Maximum scroll attempts (default: 100)
  ${chalk.yellowBright('--scrollDelay <ms>')}      Delay between scrolls in ms (default: 1000)
  ${chalk.yellowBright('--bypassCloudflare')}      Enable Cloudflare bypass (default: true)
  ${chalk.yellowBright('--noBypassCloudflare')}    Disable Cloudflare bypass
  ${chalk.yellowBright('--handlePagination')}      Enable auto pagination (default: true)
  ${chalk.yellowBright('--noHandlePagination')}    Disable auto pagination
  ${chalk.yellowBright('--paginationStrategy')}    Force pagination strategy (infinite/click/url/parameter)
                          'parameter' is for sites using URL-based pagination like ?page=X
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
  ${chalk.greenBright('npm run start:cli')} ${chalk.yellowBright('"https://example.com/users/profile"')} ${chalk.blueBright('--paginationStrategy parameter')}
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
    // Display the banner at the start
    console.log(generateBanner());
    
    // Browser launch and setup
    const browserOptions = cloudflareBypass.getBrowserLaunchArgs();
    browserOptions.headless = headless;
    
    if (proxy) {
      browserOptions.args.push(`--proxy-server=${proxy}`);
    }

    console.log(`${chalk.magentaBright('🚀')} ${chalk.whiteBright('Starting Prysm scraper for')} ${chalk.cyanBright(url)}`);
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
    
    console.log(`\n${chalk.yellowBright('⏳')} ${chalk.whiteBright('Extracting content (this may take several minutes to complete)...')}`);
    
    // Create a simple progress indicator with cycling colors
    progressInterval = setInterval(() => {
      process.stdout.write(dotColors[dotColorIndex % dotColors.length]('.'));
      dotColorIndex++;
    }, 1000);
    
    // First extraction before pagination
    await extractor.extract();

    // Handle pagination based on strategy if specified
    if (handlePagination) {
      // Create pagination options
      const paginationOptions = {
        maxScrolls: maxScrolls,
        scrollDelay: scrollDelay,
        clickSelector: clickSelector,
        waitForSelector: waitForSelector
      };
      
      // Try URL parameter pagination first (for sites using page parameters)
      let paginationSuccess = false;
      
      if (!paginationSuccess && (!paginationStrategy || paginationStrategy === 'parameter')) {
        const isApplicable = await URLParameterPaginationStrategy.isApplicable(page, url);
        if (isApplicable) {
          const paramStrategy = new URLParameterPaginationStrategy(page, {
            maxScrollsPerPage: maxScrolls,
            scrollDelay: scrollDelay,
            maxPages: options.pages || 15,
            contentVerificationSelector: 'article, .post, [class*="post"], [class*="content"], [class*="feed"]'
          });
          
          if (await paramStrategy.initialize(url)) {
            let paginationCount = 0;
            while (paginationCount < (options.pages || 15)) {
              // Move to next page
              const hasNext = await paramStrategy.next();
              if (!hasNext) break;
              
              // Extract content on current page
              await extractor.extract();
              paginationCount++;
            }
            paginationSuccess = paginationCount > 0;
          }
        }
      }
      
      // If parameter pagination didn't work, try the standard methods
      if (!paginationSuccess) {
        // Set up and run scroll strategies
        const infiniteScroll = await setupInfiniteScroll(page, paginationOptions);
        await infiniteScroll.paginate();
        
        // Extract content again after all scroll strategies
        await extractor.extract();
      }
    }

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
      console.log(`${chalk.magentaBright('📸')} ${chalk.whiteBright(`Found ${result.images.length} images`)}`);
      
      // Download images if the option is enabled
      if (options.downloadImages) {
        const safeHostname = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const imageDir = path.join(options.output, `${safeHostname}_images_${timestamp}`);
        
        console.log(`${chalk.blueBright('📥')} ${chalk.whiteBright(`Downloading images to ${imageDir}`)}`);
        
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
        dotColorIndex = 0;
        
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
                process.stdout.write(dotColors[dotColorIndex % dotColors.length]('.'));
                dotColorIndex++;
              } else {
                failedCount++;
                process.stdout.write(chalk.red('x'));
              }
            } catch (error) {
              failedCount++;
              process.stdout.write(chalk.red('x'));
            }
          });
          
          // Wait for all downloads in this chunk to complete
          await Promise.all(downloadPromises);
        }
        
        console.log(`\n${chalk.greenBright('✅')} ${chalk.whiteBright(`Downloaded ${downloadedCount} images (${failedCount} failed)`)}`);
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

    console.log(`\n${chalk.blueBright('📊')} ${chalk.whiteBright('Results Summary:')}`);
    console.log(`${chalk.cyanBright('=====================================')}`);
    console.log(`${chalk.magentaBright('📄')} ${chalk.whiteBright(`Title: ${result.title}`)}`);
    console.log(`${chalk.magentaBright('📝')} ${chalk.whiteBright(`Content Items: ${result.content.length}`)}`);
    console.log(`${chalk.magentaBright('📸')} ${chalk.whiteBright(`Images: ${result.images.length}`)}`);
    
    console.log(`\n${chalk.yellowBright('💾')} ${chalk.whiteBright('Results saved to:')}`);
    console.log(chalk.greenBright(outputFile));
    console.log(`${chalk.cyanBright('=====================================')}`);

    return result;

  } catch (error) {
    // Clear the progress indicator if there's an error
    if (progressInterval) clearInterval(progressInterval);
    console.error(`${chalk.redBright('❌')} ${chalk.whiteBright('Error during scraping:')}`, error);
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
        maxAttempts: maxPages * 10,
        delay: options.scrollDelay || 1000
      });
    } else if (strategy === 'click') {
      console.log('🖱️ Using click pagination strategy');
      paginationStrategy = new ClickPaginationStrategy(page, {
        maxAttempts: maxPages,
        delay: options.scrollDelay || 1000,
        buttonSelector: options.paginationSelector || 'button.load-more, .pagination a, a.next, button.show-more, .more-link'
      });
    } else if (strategy === 'url') {
      console.log('🔗 Using URL pagination strategy');
      paginationStrategy = new URLPaginationStrategy(page, {
        maxAttempts: maxPages,
        delay: options.scrollDelay || 1000,
        baseUrl: url,
        urlPattern: options.urlPattern || '/page/{num}'
      });
    } else if (strategy === 'parameter') {
      console.log('🔄 Using URL parameter pagination strategy');
      
      // Create and initialize the URL parameter pagination strategy
      const paramStrategy = new URLParameterPaginationStrategy(page, {
        maxScrollsPerPage: 30,
        scrollDelay: options.scrollDelay || 2000,
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
        maxAttempts: maxPages * 3,
        delay: options.scrollDelay || 1000
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
        console.error(`\n${chalk.redBright('❌')} ${chalk.whiteBright('Error during scraping:')}`);
        console.error(chalk.redBright('====================================='));
        if (error.message) console.error(chalk.red(error.message));
        if (error.stack) console.error(chalk.red(error.stack));
        console.error(chalk.redBright('====================================='));
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`\n${chalk.redBright('❌')} ${chalk.whiteBright('Error creating output directory:')}`, error);
      process.exit(1);
    });
}

module.exports = {
  scrape: mainScraper,
  scrapeMultiple: multiPageScrape,
  extractImages,
  downloadImage
}; 