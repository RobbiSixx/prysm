// paginationStrategies.js - Different pagination handling strategies

const { sleep, waitForSelector, safeClick, isElementVisible } = require('./helpers');

/**
 * Base pagination strategy class
 */
class PaginationStrategy {
    constructor(page, options = {}) {
        this.page = page;
        this.maxAttempts = options.maxAttempts;
        this.delay = options.delay;
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

module.exports = {
    InfiniteScrollStrategy,
    ClickPaginationStrategy,
    URLPaginationStrategy
};