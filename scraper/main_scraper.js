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
const { analyzeSite } = require('./utils/analyzer');
const { formatAnalysisResult } = require('./utils/analyzerFormatter');
const { applyProfile, listProfiles } = require('./utils/profiles');
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
  let options = {
    ...DEFAULT_OPTIONS
  };

  let url = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const value = args[i + 1];
      const normalized = arg.toLowerCase(); // Normalize to lowercase for case-insensitivity
      
      // Only keep the core parameters as specified
      if (normalized === '--output') {
        options.output = value;
        i++;
      }
      else if (normalized === '--image-output' || normalized === '--imageoutput') {
        options.imageOutput = value;
        options.imageOutputDir = value; // For backward compatibility
        i++;
      }
      else if (normalized === '--pages') {
        const pageCount = parseInt(value, 10);
        options.pages = pageCount;
        if (pageCount > 1) {
          options.followLinks = true; // Enable link following if pages > 1
        }
        i++;
      }
      else if (normalized === '--images') {
        // Always download images if images parameter is specified
        options.images = true;
        // Legacy properties needed for backward compatibility
        options.scrapeImages = true;
        options.downloadImages = true;
      }
      else if (normalized === '--help') {
        showHelp();
        process.exit(0);
      }
    } else if (!url) {
      url = arg;
    }
  }

  // If profile is specified, apply it
  if (options.profile) {
    const originalOptions = { ...options };
    options = applyProfile(originalOptions, options.profile);
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
  ${chalk.yellowBright('--pages <number>')}          Number of links to follow from initial URL (default: 1)
  ${chalk.yellowBright('--images')}                  Download images from the page
  ${chalk.yellowBright('--output <path>')}           Custom output path for results (default: ~/prysm/output)
  ${chalk.yellowBright('--image-output <path>')}     Custom output path for images (default: ~/prysm/output/images)
  ${chalk.yellowBright('--help')}                    Show this help message

${chalk.whiteBright('Examples:')}
  ${chalk.greenBright('npm run start:cli')} ${chalk.yellowBright('"https://example.com"')}
  ${chalk.greenBright('npm run start:cli')} ${chalk.yellowBright('"https://example.com"')} ${chalk.blueBright('--pages 5')}
  ${chalk.greenBright('npm run start:cli')} ${chalk.yellowBright('"https://example.com"')} ${chalk.blueBright('--images')}
  ${chalk.greenBright('npm run start:cli')} ${chalk.yellowBright('"https://example.com"')} ${chalk.blueBright('--output "/custom/path"')}
  ${chalk.greenBright('npm run start:cli')} ${chalk.yellowBright('"https://example.com"')} ${chalk.blueBright('--image-output "/custom/images"')}
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
    await sleep(2000);
    
    // Use a comprehensive selector if none is specified
    const selector = options.linkSelector || 'a';
    
    console.log(`  🔍 Using selector "${selector}" to find links`);
    
    // Extract all links matching the selector
    const links = await page.evaluate((selector) => {
      const linkElements = Array.from(document.querySelectorAll(selector));
      return linkElements
        .map(link => link.href)
        .filter(href => href && href.startsWith('http'));
    }, selector);
    
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
  // If analyze-only mode is used, just do a single page analysis
  if (options.analyzeOnly) {
    return await singlePageScrape(url, options);
  }
  
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
async function singlePageScrape(url, options = {}, suppressMessages = false) {
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

  // Create output directories
  await fs.mkdir(options.output, { recursive: true });
  
  // Use imageOutput (new parameter) as the primary source, falling back to imageOutputDir for compatibility
  const imageOutputDir = options.imageOutput || options.imageOutputDir;
  await fs.mkdir(imageOutputDir, { recursive: true });

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
    
    // Show only this output
    console.log(generateBanner());
    console.log(`\n🚀 Starting Prysm scraper for ${chalk.cyanBright(url)}`);
    // Show different message based on mode
    if (options.analyzeOnly) {
      console.log(`\n🔍 Analyzing site structure (this will take a moment)...`);
    } else {
      // Show site analysis message if not in analyze-only mode
      if (!options.skipAnalysis) {
        console.log(`\n🔍 Analyzing site structure`);
        // Always show the "Found optimal extraction method" message
        console.log(`\n🔍 Found optimal extraction method`);
      }
      
      console.log(`\n⏳ Extracting content (this may take several minutes to complete)...`);
    }
    
    // Create the colorful progress indicator
    progressInterval = setInterval(() => {
      process.stdout.write(dotColors[dotColorIndex](`.`));
      dotColorIndex = (dotColorIndex + 1) % dotColors.length;
    }, 1000);

    // Run Smart Scan if not disabled
    let analysisResult = null;
    let extractorOptions = {};
    
    if (!options.skipAnalysis && !options.analyzeOnly) {
      try {
        analysisResult = await analyzeSite(page, {
          detailed: options.detailed || false,
          includeScreenshot: options.includeScreenshot || false,
          timeout: 5000
        });
        
        // Apply recommended strategy if available
        if (analysisResult.recommendedStrategy) {
          const strategy = analysisResult.recommendedStrategy;
          
          // Apply strategy to extractor options
          extractorOptions = {
            priorityExtractors: strategy.extractorPriority || [],
            skipExtractors: strategy.skipExtractors || []
          };
          
          // Apply strategy to pagination
          if (strategy.paginationStrategy) {
            options.paginationStrategy = strategy.paginationStrategy;
            options.clickSelector = strategy.clickSelector;
          }
          
          // Apply scroll settings
          if (strategy.maxScrolls) {
            options.maxScrolls = strategy.maxScrolls;
          }
          
          if (strategy.scrollDelay) {
            options.scrollDelay = strategy.scrollDelay;
          }
        }
      } catch (error) {
        // Silent error handling - fall back to default scraping
      }
    }
    
    // If analyze-only mode is enabled, just return the analysis
    if (options.analyzeOnly) {
      clearInterval(progressInterval);
      process.stdout.write('\n\n');
      
      // If no analysis result, create a basic one
      if (!analysisResult) {
        try {
          // Create a simple analysis with basic page info
          analysisResult = await page.evaluate(() => {
            return {
              pageStructure: {
                elements: {
                  hasArticleElement: !!document.querySelector('article'),
                  hasMainElement: !!document.querySelector('main')
                },
                counts: {
                  h1: document.querySelectorAll('h1').length,
                  links: document.querySelectorAll('a').length
                }
              },
              url: window.location.href,
              title: document.title,
              contentType: 'generic',
              timestamp: new Date().toISOString()
            };
          });
        } catch (error) {
          console.log(`\n⚠️ Could not analyze site structure.`);
          return null;
        }
      }
      
      // Save analysis to file
      if (options.output) {
        const safeHostname = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const outputFile = path.join(options.output, `${safeHostname}_analysis_${timestamp}.json`);
        
        await fs.mkdir(options.output, { recursive: true });
        await fs.writeFile(outputFile, JSON.stringify(analysisResult, null, 2));
        
        console.log(`\n✨ Scraping completed successfully!\n`);
        console.log(`💾 Analysis saved to:\n${outputFile}`);
      }
      
      return analysisResult;
    }

    // Initialize MainExtractor with options
    const extractor = new MainExtractor(page, {
      ...options,
      // Make sure images option is reflected in the legacy scrapeImages and downloadImages properties
      scrapeImages: options.images || options.scrapeImages,
      downloadImages: options.images || options.downloadImages
    });

    // Apply smart scan options to extractor
    if (analysisResult && analysisResult.contentType) {
      // Map content type to original extractors
      const extractorOptions = mapContentTypeToExtractors(analysisResult.contentType);
      extractor.priorityExtractors = extractorOptions.priorityExtractors || [];
      extractor.skipExtractors = extractorOptions.skipExtractors || [];
      
      // Apply pagination strategy if detected
      if (analysisResult.recommendedStrategy?.paginationStrategy) {
        options.paginationStrategy = analysisResult.recommendedStrategy.paginationStrategy;
        
        // Apply scroll adjustments based on content type
        if (analysisResult.recommendedStrategy.maxScrolls) {
          options.maxScrolls = analysisResult.recommendedStrategy.maxScrolls;
        }
        
        if (analysisResult.recommendedStrategy.scrollDelay) {
          options.scrollDelay = analysisResult.recommendedStrategy.scrollDelay;
        }
      }
    }
    
    if (!handlePagination) {
      extractor.handlePagination = async () => false;
    }
    
    // First extraction before pagination
    await extractor.extract();

    // We need to use extractor.data instead of result at this point
    // Analyze content to determine site type and optimize pagination
    let siteType = 'standard';
    let skipPagination = false;
    let reduceScrolls = false;

    // Detect minimal sites (like example.com) - these need almost no pagination
    if (url.includes('example.com') || 
       (extractor.data.content && extractor.data.content.length < 5 && 
        extractor.data.content.join('').length < 1000)) {
      siteType = 'minimal';
      skipPagination = true;
    }
    // Detect short content sites - might need less aggressive pagination
    else if (extractor.data.content && 
             extractor.data.content.length < 20 && 
             extractor.data.content.join('').length < 10000) {
      siteType = 'short';
      reduceScrolls = true;
      options.maxScrolls = Math.min(options.maxScrolls, 30); // Cap scrolls at 30
    }
    // For very large sites, focus pagination on most promising method
    else if (extractor.data.content && 
             extractor.data.content.length > 100 && 
             extractor.data.content.join('').length > 100000) {
      siteType = 'large';
      // Skip brute force approach, focus on detected strategy
    }

    // Apply pagination based on site type and strategy from analysis
    if (skipPagination) {
      // Skip all pagination for minimal sites
    } else if (options.paginationStrategy === 'url') {
      await extractor.handleUrlPagination('page/{num}', options.pages || 15);
    } else if (options.paginationStrategy === 'click' && options.clickSelector) {
      await extractor.handleClickPagination(options.clickSelector, options.maxScrolls);
    } else if (options.paginationStrategy === 'infinite' || !options.paginationStrategy) {
      await extractor.handleInfiniteScroll(options.maxScrolls);
    } else if (!reduceScrolls) {
      // Apply all strategies in brute force mode if no specific strategy
      // But only for standard sites, not short or large content sites
      await extractor.handleUrlPagination('page/{num}', options.pages || 15);
      await extractor.handleInfiniteScroll(options.maxScrolls);
      
      // For standard sites, try more pagination selectors
      // For large/short sites, use a more focused approach
      const paginationSelectors = siteType === 'large' ? 
        // Focused selectors for large sites
        ['.pagination a', 'a.next', '.load-more', '.more', '.pagination__next'] : 
        // Full selector list for standard sites
        ['.pagination a', '.pager a', '.page-numbers', 
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
      
      // For short content sites, try fewer attempts per selector
      const clickAttempts = siteType === 'short' ? 
        Math.min(5, options.maxScrolls) : options.maxScrolls;
        
      for (const selector of paginationSelectors) {
        await extractor.handleClickPagination(selector, clickAttempts);
      }
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
    if ((options.images || options.scrapeImages) && result.images && result.images.length > 0) {
      // Download images if the option is enabled (images option always downloads)
      if (options.images || options.downloadImages) {
        const imageDir = imageOutputDir;
        
        console.log(`\n${chalk.magentaBright('📥')} Downloading images to ${chalk.cyanBright(imageDir)}`);
        
        // Create image directory if it doesn't exist
        await fs.mkdir(imageDir, { recursive: true });
        
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
        
        console.log(`\n${chalk.greenBright('✅')} Downloaded ${chalk.yellowBright(downloadedCount)} images (${chalk.redBright(failedCount)} failed)`);
      }
    }

    // Save results to file
    const safeHostname = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
    const safePath = new URL(url).pathname.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const outputFile = path.join(options.output, `${safeHostname}${safePath}_${timestamp}.json`);
    
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

    if (!suppressMessages) {
      console.log(`\n${chalk.greenBright('✨')} Scraping completed successfully!`);
      console.log(`\n${chalk.blueBright('💾')} Results saved to:\n${chalk.cyanBright(outputFile)}`);
    } else {
      // For multi-page scraping, just show a simple message without the success banner
      console.log(`✅ Results saved to: ${outputFile}`);
    }
    
    return result;

  } catch (error) {
    // Clear the progress indicator if there's an error
    if (progressInterval) clearInterval(progressInterval);
    console.error(`Error during scraping: ${error.message}`);
    console.error(`\n${chalk.redBright('❌')} Error: ${error.message}`);
    process.exit(1);
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
    pages: 5,                // Override default for multipage
    followLinks: true,       // Override default for multipage
    ...options               // User provided options take precedence
  };

  // Create output directories
  await fs.mkdir(options.output, { recursive: true });
  
  // Use imageOutput (new parameter) as the primary source, falling back to imageOutputDir for compatibility
  const imageOutputDir = options.imageOutput || options.imageOutputDir;
  await fs.mkdir(imageOutputDir, { recursive: true });
  
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
      // Scrape the current URL using single page scraper with suppressed messages
      const result = await singlePageScrape(currentUrl, options, true);
      
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
      
      // This message will come from singlePageScrape now
      // console.log(`✅ Saved results to: ${outputFile}`);
      
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
  
  console.log(`\n${chalk.greenBright('✨')} Scraping completed successfully!`);
  console.log(`\n${chalk.blueBright('📊')} Summary saved to:\n${chalk.cyanBright(summaryFile)}`);
  
  // Return both multi-page results and the main page result
  return {
    multiPageResults: results,
    mainPage: mainPageResult || (results.length > 0 ? results[0].result : null)
  };
}

// Map our analyzer content types to the original extractor methods
const mapContentTypeToExtractors = (contentType) => {
  switch (contentType) {
    case 'article':
      return {
        priorityExtractors: ['article', 'semantic', 'mainContent', 'headerContentFooter'],
        skipExtractors: ['product', 'multiColumn', 'singleColumn', 'largestContent']
      };
    case 'product':
      return {
        priorityExtractors: ['product', 'structured', 'largestContent'],
        skipExtractors: ['article', 'semantic', 'contentSections']
      };
    case 'listing':
      return {
        priorityExtractors: ['multiColumn', 'listing', 'contentSections'],
        skipExtractors: ['article', 'semantic']
      };
    case 'documentation':
      return {
        priorityExtractors: ['documentation', 'semantic', 'mainContent'],
        skipExtractors: ['product', 'listing', 'multiColumn']
      };
    case 'recipe':
      return {
        priorityExtractors: ['recipes', 'structured', 'semantic'],
        skipExtractors: ['listing', 'multiColumn', 'contentSections']
      };
    default:
      return {
        priorityExtractors: [],
        skipExtractors: []
      };
  }
};

module.exports = {
  scrape: mainScraper,
  scrapeMultiple: multiPageScrape,
  extractImages,
  downloadImage,
  
  // Main CLI entry point
  main: function(passedArgs) {
    // Use passed args or process.argv
    const args = passedArgs || process.argv.slice(2);
    
    // Parse the arguments
    const { url, options } = parseArguments(args);
    
    if (!url) {
      console.error('Please provide a URL to scrape');
      process.exit(1);
      return;
    }
    
    // Run the scraper
    mainScraper(url, options)
      .catch(error => {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      });
  }
};

// Auto-execute when run directly (not imported)
if (require.main === module) {
  module.exports.main();
} 