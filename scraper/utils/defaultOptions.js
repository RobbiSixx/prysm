/**
 * Default options for the scraper
 * All settings should use these defaults instead of hardcoding values
 */
const os = require('os');
const path = require('path');

// Default output paths
const HOME_DIR = os.homedir();
const DEFAULT_OUTPUT_DIR = path.join(HOME_DIR, 'prysm', 'output');
const DEFAULT_IMAGE_OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'images');

const DEFAULT_OPTIONS = {
  // Core user parameters
  pages: 1,                   // Default to 1 page (number of links to follow from specified URL)
  images: false,              // Whether to download images
  output: DEFAULT_OUTPUT_DIR, // Default output directory in user's home
  imageOutput: DEFAULT_IMAGE_OUTPUT_DIR, // Default image output directory (user changeable)
  
  // Hidden parameters (not exposed to users but needed for functionality)
  maxScrolls: 50,             // Maximum scroll attempts
  scrollDelay: 2000,          // Delay between scrolls in milliseconds
  headless: true,             // Run in headless mode
  bypassCloudflare: true,     // Enable Cloudflare bypass
  handlePagination: true,     // Enable auto-pagination
  paginationStrategy: null,   // Auto-detect (null) or force a specific strategy
  followLinks: false,         // By default, don't follow links
  sameDomainOnly: true,       // Only follow links on the same domain
  maxImages: 100,             // Maximum number of images to extract per page
  minImageSize: 100,          // Minimum size for images in pixels
  imageOutputDir: DEFAULT_IMAGE_OUTPUT_DIR, // For backward compatibility
  linkSelector: 'a',          // Default selector for links to follow when pages > 1
  concurrentImageDownloads: 5, // Number of concurrent image downloads
  waitForContentTimeout: 60000 // Timeout for waiting for content to load
};

module.exports = {
  DEFAULT_OPTIONS
}; 