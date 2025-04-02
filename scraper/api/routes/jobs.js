/**
 * Jobs API Routes
 * Handles job creation, management, and result retrieval.
 */
const express = require('express');
const router = express.Router();
const jobModel = require('../models/job');
const queueManager = require('../models/queue');

/**
 * POST /api/jobs
 * Create a new scraping job
 */
router.post('/', async (req, res, next) => {
  try {
    const { url, options, priority, webhook } = req.body;
    
    // Create new job
    const job = await jobModel.createJob(url, options, priority, webhook);
    
    // Add job to processing queue
    queueManager.addJob(job.jobId);
    
    // Return job details with 202 Accepted status
    res.status(202).json(job);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/jobs
 * List all jobs with optional filtering
 */
router.get('/', (req, res, next) => {
  try {
    // Get query parameters
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get jobs with filters
    const result = jobModel.getJobs({ status }, limit, offset);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/jobs/:jobId
 * Get status and details of a specific job
 */
router.get('/:jobId', (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = jobModel.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        message: `Job with ID ${jobId} not found`,
        code: 'JOB_NOT_FOUND'
      });
    }
    
    res.json(job);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/jobs/:jobId
 * Cancel a job or delete its results
 */
router.delete('/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = jobModel.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        message: `Job with ID ${jobId} not found`,
        code: 'JOB_NOT_FOUND'
      });
    }
    
    // If job is pending or processing, try to cancel it
    if (job.status === jobModel.JobStatus.PENDING || 
        job.status === jobModel.JobStatus.PROCESSING) {
      queueManager.cancelJob(jobId);
    }
    
    // Delete the job and its results
    await jobModel.deleteJob(jobId);
    
    // Return 204 No Content
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/jobs/:jobId/results
 * Retrieve the results of a completed job
 */
router.get('/:jobId/results', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = jobModel.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        message: `Job with ID ${jobId} not found`,
        code: 'JOB_NOT_FOUND'
      });
    }
    
    // Check if job is completed
    if (job.status !== jobModel.JobStatus.COMPLETED) {
      return res.status(409).json({
        message: `Job with ID ${jobId} is not completed (status: ${job.status})`,
        code: 'JOB_NOT_COMPLETED'
      });
    }
    
    // Get job results
    const results = await jobModel.getResults(jobId);
    if (!results) {
      return res.status(404).json({
        message: `Results for job with ID ${jobId} not found`,
        code: 'RESULTS_NOT_FOUND'
      });
    }
    
    // Return job with results
    res.json({
      ...job,
      result: results
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 