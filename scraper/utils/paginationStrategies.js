// paginationStrategies.js - Different pagination handling strategies

const { sleep, waitForSelector, safeClick, isElementVisible } = require('./helpers');

/**
 * Base pagination strategy class
 */
class PaginationStrategy {
    constructor(page, options = {}) {
        this.page = page;
        this.maxAttempts = options.maxAttempts || 20;
        this.delay = options.delay || 2000;
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
        this.batchScrolls = options.batchScrolls || 3;
        this.scrollBatchDelay = options.scrollBatchDelay || 300;
    }

    async paginate() {
        console.log(`Starting infinite scroll strategy (max attempts: ${this.maxAttempts})...`);
        let scrollCount = 0;
        let previousHeight = await this.getScrollHeight();

        while (scrollCount < this.maxAttempts) {
            console.log(`Scroll attempt ${scrollCount + 1}/${this.maxAttempts}`);
            
            // Perform batch scrolls
            for (let i = 0; i < this.batchScrolls; i++) {
                await this.performScroll();
                await sleep(this.scrollBatchDelay);
            }

            // Wait for network idle
            try {
                await this.page.waitForNetworkIdle({ 
                    idleTime: 500, 
                    timeout: 5000 
                });
            } catch (error) {
                console.warn('Network did not become idle, continuing...');
            }

            // Check if we've reached the end
            const newHeight = await this.getScrollHeight();
            if (newHeight === 0 || newHeight <= previousHeight + this.minHeightChange) {
                console.log('No significant height change detected, ending scroll.');
                break;
            }

            previousHeight = newHeight;
            scrollCount++;
            await sleep(this.delay);
        }

        console.log(`Infinite scroll completed after ${scrollCount} attempts`);
        return scrollCount;
    }

    async getScrollHeight() {
        try {
            return await this.page.evaluate((selector) => {
                const element = selector ? document.querySelector(selector) : document.body;
                return element ? element.scrollHeight : 0;
            }, this.scrollContainerSelector);
        } catch (error) {
            console.warn(`Error getting scroll height: ${error.message}`);
            return 0;
        }
    }

    async performScroll() {
        await this.page.evaluate((selector) => {
            const scrollElement = selector ? document.querySelector(selector) : window;
            const scrollAmount = window.innerHeight;
            if (scrollElement === window) {
                window.scrollBy(0, scrollAmount);
            } else {
                scrollElement.scrollBy(0, scrollAmount);
            }
        }, this.scrollContainerSelector);
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
        console.log(`Starting click-based pagination (max attempts: ${this.maxAttempts})...`);
        let clickCount = 0;

        while (clickCount < this.maxAttempts) {
            console.log(`Click attempt ${clickCount + 1}/${this.maxAttempts}`);
            
            // Check if button exists and is visible
            const buttonVisible = await isElementVisible(this.page, this.buttonSelector);
            if (!buttonVisible) {
                console.log('Pagination button not visible, ending pagination');
                break;
            }

            // Attempt to click the button
            const clicked = await safeClick(this.page, this.buttonSelector, {
                retries: 3,
                delay: 1000
            });

            if (!clicked) {
                console.log('Failed to click pagination button, ending pagination');
                break;
            }

            clickCount++;
            await sleep(this.delay);
        }

        console.log(`Click-based pagination completed after ${clickCount} clicks`);
        return clickCount;
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
        console.log(`Starting URL-based pagination (max attempts: ${this.maxAttempts})...`);
        let pageCount = 1;

        while (pageCount <= this.maxAttempts) {
            const url = this.urlPattern
                .replace('[PAGE]', pageCount)
                .replace('[BASE]', this.baseUrl);

            console.log(`Navigating to page ${pageCount}: ${url}`);
            
            try {
                await this.page.goto(url, { 
                    waitUntil: 'networkidle0',
                    timeout: 30000 
                });

                // Check if content exists
                if (this.contentSelector) {
                    const hasContent = await waitForSelector(this.page, this.contentSelector);
                    if (!hasContent) {
                        console.log('No content found on page, ending pagination');
                        break;
                    }
                }

                pageCount++;
                await sleep(this.delay);
            } catch (error) {
                console.warn(`Failed to load page ${pageCount}: ${error.message}`);
                break;
            }
        }

        console.log(`URL-based pagination completed after ${pageCount - 1} pages`);
        return pageCount - 1;
    }
}

module.exports = {
    InfiniteScrollStrategy,
    ClickPaginationStrategy,
    URLPaginationStrategy
};