# 🔍 Prysm CLI Usage Guide

This document explains how to use the Prysm command-line interface for web scraping.

## Commands

There are two main ways to use Prysm:

1. **Scrape a URL** - Run the web scraper on any URL
2. **Start the API server** - Run the REST API server for remote control

## 1. Scraping a URL

```bash
# Basic usage
npm run scrape "https://example.com"

# With options
npm run scrape "https://example.com" --maxScrolls 10 --noHeadless
```

> Note: You can also use `npm run start:cli` which does the same thing.

### Options

- `--maxScrolls <number>` - Maximum scroll attempts (default: 100)
- `--scrollDelay <ms>` - Delay between scrolls in ms (default: 2000)
- `--headless` - Run in headless mode (default: true)
- `--noHeadless` - Run with browser visible
- `--output <path>` - Custom output path for results
- `--help` - Show help message

### Smart Scan Options

- `--analyze` - Run analysis without scraping (for testing)
- `--skipAnalysis` - Disable Smart Scan for traditional brute force approach
- `--focused` - Optimize for speed with fewer scrolls, main content only
- `--standard` - Balanced approach (default)
- `--deep` - Maximum extraction, slower but thorough
- `--article` - Optimize for articles and blog posts
- `--product` - Optimize for product pages
- `--listing` - Optimize for product listings

### Examples

```bash
# Basic scraping
npm run scrape "https://example.com"

# With custom scroll settings
npm run scrape "https://example.com" --maxScrolls 10 --scrollDelay 1000

# Disable headless mode to see the browser
npm run scrape "https://example.com" --noHeadless

# Custom output location
npm run scrape "https://example.com" --output "./my-results"

# Use Smart Scan with focused mode (faster)
npm run scrape "https://example.com" --focused

# Analyze site structure without scraping
npm run scrape "https://example.com" --analyze

# Optimize for article content
npm run scrape "https://example.com" --article
```

## 2. Starting the API Server

```bash
npm run start:api
```

This will start the API server, which automatically finds an available port (defaults to 3000 if available).

Once running, you can access:

- API at http://localhost:3001/api
- Documentation at http://localhost:3001/api-docs

## Results

All scraping results are saved in the `results` folder inside the `scraper` directory.

Each result is saved as a JSON file with:

- Page title
- Extracted content
- Metadata
- Structure type (article, recipe, etc.)
- Pagination type used
- Extraction method
- URL and timestamp

## Troubleshooting

If you encounter errors:

1. Make sure you have all dependencies installed: `npm install`
2. Check if the URL is accessible in a regular browser
3. Try with `--noHeadless` to see what's happening in the browser
4. Disable Cloudflare bypass with `--noBypassCloudflare` if you're having issues