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

## 🧩 How Prysm Works

Prysm's intelligent scraping process works in four key stages:

### 1. Site Analysis Phase
When Prysm encounters a new webpage, it first analyzes the structure and content to understand what it's looking at. This analysis includes detecting:
- Page structure and layout (elements, content organization, DOM patterns)
- Content type (article, product listing, documentation, recipe, etc.)
- Available pagination methods (infinite scroll, click-based, URL-based)
- Media content (images, videos) and their context

### 2. Smart Extraction Strategy
Based on the analysis, Prysm creates an optimized extraction plan:
- Prioritizes the most promising extraction methods for the detected content type
- Determines the best pagination approach (scroll, click next buttons, follow URL patterns)
- Adjusts scroll settings and timeouts based on page complexity
- Prepares specialized extractors for specific content (recipes, products, articles)

### 3. Comprehensive Extraction Testing
Prysm then systematically tests different extraction methods:
- Tries all applicable extraction techniques to find the most effective one
- Evaluates each method's results based on content quality and completeness
- Identifies the single most successful approach for this specific page type
- Maintains a "brute force" philosophy - trying everything to get the best results

### 4. Optimized Extraction Pipeline
For maximum efficiency, Prysm learns and adapts:
- After finding the most effective extraction method, it uses only that method for subsequent pages
- This dramatically speeds up multi-page scraping jobs by avoiding redundant testing
- If the chosen method fails on a different page, Prysm automatically falls back to testing all methods again
- The extraction continuously adapts to changing page structures across a website

This intelligent approach allows Prysm to handle virtually any website structure while optimizing for both speed and content quality.

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
# Scrape any URL using the npm package
npm run scrape -- "https://example.com"

# Use as a global command if installed with -g
npx prysm-scrape "https://example.com"

# Follow links within a page (great for documentation or multi-page content)
npm run scrape -- "https://example.com" --pages 5

# Download images from the page
npm run scrape -- "https://example.com" --images

# Custom output paths
npm run scrape -- "https://example.com" --output "/custom/path" --image-output "/custom/images"
```

### CLI Options

- `--pages <number>` - Number of links to follow from the initial URL (default: 1)
- `--images` - Download images from the page
- `--output <path>` - Custom output path for results (default: ~/prysm/output)
- `--image-output <path>` - Custom output path for images (default: ~/prysm/output/images)
- `--help` - Show help message

> **Note**: When using npm run scrape, you must include `--` before your arguments to pass them to the script.

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
    "pages": 5,                    # Optional: number of pages to scrape (default: 1)
    "images": true,                # Optional: download images (default: false)
    "output": "/custom/path",      # Optional: custom output path
    "imageOutput": "/custom/images" # Optional: custom image output path
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

> **Note**: The API options have been simplified to match the CLI options for consistency.

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