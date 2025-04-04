/**
 * Prysm REST API Server
 * This server provides a REST API for the Prysm web scraper.
 */
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const OpenApiValidator = require('express-openapi-validator');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Import routes
const jobsRouter = require('./routes/jobs');

// Initialize express app
const app = express();
const BASE_PORT = process.env.PORT || 3000;

// Function to find an available port
const findAvailablePort = async (startPort) => {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      await new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
          server.close(resolve);
        });
        server.on('error', reject);
      });
      return port;
    } catch (err) {
      if (err.code !== 'EADDRINUSE') throw err;
    }
  }
  throw new Error('No available ports found');
};

// Load OpenAPI specification
const apiSpecPath = path.join(__dirname, 'openapi.yaml');
const apiSpec = yaml.load(fs.readFileSync(apiSpecPath, 'utf8'));

// Middleware
app.use(express.json());
app.use(cors());

// API Documentation using Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiSpec));

// Static file serving for Swagger UI
app.use('/api-spec', express.static(apiSpecPath));

// OpenAPI validation
app.use(
  OpenApiValidator.middleware({
    apiSpec: apiSpec,
    validateRequests: true,
    validateResponses: false, // Set to true for production
    validateSecurity: false,
    validateFormats: false
  })
);

// Routes
app.use('/api/jobs', jobsRouter);

// API root endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Prysm API',
    version: '1.0.0',
    documentation: `${req.protocol}://${req.get('host')}/api-docs`
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  // Format error
  res.status(err.status || 500).json({
    message: err.message,
    code: err.code || 'INTERNAL_ERROR',
    details: err.errors || {}
  });
});

// Start server
if (require.main === module) {
  findAvailablePort(BASE_PORT)
    .then(port => {
      app.listen(port, () => {
        console.log(`
   ██████╗ ██████╗ ██╗   ██╗███████╗███╗   ███╗
   ██╔══██╗██╔══██╗╚██╗ ██╔╝██╔════╝████╗ ████║
   ██████╔╝██████╔╝ ╚████╔╝ ███████╗██╔████╔██║
   ██╔═══╝ ██╔══██╗  ╚██╔╝  ╚════██║██║╚██╔╝██║
   ██║     ██║  ██║   ██║   ███████║██║ ╚═╝ ██║
   ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝     ╚═╝
        `);
        console.log(`✨ Prysm API running at http://localhost:${port}`);
        console.log(`📚 API Documentation available at http://localhost:${port}/api-docs`);
        console.log(`\n📋 Supported API options:`);
        console.log(`  • pages - Number of pages to scrape`);
        console.log(`  • images - Whether to download images`);
        console.log(`  • output - Custom output path for results`);
        console.log(`  • imageOutput - Custom output path for images`);
      });
    })
    .catch(err => {
      console.error('Failed to find an available port:', err);
      process.exit(1);
    });
}

module.exports = app; 