# Implementing REST API with OpenAPI for Prysm

This document outlines our plan to add a REST API to the Prysm web scraper while maintaining complete compatibility with the existing functionality.

## 🎯 Goals

- Add a REST API interface to Prysm using OpenAPI specifications
- Preserve all existing functionality and CLI operations
- Enable remote clients to initiate and monitor scraping jobs
- Implement proper job queue management for concurrent scraping
- Provide comprehensive API documentation through OpenAPI

## 🏗️ API Architecture

### Express.js Server:
- Create a separate Express.js server for the API
- Implement OpenAPI for documentation and validation
- Utilize middleware for authentication, rate limiting, and error handling

### Core Endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs` | POST | Start a new scraping job |
| `/api/jobs` | GET | List all jobs (with filtering options) |
| `/api/jobs/:id` | GET | Get status and details of a specific job |
| `/api/jobs/:id/results` | GET | Retrieve the results of a completed job |
| `/api/jobs/:id` | DELETE | Cancel a job or delete its results |

### Job Queue System:
- Implement background processing with Bull/Redis
- Allow multiple concurrent scraping jobs
- Enable prioritization and scheduling
- Provide real-time status updates

## 🚀 Implementation Details

### Starting Scrape Jobs

```json
POST /api/jobs
{
  "url": "https://example.com/page-to-scrape",
  "options": {
    "maxScrolls": 5,
    "useResourceBlocker": true,
    "bypassCloudflare": true,
    "paginationStrategy": "infinite"
  },
  "priority": 1,
  "webhook": "https://myapp.com/notify"
}
```

### Job Processing
- Jobs are processed asynchronously in the background
- Each job creates an isolated browser instance
- Progress updates are stored in real-time
- Results are saved to a persistent storage upon completion

### Retrieving Results

```json
GET /api/jobs/job-123/results
{
  "jobId": "job-123",
  "status": "completed",
  "createdAt": "2023-04-02T12:00:00Z",
  "completedAt": "2023-04-02T12:01:45Z",
  "result": {
    "title": "Example Page",
    "content": ["Content paragraph 1", "Content paragraph 2"],
    "metadata": { ... },
    "structureType": "article",
    "paginationType": "infinite"
  }
}
```

## 🔧 Advanced Features

### Authentication & Authorization:
- Implement JWT-based authentication
- API key support for service-to-service communication
- Role-based access control for different operations
- Rate limiting per API key/user

### Rate Limiting:
- Implement per-client rate limiting
- Set up tiered usage limits based on authentication
- Queue jobs when rate limits are exceeded instead of rejecting

### Webhook Notifications:
- Send notifications when jobs complete or fail
- Include basic job statistics and result summary
- Support customizable payload formats
- Implement retry logic for failed webhook deliveries

### Job Control & Configuration:
- Expose pagination control
- Allow resource blocking configuration
- Set extraction type priorities
- Provide timeouts and cancellation options

### Results Storage:
- Store in MongoDB/Redis for flexibility
- Implement TTL for automatic cleanup
- Allow result filtering/transformation
- Support various export formats (JSON, CSV, etc.)

## 🧩 OpenAPI Implementation

### OpenAPI Specification Example

```yaml
openapi: 3.0.0
info:
  title: Prysm Scraper API
  version: 1.0.0
  description: API for the Prysm structure-aware web scraper
paths:
  /api/jobs:
    post:
      summary: Create a new scraping job
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                url:
                  type: string
                  format: uri
                options:
                  type: object
      responses:
        '202':
          description: Job accepted
          content:
            application/json:
              schema:
                type: object
                properties:
                  jobId:
                    type: string
  /api/jobs/{jobId}:
    get:
      summary: Get job status
      parameters:
        - name: jobId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Job details
```

### Express Server with OpenAPI Integration

```javascript
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { OpenApiValidator } = require('express-openapi-validator');
const yaml = require('js-yaml');
const fs = require('fs');

const app = express();
const apiSpec = yaml.load(fs.readFileSync('./openapi.yaml', 'utf8'));

// Middleware
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiSpec));

// OpenAPI validation
app.use(
  OpenApiValidator.middleware({
    apiSpec,
    validateRequests: true,
    validateResponses: true,
  })
);

// API routes
app.use('/api/jobs', require('./routes/jobs'));

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Prysm API running at http://localhost:${port}`);
});
```

## 📦 Preserving Current Functionality

To ensure the API doesn't interfere with existing functionality:

### Separate Entry Points:
- CLI continues using test_scraper.js
- API uses api/server.js

### New Scripts in package.json:

```json
"scripts": {
  "test": "jest",
  "start:api": "node scraper/api/server.js",
  "start:cli": "node scraper/main_scraper.js",
  "scrape": "node scraper/main_scraper.js"
}
```

### Optional API Dependencies:

```json
"optionalDependencies": {
  "express": "^4.21.2",
  "swagger-ui-express": "^4.6.2",
  "express-openapi-validator": "^5.0.3",
  "bull": "^4.10.4",
  "redis": "^4.6.6"
}
```

## 🛠️ Implementation Approach

1. Create the API structure without modifying existing files
2. Reuse the existing mainScraper function for actual scraping
3. Add request validation through OpenAPI specification
4. Implement a job queue for background processing (optional)
5. Handle results storage separately from the main scraper

This approach ensures:
- Complete separation of concerns
- Zero impact on existing functionality
- The ability to run both CLI and API versions concurrently
- Proper API documentation through OpenAPI

## 📆 Next Steps

1. Set up the basic Express server with OpenAPI integration
2. Create the OpenAPI specification document
3. Implement the core job endpoints
4. Add the job queue system
5. Implement the results storage
6. Add authentication and rate limiting
7. Test the API with various scraping scenarios 

## Implementation Strategy

### Phase 1: API Server Setup
// ... existing code ...

### Phase 2: Job Management
// ... existing code ...

### Phase 3: Front-end Integration & CLI
- API documentation with Swagger UI
- Simple API test client 
- CLI uses main_scraper.js as both the scraper and CLI interface

### Package.json Update
```json
"scripts": {
  "test": "jest",
  "start:api": "node scraper/api/server.js",
  "start:cli": "node scraper/main_scraper.js",
  "scrape": "node scraper/main_scraper.js"
}
```

// ... rest of file ... 