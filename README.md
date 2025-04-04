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