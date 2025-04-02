// helpers.js - Common utility functions for scraping operations

/**
 * Sleeps for a specified duration.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Waits for a selector to be visible with a timeout
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector to wait for
 * @param {Object} options - Configuration options
 * @param {number} [options.timeout=30000] - Maximum time to wait in milliseconds
 * @param {boolean} [options.hidden=false] - Wait for element to be hidden
 * @returns {Promise<boolean>} - Whether the selector was found
 */
async function waitForSelector(page, selector, options = {}) {
    const { timeout = 30000, hidden = false } = options;
    try {
        await page.waitForSelector(selector, { 
            visible: !hidden,
            timeout 
        });
        return true;
    } catch (error) {
        console.warn(`Selector "${selector}" not found within ${timeout}ms`);
        return false;
    }
}

/**
 * Extracts text content from elements matching a selector
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector to extract from
 * @returns {Promise<string[]>} Array of extracted text content
 */
async function extractTextContent(page, selector) {
    try {
        return await page.$$eval(selector, elements => 
            elements
                .map(el => el.textContent?.trim())
                .filter(text => text && text.length > 0)
        );
    } catch (error) {
        console.warn(`Failed to extract text from selector "${selector}": ${error.message}`);
        return [];
    }
}

/**
 * Gets all attributes from elements matching a selector
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {string} attribute - Attribute name to extract
 * @returns {Promise<string[]>} Array of attribute values
 */
async function extractAttributes(page, selector, attribute) {
    try {
        return await page.$$eval(
            selector,
            (elements, attr) => elements
                .map(el => el.getAttribute(attr))
                .filter(value => value && value.trim().length > 0),
            attribute
        );
    } catch (error) {
        console.warn(`Failed to extract ${attribute} from selector "${selector}": ${error.message}`);
        return [];
    }
}

/**
 * Checks if an element is visible in the viewport
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @returns {Promise<boolean>}
 */
async function isElementVisible(page, selector) {
    try {
        const isVisible = await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (!element) return false;
            
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            
            return style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   style.opacity !== '0' &&
                   rect.width > 0 &&
                   rect.height > 0;
        }, selector);
        return isVisible;
    } catch (error) {
        console.warn(`Error checking visibility for selector "${selector}": ${error.message}`);
        return false;
    }
}

/**
 * Safely clicks an element with retry logic
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector to click
 * @param {Object} options - Configuration options
 * @param {number} [options.retries=3] - Number of click attempts
 * @param {number} [options.delay=1000] - Delay between retries in milliseconds
 * @returns {Promise<boolean>} Whether the click was successful
 */
async function safeClick(page, selector, options = {}) {
    const { retries = 3, delay = 1000 } = options;
    
    for (let i = 0; i < retries; i++) {
        try {
            const element = await page.$(selector);
            if (!element) {
                console.warn(`Click target "${selector}" not found (attempt ${i + 1}/${retries})`);
                await sleep(delay);
                continue;
            }

            // Check if element is visible and clickable
            const isVisible = await isElementVisible(page, selector);
            if (!isVisible) {
                console.warn(`Click target "${selector}" not visible (attempt ${i + 1}/${retries})`);
                await sleep(delay);
                continue;
            }

            await element.click();
            return true;
        } catch (error) {
            console.warn(`Click failed for "${selector}" (attempt ${i + 1}/${retries}): ${error.message}`);
            if (i < retries - 1) await sleep(delay);
        }
    }
    
    return false;
}

module.exports = {
    sleep,
    waitForSelector,
    extractTextContent,
    extractAttributes,
    isElementVisible,
    safeClick
};