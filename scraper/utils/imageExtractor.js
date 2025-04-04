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
 * Extract images from the page without any filtering
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {Object} options - Image extraction options
 * @returns {Promise<Array>} Array of image objects
 */
async function extractImages(page, options = {}) {
  const { maxImages = 0 } = options; // 0 means no limit

  try {
    return await page.evaluate((maxImg) => {
      // Helper to generate an absolute URL
      const toAbsoluteUrl = (relativeUrl) => {
        try {
          return new URL(relativeUrl, window.location.href).href;
        } catch (e) {
          return relativeUrl;
        }
      };

      // Get ALL images without any filtering
      let imgElements = Array.from(document.querySelectorAll('img'));
      
      // Only limit the number if maxImages > 0
      if (maxImg > 0) {
        imgElements = imgElements.slice(0, maxImg);
      }

      // Extract image data from all images without filtering
      return imgElements.map(img => {
        return {
          url: toAbsoluteUrl(img.src || img.dataset.src || ''),
          alt: img.alt || '',
          title: img.title || '',
          width: img.width || 0,
          height: img.height || 0
        };
      }).filter(img => img.url); // Only filter out images without URLs
    }, maxImages);
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