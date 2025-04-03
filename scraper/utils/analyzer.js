/**
 * analyzer.js - Smart page analysis for optimized scraping
 * 
 * This module provides functionality to analyze a webpage's structure
 * before scraping to intelligently select the most effective extraction strategies.
 */

// Import any required dependencies
const { sleep, waitForSelector } = require('./helpers');

/**
 * Detects the basic structure of a page
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Object containing structure information
 */
async function detectPageStructure(page) {
  if (!page || !page.evaluate) {
    throw new Error('Invalid page object provided');
  }

  return await page.evaluate(() => {
    // Detect key structural elements
    const hasArticleElement = !!document.querySelector('article');
    const hasMainElement = !!document.querySelector('main');
    const hasSidebar = !!document.querySelector('aside, [class*="sidebar"]');
    const hasMultipleColumns = document.querySelectorAll('.col, [class*="column"]').length > 1;
    
    // Count headings to determine potential content structure
    const h1Count = document.querySelectorAll('h1').length;
    const h2Count = document.querySelectorAll('h2').length;
    const h3Count = document.querySelectorAll('h3').length;
    
    // Calculate text density to identify content areas
    const bodyText = document.body.innerText;
    const textLength = bodyText ? bodyText.length : 0;
    const elementCount = document.querySelectorAll('*').length;
    const textDensity = elementCount > 0 ? textLength / elementCount : 0;
    
    // Detect if page has a form as main content
    const hasForms = document.querySelectorAll('form').length > 0;
    
    // Detect common layouts
    const hasFooter = !!document.querySelector('footer');
    const hasHeader = !!document.querySelector('header');
    const hasNav = !!document.querySelector('nav');
    
    // Detect interactive elements
    const buttonCount = document.querySelectorAll('button').length;
    const linkCount = document.querySelectorAll('a').length;
    
    // Detect lists which could indicate collections
    const listCount = document.querySelectorAll('ul, ol').length;
    
    // Calculate the percentage of the page dedicated to images
    const images = Array.from(document.querySelectorAll('img'));
    const imageArea = images.reduce((sum, img) => {
      const width = img.width || 0;
      const height = img.height || 0;
      return sum + (width * height);
    }, 0);
    
    const viewportArea = window.innerWidth * window.innerHeight;
    const imagePercentage = viewportArea > 0 ? (imageArea / viewportArea) * 100 : 0;
    
    return {
      elements: {
        hasArticleElement,
        hasMainElement,
        hasSidebar,
        hasMultipleColumns,
        hasForms,
        hasFooter,
        hasHeader,
        hasNav
      },
      counts: {
        h1: h1Count,
        h2: h2Count,
        h3: h3Count,
        buttons: buttonCount,
        links: linkCount,
        lists: listCount
      },
      metrics: {
        textLength,
        elementCount,
        textDensity,
        imagePercentage
      }
    };
  });
}

/**
 * Detects the pagination methods available on a page
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Object containing pagination information
 */
async function detectPaginationMethods(page) {
  if (!page || !page.evaluate) {
    throw new Error('Invalid page object provided');
  }

  const url = await page.url();

  return await page.evaluate((currentUrl) => {
    // Check for URL parameter-based pagination
    const urlPatterns = {
      pageParam: /[?&](p|page|pg)=\d+/.test(currentUrl),
      pagePathSegment: /\/page\/\d+/.test(currentUrl),
      numericPathEnd: /\/\d+$/.test(currentUrl),
      offsetParam: /[?&]offset=\d+/.test(currentUrl),
      startParam: /[?&]start=\d+/.test(currentUrl),
      limitParam: /[?&]limit=\d+/.test(currentUrl)
    };
    
    // Check for pagination interface elements
    const paginationElements = {
      // Common pagination containers
      paginationContainer: !!document.querySelector(
        '.pagination, .pager, .pages, nav[aria-label*="pagination"], [class*="paging"], [class*="paginate"]'
      ),
      
      // Numbered page links (more than 1 indicates pagination)
      numberedLinks: document.querySelectorAll(
        'a[href*="page="], a[href*="/page/"], [class*="page-item"], [class*="page-number"]'
      ).length > 1,
      
      // Next/previous links
      nextLink: !!document.querySelector(
        'a[rel="next"], a[aria-label*="Next"], .next, .nextpostslink, a[class*="next"], button[class*="next"]'
      ),
      prevLink: !!document.querySelector(
        'a[rel="prev"], a[aria-label*="Previous"], .prev, .previouspostslink, a[class*="prev"], button[class*="prev"]'
      ),
      
      // Load more buttons/links
      loadMoreButton: !!document.querySelector(
        'button[class*="load-more"], a[class*="load-more"], [class*="show-more"], [class*="view-more"]'
      )
    };
    
    // Check for infinite scroll indicators
    const infiniteScrollIndicators = {
      // Lazy loading attribute on images
      lazyImages: Array.from(document.querySelectorAll('img')).some(img => 
        img.getAttribute('loading') === 'lazy' || 
        img.getAttribute('data-src') ||
        img.getAttribute('data-lazy-src')
      ),
      
      // Scroll event listeners might indicate infinite scroll
      hasObserver: typeof IntersectionObserver !== 'undefined' && 
        document.querySelectorAll('[data-src], [data-lazy], [data-lazy-src]').length > 0,
      
      // Loading indicators at bottom of page
      loadingElement: !!document.querySelector(
        '[class*="loading"], [class*="spinner"], [class*="loader"], [aria-busy="true"]'
      )
    };
    
    // Look for pagination-related text in buttons/links
    const paginationTexts = [
      'next', 'previous', 'older', 'newer', 'load more', 'show more', 
      'view more', 'more posts', 'more results', 'see more'
    ];
    
    // Check if any links or buttons contain pagination text
    const hasTextualPaginationLinks = Array.from(document.querySelectorAll('a, button'))
      .some(el => {
        const text = el.textContent.toLowerCase();
        return paginationTexts.some(paginationText => text.includes(paginationText));
      });
    
    // Get selectors for pagination elements if they exist
    let paginationSelectors = {};
    
    if (paginationElements.nextLink) {
      const nextLink = document.querySelector(
        'a[rel="next"], a[aria-label*="Next"], .next, .nextpostslink, a[class*="next"], button[class*="next"]'
      );
      paginationSelectors.nextLink = getElementSelector(nextLink);
    }
    
    if (paginationElements.loadMoreButton) {
      const loadMoreButton = document.querySelector(
        'button[class*="load-more"], a[class*="load-more"], [class*="show-more"], [class*="view-more"]'
      );
      paginationSelectors.loadMoreButton = getElementSelector(loadMoreButton);
    }
    
    // Helper function to get a CSS selector for an element
    function getElementSelector(element) {
      if (!element) return null;
      
      // Try to get by ID
      if (element.id) {
        return `#${element.id}`;
      }
      
      // Try to get by unique class
      if (element.className) {
        const classes = element.className.split(/\s+/)
          .filter(cls => cls && !cls.includes('active') && !cls.includes('current'));
        
        if (classes.length > 0) {
          return `.${classes[0]}`;
        }
      }
      
      // Fallback to tag name
      return element.tagName.toLowerCase();
    }
    
    // Determine most likely pagination type
    const hasUrlPagination = Object.values(urlPatterns).some(Boolean);
    const hasPaginationElements = Object.values(paginationElements).some(Boolean);
    const hasInfiniteScroll = Object.values(infiniteScrollIndicators).some(Boolean);
    
    let primaryPaginationType = 'none';
    
    if (hasUrlPagination) {
      primaryPaginationType = 'url';
    } else if (paginationElements.loadMoreButton) {
      primaryPaginationType = 'load-more';
    } else if (paginationElements.nextLink) {
      primaryPaginationType = 'next-link';
    } else if (paginationElements.paginationContainer) {
      primaryPaginationType = 'numbered';
    } else if (hasInfiniteScroll) {
      primaryPaginationType = 'infinite';
    } else if (hasTextualPaginationLinks) {
      primaryPaginationType = 'text-link';
    }
    
    return {
      detected: hasUrlPagination || hasPaginationElements || hasInfiniteScroll || hasTextualPaginationLinks,
      primaryType: primaryPaginationType,
      urlPatterns,
      paginationElements,
      infiniteScrollIndicators,
      hasTextualPaginationLinks,
      selectors: paginationSelectors
    };
  }, url);
}

/**
 * Detects if infinite scroll is present on a page
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Object containing infinite scroll information
 */
async function detectInfiniteScroll(page) {
  if (!page || !page.evaluate) {
    throw new Error('Invalid page object provided');
  }

  // First get initial height
  const initialHeight = await page.evaluate(() => document.body.scrollHeight);
  
  // Scroll down 20% and wait
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight * 0.2);
  });
  await page.waitForTimeout(1000);
  
  // Scroll down 40% and wait
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight * 0.4);
  });
  await page.waitForTimeout(1000);
  
  // Check for height changes and other indicators
  return await page.evaluate((initialHeight) => {
    const newHeight = document.body.scrollHeight;
    const heightIncreased = newHeight > initialHeight;
    const heightDelta = newHeight - initialHeight;
    
    // Check for loading indicators
    const loadingIndicators = document.querySelectorAll(
      '[class*="loading"], [class*="spinner"], [class*="loader"], [aria-busy="true"]'
    );
    const hasLoadingIndicators = loadingIndicators.length > 0;
    
    // Check for lazy-loaded images
    const allImages = document.querySelectorAll('img');
    const lazyImages = Array.from(allImages).filter(img => 
      img.getAttribute('loading') === 'lazy' || 
      img.getAttribute('data-src') ||
      img.getAttribute('data-lazy') ||
      img.getAttribute('data-lazy-src')
    );
    
    // Check for addition of new DOM elements
    const currentElementCount = document.querySelectorAll('*').length;
    
    // Check if there are "sentinel" elements often used for infinite scroll triggers
    const sentinelElements = document.querySelectorAll(
      '[class*="sentinel"], [class*="infinite"], [class*="scroll-trigger"], [class*="observe"]'
    );
    
    // Check if there's an IntersectionObserver in use (common for infinite scroll)
    const hasIntersectionObserver = typeof IntersectionObserver !== 'undefined';
    
    // Calculate the confidence level that this page uses infinite scroll
    let infiniteScrollConfidence = 0;
    
    if (heightIncreased && heightDelta > 100) infiniteScrollConfidence += 3;
    if (hasLoadingIndicators) infiniteScrollConfidence += 2;
    if (lazyImages.length > 5) infiniteScrollConfidence += 2;
    if (sentinelElements.length > 0) infiniteScrollConfidence += 3;
    if (hasIntersectionObserver) infiniteScrollConfidence += 1;
    
    // Normalize confidence to 0-10 scale
    infiniteScrollConfidence = Math.min(10, infiniteScrollConfidence);
    
    return {
      detected: infiniteScrollConfidence > 3,
      confidence: infiniteScrollConfidence,
      heightChangedAfterScroll: heightIncreased,
      heightDelta,
      loadingIndicators: {
        detected: hasLoadingIndicators,
        count: loadingIndicators.length
      },
      lazyLoading: {
        detected: lazyImages.length > 0,
        imageCount: lazyImages.length,
        totalImages: allImages.length
      },
      sentinelElements: {
        detected: sentinelElements.length > 0,
        count: sentinelElements.length
      },
      hasIntersectionObserver
    };
  }, initialHeight);
}

/**
 * Detects the primary content type of a page
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Object containing content type information
 */
async function detectContentType(page) {
  if (!page || !page.evaluate) {
    throw new Error('Invalid page object provided');
  }

  return await page.evaluate(() => {
    // Look for common content type indicators
    const articleIndicators = {
      article: !!document.querySelector('article'),
      blogPost: !!document.querySelector('[class*="post"], [class*="blog"]'),
      longform: document.querySelectorAll('p').length > 10,
      datePublished: !!document.querySelector('[itemprop="datePublished"], [class*="publish-date"], [class*="post-date"]'),
      author: !!document.querySelector('[itemprop="author"], [class*="author"], .byline'),
      comments: !!document.querySelector('[class*="comment"], [id*="comment"]'),
      shareButtons: !!document.querySelector('[class*="share"], [id*="share"]')
    };
    
    const productIndicators = {
      price: !!document.querySelector('[class*="price"], [itemprop="price"], .price, #price'),
      productGallery: !!document.querySelector('[class*="product-gallery"], [class*="product-images"], [class*="carousel"]'),
      addToCart: !!document.querySelector('button[class*="cart"], button[class*="buy"], button[class*="add"], [id*="add-to-cart"]'),
      productTitle: !!document.querySelector('[itemprop="name"], [class*="product-title"], [class*="product-name"]'),
      sku: !!document.querySelector('[itemprop="sku"], [class*="sku"], [class*="product-id"]'),
      variations: !!document.querySelector('select[class*="variation"], [class*="variant"], [class*="option"]'),
      reviews: !!document.querySelector('[class*="review"], [class*="rating"], [class*="stars"]')
    };
    
    const listingIndicators = {
      grid: !!document.querySelector('[class*="grid"], [class*="row"], [class*="items"]'),
      repeatedElements: document.querySelectorAll('[class*="item"], [class*="card"], [class*="product"], [class*="post"]').length > 5,
      pagination: !!document.querySelector('[class*="pagination"], [class*="pager"], [class*="pages"]'),
      sorting: !!document.querySelector('[class*="sort"], [class*="filter"], [class*="order"]'),
      resultCount: !!document.querySelector('[class*="count"], [class*="found"], [class*="results"]')
    };
    
    const documentationIndicators = {
      toc: !!document.querySelector('[class*="toc"], [id*="toc"], [class*="table-of-contents"]'),
      codeBlocks: document.querySelectorAll('pre, code, [class*="code"]').length > 2,
      apiReferences: !!document.querySelector('[class*="api"], [class*="reference"], [class*="endpoint"]'),
      sectionLinks: document.querySelectorAll('a[href^="#"]').length > 5,
      technicalTerms: !!document.querySelector('[class*="parameters"], [class*="functions"], [class*="methods"]')
    };

    const recipeIndicators = {
      ingredients: !!document.querySelector('[class*="ingredient"], [itemprop="recipeIngredient"]'),
      instructions: !!document.querySelector('[class*="instruction"], [class*="direction"], [itemprop="recipeInstructions"]'),
      cookTime: !!document.querySelector('[itemprop="cookTime"], [class*="cook-time"]'),
      prepTime: !!document.querySelector('[itemprop="prepTime"], [class*="prep-time"]'),
      recipeYield: !!document.querySelector('[itemprop="recipeYield"], [class*="yield"], [class*="serving"]'),
      nutritionInfo: !!document.querySelector('[class*="nutrition"], [itemprop="nutrition"]')
    };
    
    // Calculate scores for each type
    const articleScore = Object.values(articleIndicators).filter(Boolean).length;
    const productScore = Object.values(productIndicators).filter(Boolean).length;
    const listingScore = Object.values(listingIndicators).filter(Boolean).length;
    const documentationScore = Object.values(documentationIndicators).filter(Boolean).length;
    const recipeScore = Object.values(recipeIndicators).filter(Boolean).length;
    
    // Weight the scores - recipeScore gets a higher weight since it has fewer indicators
    const weightedRecipeScore = recipeScore * 1.5;
    
    // Determine primary and secondary types
    let primaryType = 'unknown';
    let secondaryType = 'unknown';
    
    const scores = {
      article: articleScore,
      product: productScore,
      listing: listingScore,
      documentation: documentationScore,
      recipe: weightedRecipeScore
    };
    
    // Sort types by score
    const sortedTypes = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // Set primary and secondary types
    primaryType = sortedTypes[0] || 'unknown';
    secondaryType = sortedTypes[1] || 'unknown';
    
    return {
      primaryType,
      secondaryType,
      scores,
      indicators: {
        article: articleIndicators,
        product: productIndicators,
        listing: listingIndicators,
        documentation: documentationIndicators,
        recipe: recipeIndicators
      }
    };
  });
}

/**
 * Main analyzer function that coordinates all detection methods
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Complete analysis results
 */
async function analyzeSite(page, options = {}) {
  if (!page || !page.evaluate) {
    throw new Error('Invalid page object provided');
  }
  
  const defaultOptions = {
    detailed: false,  // Include detailed analysis results
    timeout: 5000,    // Timeout for individual analyzers
    includeScreenshot: false // Whether to include a screenshot in results
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    // Get current URL
    const url = await page.url();
    
    // Run structure detection
    const structure = await detectPageStructure(page);
    
    // Run content type detection
    const contentType = await detectContentType(page);
    
    // Run pagination detection
    const pagination = await detectPaginationMethods(page);
    
    // Run infinite scroll detection if not disabled
    let infiniteScroll = { detected: false };
    
    if (!mergedOptions.skipInfiniteScrollDetection) {
      infiniteScroll = await detectInfiniteScroll(page);
    }
    
    // Get page metadata
    const metadata = await page.evaluate(() => {
      return {
        title: document.title || '',
        metaDescription: document.querySelector('meta[name="description"]')?.content || '',
        h1Text: document.querySelector('h1')?.textContent?.trim() || '',
        language: document.documentElement.lang || 'unknown'
      };
    });
    
    // Determine page size metrics
    const pageSize = await page.evaluate(() => {
      const totalElements = document.querySelectorAll('*').length;
      const contentLength = document.body.innerText.length;
      const imageCount = document.querySelectorAll('img').length;
      const linkCount = document.querySelectorAll('a').length;
      
      return {
        totalElements,
        contentLength,
        imageCount,
        linkCount,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        documentHeight: document.body.scrollHeight
      };
    });
    
    // Take a screenshot if requested
    let screenshot = null;
    if (mergedOptions.includeScreenshot) {
      screenshot = await page.screenshot({ 
        encoding: 'base64',
        type: 'jpeg',
        quality: 50
      });
    }
    
    // Determine optimal scraping strategy
    const analysisResult = {
      url,
      timestamp: new Date().toISOString(),
      metadata,
      structure,
      contentType,
      pagination,
      infiniteScroll,
      pageSize
    };
    
    const recommendedStrategy = determineOptimalStrategy(analysisResult);
    
    // Return full analysis with recommendations
    return {
      ...analysisResult,
      recommendedStrategy,
      screenshot
    };
  } catch (error) {
    // Return error but try to include any partial results
    return {
      error: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString(),
      url: await page.url(),
      partialResults: true
    };
  }
}

/**
 * Determine the optimal extraction strategy based on content type and page structure
 * @param {Object} analysis - Result of full page analysis
 * @returns {Object} Strategy configuration
 */
function determineOptimalStrategy(analysis) {
  if (!analysis || !analysis.pageStructure) {
    return null;
  }
  
  const { pageStructure, contentType } = analysis;
  
  // Default strategy
  const strategy = {
    maxScrolls: 100,
    scrollDelay: 1000,
    extractorPriority: [],
    skipExtractors: [],
    paginationStrategy: null
  };
  
  // Simple site detection (like example.com)
  if (isSimpleSite(pageStructure)) {
    return {
      maxScrolls: 5, // Drastically reduce scrolls for simple sites
      scrollDelay: 500,
      extractorPriority: ['BasicExtractor'],
      skipExtractors: ['ArticleExtractor', 'ProductExtractor', 'ListingExtractor', 'DetailedTextExtractor'],
      paginationStrategy: null,
      simpleSite: true
    };
  }
  
  // Apply content type specific optimizations
  if (contentType === 'article') {
    strategy.extractorPriority = ['ArticleExtractor', 'BasicExtractor'];
    strategy.skipExtractors = ['ProductExtractor', 'ListingExtractor'];
    // Articles typically need fewer scrolls
    strategy.maxScrolls = 50;
  } 
  else if (contentType === 'product') {
    strategy.extractorPriority = ['ProductExtractor', 'BasicExtractor'];
    strategy.skipExtractors = ['ArticleExtractor'];
    // Product pages often need fewer scrolls
    strategy.maxScrolls = 30;
  }
  else if (contentType === 'listing') {
    strategy.extractorPriority = ['ListingExtractor', 'BasicExtractor'];
    strategy.maxScrolls = 150; // Listings may need more scrolling
    strategy.scrollDelay = 800; // Slightly faster for listings
  }
  
  // Apply pagination strategy based on detection
  if (analysis.pagination) {
    const { pagination } = analysis;
    
    if (pagination.hasInfiniteScroll) {
      strategy.paginationStrategy = 'infinite';
    }
    else if (pagination.hasClickPagination && pagination.paginationSelectors?.nextLink) {
      strategy.paginationStrategy = 'click';
      strategy.clickSelector = pagination.paginationSelectors.nextLink;
    }
    else if (pagination.hasUrlPagination) {
      strategy.paginationStrategy = 'url';
    }
  }
  
  return strategy;
}

/**
 * Determine if a site is a simple static site with minimal content
 * @param {Object} structure - Page structure analysis
 * @returns {boolean} True if site appears to be a simple static site
 */
function isSimpleSite(structure) {
  if (!structure) return false;
  
  const { elements, counts, metrics } = structure;
  
  // Check for these characteristics of simple sites:
  // 1. Small element count (simple DOM)
  // 2. Few headings and links
  // 3. No complex layout elements
  // 4. Low text content
  
  const hasSimpleDom = metrics.elementCount < 100;
  const hasFewHeadings = (counts.h1 + counts.h2 + counts.h3) < 5;
  const hasFewLinks = counts.links < 20;
  const hasSimpleLayout = !elements.hasMultipleColumns && 
                         !elements.hasSidebar && 
                         !elements.hasNav;
  const hasLowTextContent = metrics.textLength < 2000;
  
  // A site is considered simple if most of these are true
  return (hasSimpleDom && hasFewHeadings && hasFewLinks && hasLowTextContent) || 
         (hasSimpleDom && hasSimpleLayout && (hasFewHeadings || hasLowTextContent));
}

module.exports = {
  analyzeSite,
  detectPageStructure,
  detectPaginationMethods,
  detectInfiniteScroll,
  detectContentType,
  determineOptimalStrategy
}; 