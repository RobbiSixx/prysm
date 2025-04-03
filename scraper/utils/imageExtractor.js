/**
 * Image Extractor - Utility for extracting and processing images from web pages
 */

const fsPromises = require('fs').promises;
const fs = require('fs'); // Add standard fs module
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Extract images from the page
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {Object} options - Image extraction options
 * @returns {Promise<Array>} Array of image objects
 */
async function extractImages(page, options = {}) {
  const {
    maxImages = 100,
    minImageSize = 100,
    excludeIcons = true,
    excludeTracking = true,
  } = options;

  try {
    return await page.evaluate(
      (maxImg, minSize, excludeIcn, excludeTrk) => {
        // Helper to check if a URL is likely a tracking pixel
        const isTrackingPixel = (url) => {
          const trackingPatterns = ['pixel', 'tracker', 'tracking', 'analytics', 'beacon', '1x1'];
          return trackingPatterns.some(pattern => url.toLowerCase().includes(pattern));
        };

        // Helper to generate an absolute URL
        const toAbsoluteUrl = (relativeUrl) => {
          try {
            return new URL(relativeUrl, window.location.href).href;
          } catch (e) {
            return relativeUrl;
          }
        };

        // Extract all img elements with their attributes
        const imgElements = Array.from(document.querySelectorAll('img'))
          .filter(img => {
            // Skip images without src
            if (!img.src) return false;
            
            // Skip tiny images (likely icons or tracking pixels)
            if (excludeIcn && (img.width < minSize || img.height < minSize)) return false;
            
            // Skip tracking pixels
            if (excludeTrk && isTrackingPixel(img.src)) return false;
            
            return true;
          })
          .slice(0, maxImg);

        // Extract image data
        return imgElements.map(img => {
          // Find closest caption if available
          const closestFigure = img.closest('figure');
          const captionElement = closestFigure ? 
            closestFigure.querySelector('figcaption') : null;
          
          // Get parent container for context
          const article = img.closest('article');
          const section = img.closest('section');
          const container = img.closest('[class*="content"], [class*="article"], [id*="content"], [id*="article"]');
          
          // Determine context
          let context = 'unknown';
          if (article) context = 'article';
          else if (section) context = section.id || section.className || 'section';
          else if (container) context = container.id || container.className || 'content';
          
          // Build image object
          return {
            url: toAbsoluteUrl(img.src),
            alt: img.alt || '',
            title: img.title || '',
            width: img.width || 0,
            height: img.height || 0,
            caption: captionElement ? captionElement.textContent.trim() : '',
            context: context.trim().replace(/\s+/g, ' ').substring(0, 100),
            naturalWidth: img.naturalWidth || 0,
            naturalHeight: img.naturalHeight || 0
          };
        });
      },
      maxImages,
      minImageSize,
      excludeIcons,
      excludeTracking
    );
  } catch (error) {
    console.warn(`Error extracting images: ${error.message}`);
    return [];
  }
}

/**
 * Download an image to local filesystem
 * @param {string} imageUrl - URL of the image to download
 * @param {string} outputDir - Directory to save the image
 * @param {string} [filename] - Optional filename, otherwise derived from URL
 * @returns {Promise<string|null>} Path to the downloaded file or null on failure
 */
async function downloadImage(imageUrl, outputDir, filename = null) {
  try {
    // Create the output directory if it doesn't exist
    await fsPromises.mkdir(outputDir, { recursive: true });
    
    // Generate a filename if not provided
    if (!filename) {
      const urlObj = new URL(imageUrl);
      const urlPathname = urlObj.pathname;
      filename = path.basename(urlPathname).replace(/[^a-zA-Z0-9.-]/g, '_');
      
      // Add a timestamp if the filename doesn't have an extension
      if (!path.extname(filename)) {
        filename = `${filename}_${Date.now()}.jpg`;
      }
    }
    
    const outputPath = path.join(outputDir, filename);
    
    // Return a promise that resolves when the download completes
    return new Promise((resolve, reject) => {
      // Determine protocol (http or https)
      const protocol = imageUrl.startsWith('https') ? https : http;
      
      // Make the request
      const request = protocol.get(imageUrl, (response) => {
        // Check if we got a successful response
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return reject(new Error(`Failed to download image: ${response.statusCode}`));
        }
        
        // Create a write stream and pipe the response to it
        const file = fs.createWriteStream(outputPath);
        response.pipe(file);
        
        // Handle events
        file.on('finish', () => {
          file.close(() => resolve(outputPath));
        });
        
        file.on('error', (err) => {
          fs.unlink(outputPath, () => {}); // Delete the file if there was an error, ignore unlink errors
          reject(err);
        });
      });
      
      request.on('error', (err) => {
        reject(err);
      });
      
      // Set a timeout
      request.setTimeout(30000, () => {
        request.abort();
        reject(new Error('Request timeout'));
      });
    });
  } catch (error) {
    console.warn(`Error downloading image ${imageUrl}: ${error.message}`);
    return null;
  }
}

module.exports = {
  extractImages,
  downloadImage
}; 