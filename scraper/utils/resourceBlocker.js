// resourceBlocker.js - Performance optimization through resource blocking

/**
 * Common resource types to block for better performance
 */
const defaultBlockedResourceTypes = [
    'beacon',
    'csp_report',
    'font',
    'imageset',
    'media',
    'object',
    'texttrack',
];

/**
 * Common resource domains to block for better performance and privacy
 */
const defaultBlockedResourceDomains = [
    'adition',
    'adzerk',
    'analytics',
    'cdn.api.twitter',
    'clicksor',
    'clicktale',
    'doubleclick',
    'exelator',
    'facebook',
    'fontawesome',
    'google-analytics',
    'googletagmanager',
    'mixpanel',
    'optimizely',
    'quantserve',
    'zedo',
];

/**
 * Sets up request interception on a Puppeteer page for blocking unwanted resources
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {Object} options - Configuration options
 * @param {string[]} [options.blockedResourceTypes] - Resource types to block
 * @param {string[]} [options.blockedResourceDomains] - Resource domains to block
 * @param {function} [options.customBlockHandler] - Custom function to handle request blocking
 */
async function setupResourceBlocker(page, options = {}) {
    const {
        blockedResourceTypes = defaultBlockedResourceTypes,
        blockedResourceDomains = defaultBlockedResourceDomains,
        customBlockHandler = null,
    } = options;

    await page.setRequestInterception(true);

    page.on('request', request => {
        if (customBlockHandler) {
            return customBlockHandler(request);
        }

        const requestUrl = request.url().split('?')[0].toLowerCase();
        const shouldBlock = 
            blockedResourceTypes.includes(request.resourceType()) ||
            blockedResourceDomains.some(domain => requestUrl.includes(domain));

        if (shouldBlock) {
            request.abort();
        } else {
            request.continue();
        }
    });

    console.log('Resource blocker configured with:');
    console.log(`- ${blockedResourceTypes.length} blocked resource types`);
    console.log(`- ${blockedResourceDomains.length} blocked domains`);
}

module.exports = {
    setupResourceBlocker,
    defaultBlockedResourceTypes,
    defaultBlockedResourceDomains,
};