# Integrating Prysm into Your Project

Prysm is a powerful, structure-aware web scraper that you can integrate into your projects in multiple ways. This guide explains how to use Prysm in your own applications.

## Installation

First, add Prysm to your project:

```bash
# Clone the repository
git clone https://github.com/pinkpixel-dev/prysm.git

# Install dependencies
cd prysm/scraper
npm install
```

## Integration Methods

There are three main ways to use Prysm in your projects:

### 1. Direct Module Import

Import Prysm directly into your Node.js code:

```javascript
const prysm = require('./path/to/prysm/scraper/main_scraper');

async function scrapeWebsite() {
  try {
    const result = await prysm('https://example.com', {
      maxScrolls: 5,
      bypassCloudflare: true,
      handlePagination: true,
      headless: true
    });
    
    console.log(`Title: ${result.title}`);
    console.log(`Content items: ${result.content.length}`);
    console.log(`Structure type: ${result.structureType}`);
    
    // Process the scraped data
    // ...
    
    return result;
  } catch (error) {
    console.error('Scraping error:', error);
  }
}

scrapeWebsite();
```

### 2. CLI Integration (via shell execution)

Execute Prysm's CLI from your application:

```javascript
const { exec } = require('child_process');
const path = require('path');

function scrapeUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const prysmPath = path.join(__dirname, 'path/to/prysm/scraper');
    
    // Build command with options
    let cmd = `cd ${prysmPath} && npm run start:cli "${url}"`;
    
    // Add options
    if (options.maxScrolls) cmd += ` --maxScrolls ${options.maxScrolls}`;
    if (options.noHeadless) cmd += ` --noHeadless`;
    if (options.output) cmd += ` --output "${options.output}"`;
    
    // Execute the command
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      // Parse the output to get the result file path
      const resultPathMatch = stdout.match(/Full results saved to:\s*([^\s]+)/);
      if (resultPathMatch && resultPathMatch[1]) {
        const resultPath = resultPathMatch[1];
        
        // Load the results JSON file
        const results = require(resultPath);
        resolve(results);
      } else {
        reject(new Error('Could not find result path in output'));
      }
    });
  });
}

// Usage
scrapeUrl('https://example.com', { maxScrolls: 10 })
  .then(results => console.log(results))
  .catch(err => console.error(err));
```

### 3. API Integration (RESTful)

Start the API server and communicate with it via HTTP:

```javascript
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

class PrysmAPI {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3001';
    this.apiProcess = null;
  }
  
  async startServer() {
    return new Promise((resolve, reject) => {
      const prysmPath = path.join(__dirname, 'path/to/prysm/scraper');
      
      this.apiProcess = spawn('npm', ['run', 'start:api'], {
        cwd: prysmPath,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      // Wait for server to start
      let output = '';
      this.apiProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Prysm API running at')) {
          const match = output.match(/http:\/\/localhost:(\d+)/);
          if (match) {
            this.baseUrl = `http://localhost:${match[1]}`;
            resolve(this.baseUrl);
          }
        }
      });
      
      this.apiProcess.stderr.on('data', (data) => {
        reject(new Error(`Server error: ${data.toString()}`));
      });
      
      // Timeout if server doesn't start
      setTimeout(() => {
        reject(new Error('API server failed to start within timeout'));
      }, 10000);
    });
  }
  
  async stopServer() {
    if (this.apiProcess) {
      this.apiProcess.kill();
      this.apiProcess = null;
    }
  }
  
  async createJob(url, options = {}) {
    const response = await axios.post(`${this.baseUrl}/api/jobs`, {
      url,
      options
    });
    return response.data;
  }
  
  async getJobStatus(jobId) {
    const response = await axios.get(`${this.baseUrl}/api/jobs/${jobId}`);
    return response.data;
  }
  
  async getJobResults(jobId) {
    const response = await axios.get(`${this.baseUrl}/api/jobs/${jobId}/results`);
    return response.data.result;
  }
  
  async pollUntilComplete(jobId, interval = 2000, timeout = 300000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.getJobStatus(jobId);
      
      if (status.status === 'completed') {
        return await this.getJobResults(jobId);
      } else if (status.status === 'failed') {
        throw new Error(`Job failed: ${status.error}`);
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Job timed out');
  }
}

// Usage
async function scrapeWithAPI() {
  const prysm = new PrysmAPI();
  
  try {
    await prysm.startServer();
    console.log('API server started');
    
    const job = await prysm.createJob('https://example.com', {
      maxScrolls: 5,
      bypassCloudflare: true
    });
    
    console.log(`Job created: ${job.jobId}`);
    
    // Wait for job to complete
    const results = await prysm.pollUntilComplete(job.jobId);
    console.log('Scraping results:', results);
    
    return results;
  } catch (error) {
    console.error('API error:', error);
  } finally {
    await prysm.stopServer();
  }
}

scrapeWithAPI();
```

## Practical Examples

### Example 1: Scrape Content and Save to Database

```javascript
const mongoose = require('mongoose');
const prysm = require('./path/to/prysm/scraper/main_scraper');

// Define a model for scraped content
const Article = mongoose.model('Article', {
  title: String,
  content: [String],
  url: String,
  scrapedAt: Date,
  structureType: String
});

async function scrapeAndStore(url) {
  // Connect to MongoDB
  await mongoose.connect('mongodb://localhost:27017/scraped_content');
  
  try {
    // Scrape the URL
    const result = await prysm(url, {
      maxScrolls: 10,
      bypassCloudflare: true
    });
    
    // Create a new article
    const article = new Article({
      title: result.title,
      content: result.content,
      url: url,
      scrapedAt: new Date(),
      structureType: result.structureType
    });
    
    // Save to database
    await article.save();
    console.log(`Saved article: ${result.title}`);
    
    return article;
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Usage
scrapeAndStore('https://example.com/article');
```

### Example 2: Bulk Scraping with Prysm API

```javascript
const fs = require('fs').promises;
const axios = require('axios');

async function bulkScrape(urlList, outDir) {
  // Start API server (using the PrysmAPI class from previous example)
  const prysm = new PrysmAPI();
  await prysm.startServer();
  
  try {
    await fs.mkdir(outDir, { recursive: true });
    
    // Create jobs for all URLs
    const jobs = [];
    for (const url of urlList) {
      const job = await prysm.createJob(url, {
        maxScrolls: 5,
        bypassCloudflare: true,
        handlePagination: true
      });
      jobs.push(job);
      console.log(`Created job ${job.jobId} for ${url}`);
    }
    
    // Wait for all jobs to complete
    const results = [];
    for (const job of jobs) {
      try {
        const result = await prysm.pollUntilComplete(job.jobId);
        results.push({ url: job.url, data: result });
        
        // Save to file
        const filename = new URL(job.url).hostname.replace(/[^a-z0-9]/g, '_');
        await fs.writeFile(
          `${outDir}/${filename}.json`,
          JSON.stringify(result, null, 2)
        );
        
        console.log(`Completed: ${job.url}`);
      } catch (err) {
        console.error(`Failed to scrape ${job.url}:`, err.message);
      }
    }
    
    return results;
  } finally {
    await prysm.stopServer();
  }
}

// Usage
const urlsToScrape = [
  'https://example.com/page1',
  'https://example.com/page2',
  'https://othersite.com/article'
];

bulkScrape(urlsToScrape, './scraped-data')
  .then(results => console.log(`Scraped ${results.length} pages`))
  .catch(err => console.error(err));
```

## Handling Scraped Data

Prysm's output format is consistent regardless of how you use it:

```javascript
{
  title: "Page Title",
  content: ["Paragraph 1", "Paragraph 2", ...],
  metadata: { /* page metadata */ },
  structureType: "article", // or "recipe", "product", etc.
  paginationType: "infinite", // pagination type detected
  extractionMethod: "ai", // extraction method used
  url: "https://example.com/page"
}
```

## Tips for Production Use

1. **Error Handling**: Always wrap Prysm calls in try/catch blocks
2. **Resource Management**: Consider adding timeouts and resource limits
3. **Caching**: Implement caching to avoid re-scraping the same URLs
4. **Rate Limiting**: Add delays between requests to avoid overloading target sites
5. **Respect robots.txt**: Check robots.txt before scraping
6. **Proxy Rotation**: For large-scale scraping, rotate proxies to avoid IP blocks

By following this guide, you should be able to integrate Prysm into your projects effectively and leverage its powerful scraping capabilities.

---

✨ Dream it, Pixel it | Made with ❤️ by Pink Pixel 