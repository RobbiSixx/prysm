// paginationStrategies.js - Different pagination handling strategies

const { sleep, waitForSelector, safeClick, isElementVisible } = require('./helpers');

// Import default options from utils
const { DEFAULT_OPTIONS } = require('./defaultOptions');

/**
 * Base pagination strategy class
 */
class PaginationStrategy {
    constructor(page, options = {}) {
        this.page = page;
        this.maxAttempts = options.maxAttempts || DEFAULT_OPTIONS.maxScrolls;
        this.delay = options.delay || DEFAULT_OPTIONS.scrollDelay;
    }

    async paginate() {
        throw new Error('paginate() must be implemented by subclass');
    }
}

/**
 * Handles infinite scroll pagination
 */
class InfiniteScrollStrategy extends PaginationStrategy {
    constructor(page, options = {}) {
        super(page, options);
        this.scrollContainerSelector = options.scrollContainerSelector;
        this.minHeightChange = options.minHeightChange || 10;
    }

    async paginate() {
        // Try all scroll strategies in sequence
        await this.standardScroll();
        await this.chunkScroll();
        await this.reverseScroll();
        await this.pulseScroll();
        await this.zigzagScroll();
        await this.stepScroll();
        await this.bounceScroll();
        await this.hoverScroll();
        await this.randomScroll();
        await this.cornerScroll();
        await this.diagonalScroll();
        await this.spiralScroll();
        await this.swipeScroll();
        await this.resizeScroll();
        // Final pass to ensure we got everything
        await this.standardScroll();
    }

    async standardScroll() {
        let lastHeight = await this.getScrollHeight();
        let attempts = 0;
        let noChangeCount = 0;
        
        while (attempts < this.maxAttempts && noChangeCount < 3) {
            await this.scrollToBottom();
            await this.page.waitForTimeout(this.delay);
            
            const newHeight = await this.getScrollHeight();
            
            if (newHeight === lastHeight) {
                noChangeCount++;
            } else {
                noChangeCount = 0;
            }
            
            lastHeight = newHeight;
            attempts++;
            
            await this.page.evaluate(() => {
                window.dispatchEvent(new Event('scroll'));
            });
        }
    }

    async chunkScroll() {
        const totalHeight = await this.getScrollHeight();
        const chunkSize = Math.floor(totalHeight / 10);
        let currentPosition = 0;
        
        while (currentPosition < totalHeight) {
            await this.scrollToPosition(currentPosition);
            await this.page.waitForTimeout(this.delay / 2);
            currentPosition += chunkSize;
        }
        
        await this.scrollToBottom();
    }

    async reverseScroll() {
        await this.scrollToBottom();
        await this.page.waitForTimeout(this.delay);
        
        const totalHeight = await this.getScrollHeight();
        const chunkSize = Math.floor(totalHeight / 10);
        let currentPosition = totalHeight;
        
        while (currentPosition > 0) {
            await this.scrollToPosition(currentPosition);
            await this.page.waitForTimeout(this.delay / 2);
            currentPosition -= chunkSize;
        }
        
        await this.scrollToBottom();
    }

    async pulseScroll() {
        let lastHeight = await this.getScrollHeight();
        let attempts = 0;
        
        while (attempts < this.maxAttempts) {
            await this.scrollToBottom();
            await this.page.waitForTimeout(this.delay / 2);
            
            const currentHeight = await this.getScrollHeight();
            await this.scrollToPosition(currentHeight * 0.9);
            await this.page.waitForTimeout(this.delay / 2);
            
            const newHeight = await this.getScrollHeight();
            if (newHeight <= lastHeight) break;
            
            lastHeight = newHeight;
            attempts++;
        }
    }

    async zigzagScroll() {
        const totalHeight = await this.getScrollHeight();
        const steps = 20;
        const stepSize = totalHeight / steps;
        
        for (let i = 0; i < steps; i++) {
            const position = i * stepSize;
            await this.scrollToPosition(position);
            await this.page.waitForTimeout(this.delay / 4);
            
            // Zigzag left and right
            await this.page.evaluate(() => {
                window.scrollBy(-50, 0);
                window.scrollBy(50, 0);
            });
        }
        await this.scrollToBottom();
    }

    async stepScroll() {
        const totalHeight = await this.getScrollHeight();
        let position = 0;
        
        // Get viewport height properly
        const viewportHeight = await this.page.evaluate(() => window.innerHeight);
        const smallStep = Math.floor(viewportHeight / 2);
        
        while (position < totalHeight) {
            await this.scrollToPosition(position);
            await this.page.waitForTimeout(this.delay / 3);
            position += smallStep;
        }
        await this.scrollToBottom();
    }

    async bounceScroll() {
        let attempts = 0;
        while (attempts < this.maxAttempts) {
            // Scroll to bottom quickly
            await this.scrollToBottom();
            await this.page.waitForTimeout(this.delay / 2);
            
            // Bounce back to top
            await this.scrollToPosition(0);
            await this.page.waitForTimeout(this.delay / 2);
            
            attempts++;
        }
        await this.scrollToBottom();
    }

    async hoverScroll() {
        await this.page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            elements.forEach(el => {
                const event = new MouseEvent('mouseover', {
                    bubbles: true,
                    cancelable: true
                });
                el.dispatchEvent(event);
            });
        });
        await this.scrollToBottom();
    }

    async randomScroll() {
        const totalHeight = await this.getScrollHeight();
        let attempts = 0;
        
        while (attempts < this.maxAttempts) {
            const randomPosition = Math.floor(Math.random() * totalHeight);
            await this.scrollToPosition(randomPosition);
            await this.page.waitForTimeout(this.delay / 2);
            attempts++;
        }
        await this.scrollToBottom();
    }

    async cornerScroll() {
        await this.page.evaluate(() => {
            // Scroll to each corner of the viewport
            const viewportWidth = window.innerWidth;
            const positions = [
                [0, 0],
                [viewportWidth, 0],
                [0, document.documentElement.scrollHeight],
                [viewportWidth, document.documentElement.scrollHeight]
            ];
            
            positions.forEach(([x, y]) => {
                window.scrollTo(x, y);
            });
        });
        await this.scrollToBottom();
    }

    async diagonalScroll() {
        const totalHeight = await this.getScrollHeight();
        const viewportWidth = await this.page.evaluate(() => window.innerWidth);
        const steps = 20;
        
        // Scroll diagonally across the page
        for (let i = 0; i < steps; i++) {
            const yPos = (totalHeight / steps) * i;
            const xPos = (viewportWidth / steps) * i;
            
            await this.page.evaluate((x, y) => {
                window.scrollTo(x, y);
            }, xPos, yPos);
            
            await this.page.waitForTimeout(this.delay / 4);
        }
        
        await this.scrollToBottom();
    }
    
    async spiralScroll() {
        const totalHeight = await this.getScrollHeight();
        const viewportWidth = await this.page.evaluate(() => window.innerWidth);
        const centerX = viewportWidth / 2;
        const centerY = totalHeight / 2;
        const maxRadius = Math.min(centerX, centerY);
        const steps = 36; // 10-degree steps
        
        // Scroll in a spiral pattern
        for (let radius = 0; radius < maxRadius; radius += maxRadius / 10) {
            for (let angle = 0; angle < 360; angle += 360 / steps) {
                const xPos = centerX + radius * Math.cos(angle * Math.PI / 180);
                const yPos = centerY + radius * Math.sin(angle * Math.PI / 180);
                
                await this.page.evaluate((x, y) => {
                    window.scrollTo(x, y);
                }, xPos, yPos);
                
                await this.page.waitForTimeout(this.delay / 10);
            }
        }
        
        await this.scrollToBottom();
    }
    
    async swipeScroll() {
        // Use keyboard-based scrolling instead of touch events
        const totalHeight = await this.getScrollHeight();
        const viewportHeight = await this.page.evaluate(() => window.innerHeight);
        const steps = Math.ceil(totalHeight / viewportHeight);
        
        for (let i = 0; i < steps; i++) {
            await this.page.keyboard.press('PageDown');
            await this.page.waitForTimeout(this.delay / 3);
        }
        
        await this.scrollToBottom();
    }
    
    async resizeScroll() {
        // Get original viewport size
        const originalViewportSize = await this.page.viewport();
        
        // Try different viewport sizes
        const viewportSizes = [
            { width: 1280, height: 800 },
            { width: 768, height: 1024 },
            { width: 414, height: 896 },
            { width: 1920, height: 1080 }
        ];
        
        for (const size of viewportSizes) {
            await this.page.setViewport(size);
            await this.page.waitForTimeout(this.delay / 2);
            await this.scrollToBottom();
            await this.page.waitForTimeout(this.delay / 2);
        }
        
        // Restore original viewport
        await this.page.setViewport(originalViewportSize);
        await this.scrollToBottom();
    }

    async getScrollHeight() {
        if (this.scrollContainerSelector) {
            return await this.page.evaluate((selector) => {
                const container = document.querySelector(selector);
                return container ? container.scrollHeight : document.documentElement.scrollHeight;
            }, this.scrollContainerSelector);
        }
        return await this.page.evaluate(() => document.documentElement.scrollHeight);
    }

    async scrollToPosition(position) {
        if (this.scrollContainerSelector) {
            await this.page.evaluate((selector, pos) => {
                const container = document.querySelector(selector);
                if (container) {
                    container.scrollTo(0, pos);
                }
            }, this.scrollContainerSelector, position);
        } else {
            await this.page.evaluate((pos) => {
                window.scrollTo(0, pos);
            }, position);
        }
    }

    async scrollToBottom() {
        if (this.scrollContainerSelector) {
            await this.page.evaluate((selector) => {
                const container = document.querySelector(selector);
                if (container) {
                    container.scrollTo(0, container.scrollHeight);
                }
            }, this.scrollContainerSelector);
        } else {
            await this.page.evaluate(() => {
                window.scrollTo(0, document.documentElement.scrollHeight);
            });
        }
    }
}

/**
 * Handles click-based pagination (e.g. "Load More" buttons)
 */
class ClickPaginationStrategy extends PaginationStrategy {
    constructor(page, options = {}) {
        super(page, options);
        this.buttonSelector = options.buttonSelector;
        if (!this.buttonSelector) {
            throw new Error('buttonSelector is required for ClickPaginationStrategy');
        }
    }

    async paginate() {
        let attempts = 0;
        
        while (attempts < this.maxAttempts) {
            const buttonVisible = await this.isButtonVisible();
            if (!buttonVisible) {
                break;
            }
            
            await this.clickButton();
            await this.page.waitForTimeout(this.delay);
            attempts++;
        }
    }

    async isButtonVisible() {
        return await this.page.evaluate((selector) => {
            const button = document.querySelector(selector);
            if (!button) return false;
            
            const style = window.getComputedStyle(button);
            return button.offsetParent !== null && 
                   style.display !== 'none' && 
                   style.visibility !== 'hidden';
        }, this.buttonSelector);
    }

    async clickButton() {
        await this.page.evaluate((selector) => {
            const button = document.querySelector(selector);
            if (button) {
                button.click();
            }
        }, this.buttonSelector);
    }
}

/**
 * Handles URL-based pagination (e.g. page numbers in URL)
 */
class URLPaginationStrategy extends PaginationStrategy {
    constructor(page, options = {}) {
        super(page, options);
        this.baseUrl = options.baseUrl;
        this.urlPattern = options.urlPattern;
        this.contentSelector = options.contentSelector;
        
        if (!this.baseUrl || !this.urlPattern) {
            throw new Error('baseUrl and urlPattern are required for URLPaginationStrategy');
        }
    }

    async paginate() {
        let attempts = 0;
        
        while (attempts < this.maxAttempts) {
            const nextUrl = await this.findNextUrl();
            if (!nextUrl) {
                break;
            }
            
            await this.page.goto(nextUrl, { waitUntil: 'networkidle0' });
            await this.page.waitForTimeout(this.delay);
            attempts++;
        }
    }

    async findNextUrl() {
        return await this.page.evaluate(() => {
            const nextLink = document.querySelector('a[rel="next"], .next a, .pagination .next a');
            return nextLink ? nextLink.href : null;
        });
    }
}

/**
 * URL Parameter Pagination Strategy
 * 
 * Uses URL parameters like ?page=X to navigate through pages
 * while also scrolling within each page to load dynamic content.
 * This is especially useful for sites that use a hybrid pagination approach.
 */
class URLParameterPaginationStrategy {
  constructor(page, options = {}) {
    this.page = page;
    this.options = {
      maxScrollsPerPage: DEFAULT_OPTIONS.maxScrolls,
      scrollDelay: DEFAULT_OPTIONS.scrollDelay,
      maxPages: DEFAULT_OPTIONS.pages,
      pageParameter: 'page',
      waitForSelector: null,
      contentVerificationSelector: null,
      ...options
    };
    this.currentPage = 1;
    this.baseUrl = '';
    this.lastHeight = -1;
    this.consecutiveUnchanged = 0;
  }

  /**
   * Initialize pagination with base URL
   */
  async initialize(url) {
    this.baseUrl = url;
    this.currentPage = 1;
    return true;
  }

  /**
   * Constructs the URL for the current page
   */
  getPageUrl() {
    const separator = this.baseUrl.includes('?') ? '&' : '?';
    return `${this.baseUrl}${separator}${this.options.pageParameter}=${this.currentPage}`;
  }

  /**
   * Verifies if content exists on the current page
   * Simplified to be less strict with basic existence check
   */
  async verifyContent() {
    if (!this.options.contentVerificationSelector) {
      return true; // No selector provided, assume content exists
    }
    
    try {
      // Simple content check - just count elements
      const contentCount = await this.page.$$eval(
        this.options.contentVerificationSelector,
        elements => elements.length
      );
      
      return contentCount > 0;
    } catch (error) {
      // In case of error, assume content exists
      return true;
    }
  }

  /**
   * Scrolls within the current page to load all dynamic content
   * Enhanced for better content loading
   */
  async scrollCurrentPage() {
    this.lastHeight = -1;
    this.consecutiveUnchanged = 0;
    
    // Initial pause to let the page load
    await new Promise(resolve => setTimeout(resolve, DEFAULT_OPTIONS.scrollDelay));
    
    for (let i = 0; i < this.options.maxScrollsPerPage; i++) {
      // Get the current scroll height
      const newHeight = await this.page.evaluate('document.body.scrollHeight');
      
      // Scroll to the bottom
      await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      
      // Wait for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, this.options.scrollDelay));
      
      // Try multiple events to trigger lazy loading
      await this.page.evaluate(() => {
        // Dispatch both scroll and resize events
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
        
        // Additional events that might trigger content loading
        window.dispatchEvent(new MouseEvent('mousemove'));
        window.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Some sites use custom events for lazy loading
        try {
          window.dispatchEvent(new CustomEvent('lazyload'));
          window.dispatchEvent(new CustomEvent('load-more'));
        } catch (e) {
          // Ignore errors with custom events
        }
      });
      
      // Check if the height has changed
      if (newHeight === this.lastHeight) {
        this.consecutiveUnchanged++;
        if (this.consecutiveUnchanged >= 5) { // Reduced from 10 to avoid early termination
          break;
        }
      } else {
        this.consecutiveUnchanged = 0;
        this.lastHeight = newHeight;
      }
    }
    
    // Give a little extra time for final content to load
    await new Promise(resolve => setTimeout(resolve, DEFAULT_OPTIONS.scrollDelay));
    return true;
  }

  /**
   * Move to the next page
   */
  async next() {
    // First scroll within the current page to load all content
    await this.scrollCurrentPage();
    
    // Move to the next page number
    this.currentPage++;
    
    // Check if we've reached the maximum number of pages
    if (this.currentPage > this.options.maxPages) {
      return false;
    }
    
    // Navigate to the new page URL
    const nextPageUrl = this.getPageUrl();
    
    try {
      await this.page.goto(nextPageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for the specified selector if provided
      if (this.options.waitForSelector) {
        await this.page.waitForSelector(this.options.waitForSelector, { 
          visible: true, 
          timeout: 30000 
        });
      }
      
      // Verify content exists on this page
      const hasContent = await this.verifyContent();
      if (!hasContent) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if the strategy is applicable for the current page
   */
  static async isApplicable(page, url) {
    // Check if the page URL has a typical structure that might support this
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Sites/URL patterns that often use this pagination pattern
    const knownPatterns = [
      'social',
      'profile',
      'users',
      'gallery',
      'feed',
      'blog',
      'community'
    ];
    
    // Check if the URL matches any known patterns
    const matchesKnownPattern = knownPatterns.some(pattern => 
      url.toLowerCase().includes(pattern)
    );
    
    if (matchesKnownPattern) {
      return true;
    }
    
    // Try to detect if there are page navigation links
    try {
      const hasPaginationLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.some(link => {
          const href = link.href || '';
          return href.includes('page=') || 
                 href.match(/[?&]p=\d+/) ||
                 link.textContent?.match(/\d+/) ||
                 link.getAttribute('aria-label')?.includes('page');
        });
      });
      
      return hasPaginationLinks;
    } catch (error) {
      return false;
    }
  }
}

module.exports = {
    InfiniteScrollStrategy,
    ClickPaginationStrategy,
    URLPaginationStrategy,
    URLParameterPaginationStrategy
};