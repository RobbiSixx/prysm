/**
 * profiles.js - Predefined scraping profiles for different use cases
 */

/**
 * Predefined scraping profiles
 */
const PROFILES = {
  /**
   * Speed profile - Optimized for fast scraping with minimal resource usage
   * Best for: Quick scans, simple pages, testing
   */
  speed: {
    maxScrolls: 30,
    scrollDelay: 500,
    priorityExtractors: ['mainContent', 'largestContent'],
    skipExtractors: ['textDensity', 'singleColumn', 'multiColumn', 'contentSections', 'documentation'],
    scrapeImages: false,
    downloadImages: false,
    followLinks: false,
    maxWaitTime: 10000,
    waitUntil: 'domcontentloaded'
  },
  
  /**
   * Balanced profile - Default settings for most websites
   * Best for: General purpose scraping, blogs, articles
   */
  balanced: {
    maxScrolls: 100,
    scrollDelay: 1000,
    priorityExtractors: [],
    skipExtractors: [],
    scrapeImages: true,
    downloadImages: false,
    followLinks: false,
    maxWaitTime: 30000,
    waitUntil: 'load'
  },
  
  /**
   * Thorough profile - Maximum content extraction
   * Best for: Archive scraping, data collection, research
   */
  thorough: {
    maxScrolls: 200,
    scrollDelay: 1500,
    priorityExtractors: [],
    skipExtractors: [],
    useAllExtractors: true,
    scrapeImages: true,
    downloadImages: true,
    followLinks: true,
    maxWaitTime: 60000,
    waitUntil: 'networkidle0',
    patienceLevel: 'high'
  },
  
  /**
   * Article profile - Optimized for article/blog content
   * Best for: News sites, blogs, medium, substack
   */
  article: {
    maxScrolls: 50,
    scrollDelay: 800,
    priorityExtractors: ['article', 'semantic', 'mainContent'],
    skipExtractors: ['product', 'multiColumn', 'singleColumn', 'documentation'],
    scrapeImages: true,
    downloadImages: false,
    followLinks: false,
    waitUntil: 'load'
  },
  
  /**
   * Product profile - Optimized for e-commerce/product pages
   * Best for: Amazon, eBay, Shopify sites
   */
  product: {
    maxScrolls: 30,
    scrollDelay: 1000,
    priorityExtractors: ['product', 'structured', 'largestContent'],
    skipExtractors: ['article', 'semantic', 'documentation'],
    scrapeImages: true,
    downloadImages: true,
    followLinks: false,
    waitUntil: 'networkidle2'
  },
  
  /**
   * Listing profile - Optimized for product listings, search results
   * Best for: Category pages, search results, directories
   */
  listing: {
    maxScrolls: 150,
    scrollDelay: 1000,
    priorityExtractors: ['listing', 'multiColumn', 'contentSections'],
    skipExtractors: ['article', 'semantic', 'documentation'],
    scrapeImages: true,
    downloadImages: false,
    followLinks: true,
    pages: 5,
    sameDomainOnly: true,
    waitUntil: 'load'
  }
};

/**
 * Apply a profile to scraper options
 * @param {Object} options - Current scraper options
 * @param {String} profileName - Name of the profile to apply
 * @returns {Object} Updated options with profile settings
 */
function applyProfile(options = {}, profileName = 'balanced') {
  // Get the requested profile, fallback to balanced
  const profile = PROFILES[profileName] || PROFILES.balanced;
  
  // Don't override explicit user settings
  const result = { ...profile };
  
  // Preserve any explicitly set options
  Object.keys(options).forEach(key => {
    if (options[key] !== undefined && options[key] !== null) {
      result[key] = options[key];
    }
  });
  
  return result;
}

/**
 * Get a profile by name
 * @param {String} profileName - Profile name
 * @returns {Object} Profile settings
 */
function getProfile(profileName) {
  return PROFILES[profileName] || PROFILES.balanced;
}

/**
 * List available profile names
 * @returns {Array} List of profile names
 */
function listProfiles() {
  return Object.keys(PROFILES);
}

module.exports = {
  PROFILES,
  applyProfile,
  getProfile,
  listProfiles
}; 