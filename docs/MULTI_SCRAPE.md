# 🔍 Multi-Page Scraping with Prysm

This document explains how to use Prysm's multi-page scraping feature to scrape multiple pages from a website by following links.

## Overview

The multi-scrape feature allows you to:

- Start scraping from a single URL
- Extract links from the page
- Follow links to find more content
- Automatically scrape each linked page
- Save results for all pages
- Generate a summary of all scraped content

## Basic Usage

```bash
npm run multi-scrape "https://example.com"
```

This will:
1. Scrape the initial URL
2. Find links on the page
3. Follow up to 5 links (default) on the same domain
4. Scrape each linked page
5. Save results to the `scraper/results/multi` directory

## Command-Line Options

### Core Options

| Option | Description | Default |
|--------|-------------|---------|
| `--pages <number>` | Maximum number of pages to scrape | 5 |
| `--followLinks` | Enable link following | true |
| `--noFollowLinks` | Disable link following | - |
| `--linkSelector <selector>` | CSS selector for links to follow | 'a' |
| `--allDomains` | Follow links to any domain | false (same domain only) |

### Scraping Options

| Option | Description | Default |
|--------|-------------|---------|
| `--maxScrolls <number>` | Maximum scroll attempts per page | 5 |
| `--scrollDelay <ms>` | Delay between scrolls in ms | 2000 |
| `--bypassCloudflare` | Enable Cloudflare bypass | true |
| `--noBypassCloudflare` | Disable Cloudflare bypass | - |
| `--handlePagination` | Enable auto pagination | true |
| `--noHandlePagination` | Disable auto pagination | - |
| `--paginationStrategy <strategy>` | Force pagination strategy (infinite/click/url) | null (auto) |
| `--headless` | Run in headless mode | true |
| `--noHeadless` | Run with browser visible | - |
| `--output <path>` | Custom output path for results | ./results/multi |

## Examples

### Scrape 10 Pages
```bash
npm run multi-scrape "https://example.com" --pages 10
```

### Scrape Only Article Links
```bash
npm run multi-scrape "https://example.com" --linkSelector ".article-link"
```

### Scrape Links Across Multiple Domains
```bash
npm run multi-scrape "https://example.com" --allDomains
```

### Custom Output Location
```bash
npm run multi-scrape "https://example.com" --output "./my-results/blog-scrape"
```

### Visible Browser (for debugging)
```bash
npm run multi-scrape "https://example.com" --noHeadless
```

## Results Format

The multi-scrape feature creates two types of files:

### 1. Individual Page Results

Each scraped page gets its own JSON file with:
- URL
- Scrape date and time
- Full scraping results (title, content, metadata, etc.)

```json
{
  "url": "https://example.com/page1",
  "scrapeDate": "2024-03-21T15:30:45.123Z",
  "result": {
    "title": "Page Title",
    "content": ["Paragraph 1", "Paragraph 2", ...],
    "metadata": { /* page metadata */ },
    "structureType": "article",
    "paginationType": "infinite",
    "extractionMethod": "ai",
    "url": "https://example.com/page1"
  }
}
```

### 2. Summary File

A summary file that lists all scraped pages with basic info:
- Starting URL
- Number of pages scraped
- Scrape date and time
- List of all pages with titles and structure types

```json
{
  "startUrl": "https://example.com",
  "pagesScraped": 5,
  "scrapeDate": "2024-03-21T15:35:12.456Z",
  "pages": [
    {
      "url": "https://example.com",
      "title": "Example Homepage",
      "structureType": "article",
      "contentItems": 15
    },
    {
      "url": "https://example.com/page1",
      "title": "Page 1",
      "structureType": "article",
      "contentItems": 8
    }
    // ...more pages
  ]
}
```

## How It Works

1. The scraper starts with the initial URL
2. It scrapes the page using the main Prysm scraper
3. It extracts all links on the page using the specified CSS selector
4. It filters links to match the same domain (unless `--allDomains` is used)
5. It adds new links to a queue, avoiding duplicates
6. It processes each URL in the queue until it reaches the page limit
7. For each page, it uses the main scraper with all specified options
8. All results are saved individually and summarized in one file

## Customizing Link Selection

By default, multi-scrape follows all links (`<a>` tags) on a page. You can customize this with the `--linkSelector` option:

```bash
# Only follow links in article containers
npm run multi-scrape "https://example.com" --linkSelector ".article-container a"

# Only follow links with specific classes
npm run multi-scrape "https://example.com" --linkSelector "a.read-more, a.next-page"

# Only follow links that contain specific text
npm run multi-scrape "https://example.com" --linkSelector "a:contains('Read more')"
```

## Programmatic Usage

You can also use the multi-scrape feature in your own code:

```javascript
const multiScrape = require('./scraper/multi_scrape');

async function scrapeWebsite() {
  const options = {
    pages: 10,
    followLinks: true,
    linkSelector: '.article-link',
    sameDomainOnly: true,
    maxScrolls: 5,
    output: './my-custom-output'
  };
  
  const results = await multiScrape('https://example.com', options);
  console.log(`Scraped ${results.length} pages`);
  
  // Process results
  for (const page of results) {
    console.log(`Page: ${page.url}`);
    console.log(`Title: ${page.result.title}`);
    console.log(`Content items: ${page.result.content.length}`);
  }
}

scrapeWebsite().catch(console.error);
```

---

✨ Dream it, Pixel it | Made with ❤️ by Pink Pixel 