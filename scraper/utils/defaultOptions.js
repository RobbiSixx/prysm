/**
 * Default options for the scraper
 * All settings should use these defaults instead of hardcoding values
 */
const DEFAULT_OPTIONS = {
  // Scroll settings
  maxScrolls: 200,            // Maximum scroll attempts - increased from 100 for better scraping
  scrollDelay: 1000,          // Delay between scrolls in milliseconds
  
  // Browser settings
  headless: true,             // Run in headless mode
  bypassCloudflare: true,     // Enable Cloudflare bypass
  
  // Pagination settings
  handlePagination: true,     // Enable auto-pagination
  paginationStrategy: null,   // Auto-detect (null) or force a specific strategy
  
  // Path settings
  output: null,               // Will be set dynamically based on __dirname
  
  // Page settings
  pages: 1,                   // Default to 1 page (single page scrape)
  followLinks: false,         // By default, don't follow links
  sameDomainOnly: true,       // Only follow links on the same domain
  
  // Image settings
  scrapeImages: false,        // Whether to scrape images
  downloadImages: false,      // Whether to download images
  maxImages: 100,             // Maximum number of images to extract per page
  minImageSize: 100,          // Minimum size for images in pixels
  imageOutputDir: null,       // Will be set dynamically based on output path
  
  // Advanced settings
  concurrentImageDownloads: 5, // Number of concurrent image downloads
  waitForContentTimeout: 60000 // Timeout for waiting for content to load
};

module.exports = {
  DEFAULT_OPTIONS
}; 