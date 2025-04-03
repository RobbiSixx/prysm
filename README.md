![Prysm Logo](https://res.cloudinary.com/di7ctlowx/image/upload/v1743577195/logo_iu7ob8.png)

# 🔍 Prysm – Structure-Aware Web Scraper for Anything on the Internet

[![npm version](https://img.shields.io/npm/v/@pinkpixel/prysm-scraper.svg)](https://www.npmjs.com/package/@pinkpixel/prysm-scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Prysm is a blazing-smart Puppeteer-based web scraper that doesn't just extract — it *understands* structure. From recipes and documentation to ecommerce listings and blogs, Prysm dynamically adapts to the page and gets what matters — fast.

---

## ⚡ Features

- 🧠 **AI-style Structure Detection**: Recipes, articles, docs, products, blogs — identified and extracted with precision.
- 🕵️‍♂️ **Cloudflare Bypass**: Defeats the orange wall with stealth plugins and anti-bot evasion.
- 🚫 **Resource Blocking**: Faster scrapes with image/script/fonts tracking turned off.
- 🔄 **Smart Pagination**: Scroll, click, or URL pattern — handled automatically or manually.
- 📸 **Image Extraction**: Scrape images with contextual information and optional local downloading.
- 🛠 **Pluggable & Modular**: Add your own extractors, pagination styles, or content processors in seconds.
- 🌐 **REST API**: OpenAPI-powered REST interface for remote control and integration.
- 🔨 **Brute Force Architecture**: Core design applies all extraction techniques to every page without detection logic for maximum content retrieval

---

## 🚀 Quick Start

```bash
# Install from npm
npm install @pinkpixel/prysm-scraper

# Update to the latest version
npm install @pinkpixel/prysm-scraper@latest

# Or install dependencies locally
npm install

# Run scraper on example URL
npm run start:cli "https://example.com"

# Start the REST API server
npm run start:api
```

## 🖥️ CLI Usage

The CLI provides a simple interface to run the scraper. Prysm automatically detects page structure and adapts its scraping strategy accordingly:

```bash
# Scrape any URL
npm run start:cli "https://example.com" \
  --maxScrolls 10 \
  --scrollDelay 2000

# Scrape multiple pages by following links (defaults to same domain)
npm run start:cli "https://example.com" --pages 5

# Scrape images from a page
npm run start:cli "https://example.com" --scrapeImages

# Scrape and download images
npm run start:cli "https://example.com" --downloadImages --maxImages 50 --minImageSize 200
```

### CLI Options

- `--pages <number>` - Maximum number of pages to scrape (default: 1)
- `--allDomains` - Follow links to any domain (default: same domain only)
- `--maxScrolls <number>` - Maximum scroll attempts (default: 100)
- `--scrollDelay <ms>` - Delay between scrolls in ms (default: 1000)
- `--headless` - Run in headless mode (default: true)
- `--noHeadless` - Run with browser visible
- `--output <path>` - Custom output path for results
- `--scrapeImages` - Enable image scraping (default: false)
- `--downloadImages` - Download images locally (enables scrapeImages)
- `--maxImages <number>` - Maximum images to extract per page (default: 100)
- `--minImageSize <pixels>` - Minimum width/height for images (default: 100)

#### Smart Scan Options

- `--analyze` - Run analysis only without scraping
- `--no-analyze` - Disable Smart Scan (enabled by default)
- `--focused` - Optimize for speed (fewer scrolls, main content only)
- `--standard` - Balanced approach (default)
- `--deep` - Maximum extraction (slower)
- `--article` - Optimize for articles and blog posts
- `--product` - Optimize for product pages
- `--listing` - Optimize for product listings and search results

### 🧠 Smart Scan

Prysm includes an intelligent analysis system that examines page structure before scraping to optimize the extraction process:

```bash
# Analyze a site structure without scraping
npm run start:cli "https://example.com" --analyze

# Speed optimization options (choose one)
npm run start:cli "https://example.com" --focused      # Fastest extraction, focuses on main content
npm run start:cli "https://example.com" --standard    # Balanced approach (default)
npm run start:cli "https://example.com" --deep      # Maximum content extraction (slower)

# Content type optimization options (choose one)
npm run start:cli "https://example.com" --article   # Optimized for blog posts and articles
npm run start:cli "https://example.com" --product   # Optimized for e-commerce product pages
npm run start:cli "https://example.com" --listing   # Optimized for product listings and search results

# Skip the Smart Scan analysis
npm run start:cli "https://example.com" --no-analyze
```

Smart Scan automatically identifies:
- Content type (article, product, listing, etc.)
- Page structure and elements
- Pagination type and selectors
- Infinite scroll behavior

Based on this analysis, Prysm dynamically selects the optimal extraction strategy for maximum efficiency.

Prysm will automatically:

- Detect page structure (article, recipe, product listing, etc.)
- Choose the best extraction strategy
- Handle pagination if present
- Bypass anti-bot protections when needed
- Block unnecessary resources for faster scraping
- Follow links to additional pages when --pages > 1

## 🌐 REST API

Prysm includes a full-featured REST API that allows you to:

- Start scraping jobs remotely
- Check job status and progress
- Retrieve scraped content
- Manage jobs (cancel, delete)
- Receive webhook notifications

### Available Endpoints

#### 1. Create Scraping Job

```bash
POST http://localhost:3001/api/jobs

# Request body:
{
  "url": "https://example.com/page-to-scrape",
  "options": {
    "maxScrolls": 100,              # Optional: scroll attempts
    "scrollDelay": 1000,            # Optional: delay between scrolls (ms)
    "bypassCloudflare": true,       # Optional: bypass Cloudflare
    "handlePagination": true,       # Optional: auto-handle pagination
    "paginationStrategy": "infinite" # Optional: force pagination strategy
  }
}

# Response:
{
  "jobId": "job_xyz123",
  "status": "pending",
  "url": "https://example.com/page-to-scrape",
  "createdAt": "2024-03-20T10:30:00Z"
}
```

#### 2. Check Job Status

```bash
GET http://localhost:3001/api/jobs/{jobId}

# Response:
{
  "jobId": "job_xyz123",
  "status": "completed",
  "url": "https://example.com/page-to-scrape",
  "createdAt": "2024-03-20T10:30:00Z",
  "completedAt": "2024-03-20T10:31:00Z",
  "progress": 100
}
```