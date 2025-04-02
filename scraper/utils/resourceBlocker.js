/**
 * Resource blocker for improved performance
 * 
 * Blocks various resources to reduce load times and network traffic
 */

// Resource types that can be blocked
const RESOURCE_TYPES = [
  'stylesheet',
  'font',
  'media',
  'beacon',
  'prefetch',
  'ping'
];

// Resource types that can be conditionally blocked
const CONDITIONAL_RESOURCE_TYPES = [
  'image' // Images can be conditionally blocked based on scrapeImages option
];

// Domains for analytics, ads, etc. to block
const BLOCKED_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'googlesyndication.com',
  'analytics',
  'doubleclick.net',
  'facebook.net',
  'facebook.com/tr',
  'twitter.com/i/jot',
  'linkedin.com/px',
  'script.hotjar.com',
  'static.hotjar.com',
  'snap.licdn.com',
  'connect.facebook.net',
  'bat.bing.com',
  'stats.g.doubleclick.net',
  'vimeo.com'
];

/**
 * Setup resource blocker on a page to improve performance
 */
async function setupResourceBlocker(page, options = {}) {
  const {
    blockResourceTypes = RESOURCE_TYPES,
    conditionalResourceTypes = CONDITIONAL_RESOURCE_TYPES,
    blockedDomains = BLOCKED_DOMAINS,
    blockCssAnimations = true,
    enableWebSockets = false,
    scrapeImages = false // New option to control image blocking
  } = options;

  // Combine resource types to block based on options
  const typesToBlock = [...blockResourceTypes];
  
  // Only block images if not scraping them
  if (!scrapeImages && conditionalResourceTypes.includes('image')) {
    typesToBlock.push('image');
  }

  await page.setRequestInterception(true);

  page.on('request', request => {
    const url = request.url().toLowerCase();
    const resourceType = request.resourceType();

    // Allow essential operations
    if (request.isNavigationRequest()) {
      request.continue();
      return;
    }

    // Block by resource type
    if (typesToBlock.includes(resourceType)) {
      request.abort();
      return;
    }

    // Block by domain
    if (blockedDomains.some(domain => url.includes(domain))) {
      request.abort();
      return;
    }

    // Let the request through
    request.continue();
  });

  // Disable CSS animations if requested
  if (blockCssAnimations) {
    await page.addStyleTag({
      content: '* { animation: none !important; transition: none !important; }'
    });
  }
  
  // Disable web sockets if requested
  if (!enableWebSockets) {
    await page.evaluateOnNewDocument(() => {
      // Override WebSocket constructor to disable it
      window.WebSocket = class FakeWebSocket {
        constructor() {
          throw new Error('WebSockets disabled');
        }
      };
    });
  }
}

module.exports = {
  setupResourceBlocker,
  RESOURCE_TYPES,
  CONDITIONAL_RESOURCE_TYPES,
  BLOCKED_DOMAINS
};