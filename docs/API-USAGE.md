# 🌐 Prysm API Usage Guide

This document explains how to use the Prysm REST API for web scraping.

## Starting the API Server

```bash
npm run start:api
```

The API server automatically finds an available port (defaults to 3000 if available). If port 3000 is in use, it will try 3001, 3002, etc.

When the server starts, you'll see output like:

```
✨ Prysm API running at http://localhost:3001
📚 API Documentation available at http://localhost:3001/api-docs
```

## API Documentation

Full interactive documentation is available at `/api-docs` when the server is running:

```
http://localhost:3001/api-docs
```

## Available Endpoints

### 1. Create a Scraping Job

```
POST /api/jobs
```

Request body:

```json
{
  "url": "https://example.com/page-to-scrape",
  "options": {
    "maxScrolls": 5,
    "scrollDelay": 2000,
    "bypassCloudflare": true,
    "handlePagination": true,
    "paginationStrategy": "infinite",
    "headless": true,
    "analyze": false,
    "skipAnalysis": false,
    "focused": false,
    "standard": true,
    "deep": false,
    "article": false,
    "product": false,
    "listing": false
  },
  "priority": 5,
  "webhook": "https://your-webhook-url.com/callback"
}
```

**Parameters:**

- `url` (required): URL to scrape
- `options`: Configuration options
  - `maxScrolls`: Maximum scroll attempts (default: 5)
  - `scrollDelay`: Delay between scrolls in ms (default: 2000)
  - `bypassCloudflare`: Whether to attempt to bypass Cloudflare (default: true) 
  - `handlePagination`: Whether to automatically handle pagination (default: true)
  - `paginationStrategy`: Force a specific pagination strategy (infinite/click/url)
  - `headless`: Whether to run Puppeteer in headless mode (default: true)
  - **Smart Scan Options:**
    - `analyze`: Run analysis only without scraping (analyze-only mode)
    - `skipAnalysis`: Disable Smart Scan analysis (analysis is enabled by default)
    - `focused`: Optimize for speed with fewer scrolls (default: false)
    - `standard`: Use balanced approach (default: true)
    - `deep`: Maximum extraction, slower but thorough (default: false)
    - `article`: Optimize for articles and blog posts (default: false)
    - `product`: Optimize for product pages (default: false)
    - `listing`: Optimize for product listings (default: false)
- `priority`: Job priority (1 = highest, 10 = lowest, default: 5)
- `webhook`: URL to receive notifications when job completes (optional)

**Example using curl:**

```bash
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/page-to-scrape",
    "options": {
      "maxScrolls": 5,
      "bypassCloudflare": true
    }
  }'
```

**Response:**

```json
{
  "jobId": "job_xyz123",
  "status": "pending",
  "url": "https://example.com/page-to-scrape",
  "createdAt": "2024-03-20T10:30:00Z"
}
```

### 2. Check Job Status

```
GET /api/jobs/{jobId}
```

**Example:**

```bash
curl http://localhost:3001/api/jobs/job_xyz123
```

**Response:**

```json
{
  "jobId": "job_xyz123",
  "status": "completed",
  "url": "https://example.com/page-to-scrape",
  "createdAt": "2024-03-20T10:30:00Z",
  "completedAt": "2024-03-20T10:31:00Z",
  "progress": 100
}
```

### 3. Get Job Results

```
GET /api/jobs/{jobId}/results
```

**Example:**

```bash
curl http://localhost:3001/api/jobs/job_xyz123/results
```

**Response:**

```json
{
  "jobId": "job_xyz123",
  "status": "completed",
  "result": {
    "title": "Page Title",
    "content": ["..."],
    "metadata": {},
    "structureType": "article",
    "paginationType": "infinite",
    "extractionMethod": "ai"
  }
}
```

### 4. List All Jobs

```
GET /api/jobs
```

**Query Parameters:**

- `status`: Filter by job status (pending/processing/completed/failed/cancelled)
- `limit`: Maximum number of jobs to return (default: 20)
- `offset`: Offset for pagination (default: 0)

**Example:**

```bash
curl http://localhost:3001/api/jobs?status=completed&limit=20&offset=0
```

**Response:**

```json
{
  "jobs": [
    {
      "jobId": "job_xyz123",
      "status": "completed",
      "url": "https://example.com/page-to-scrape",
      "createdAt": "2024-03-20T10:30:00Z"
    },
    // ...
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

### 5. Cancel/Delete Job

```
DELETE /api/jobs/{jobId}
```

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/jobs/job_xyz123
```

## Working with Results

All API job results are saved in the `results/api` folder. Each job gets its own JSON file named with the job ID.

## Error Handling

The API returns appropriate HTTP status codes and error messages for different scenarios:

- `400 Bad Request`: Invalid parameters or request body
- `404 Not Found`: Job or results not found
- `409 Conflict`: Job not completed yet when requesting results
- `429 Too Many Requests`: Rate limit exceeded

Example error response:

```json
{
  "message": "Job with ID job_xyz123 not found",
  "code": "JOB_NOT_FOUND",
  "details": {}
}
```

## Webhook Notifications

If you provide a webhook URL when creating a job, Prysm will send a POST request to that URL when the job completes or fails:

```json
{
  "jobId": "job_xyz123",
  "status": "completed",
  "url": "https://example.com/page-to-scrape",
  "completedAt": "2024-03-20T10:31:00Z",
  "resultUrl": "http://localhost:3001/api/jobs/job_xyz123/results"
}
```

## Rate Limiting

The API is rate-limited to prevent abuse. If you exceed the rate limit, you'll receive a 429 response. 