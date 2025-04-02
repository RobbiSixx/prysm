/**
 * Simple Job Queue Manager
 * Manages the processing of scraping jobs in a queue.
 */
const jobModel = require('./job');
const mainScraper = require('../../main_scraper');
const path = require('path');
const axios = require('axios').default;

// Queue state
const queue = [];
let isProcessing = false;
const MAX_CONCURRENT_JOBS = 1; // Limit concurrent jobs (can be adjusted)
const activeJobs = new Set();

/**
 * Add a job to the processing queue
 * @param {string} jobId - Job identifier
 * @returns {boolean} - Whether the job was successfully added
 */
function addJob(jobId) {
  // Check if job exists
  const job = jobModel.getJob(jobId);
  if (!job) return false;
  
  // Add job to queue
  queue.push({
    jobId,
    priority: job.priority || 5
  });
  
  // Sort queue by priority (lower number = higher priority)
  queue.sort((a, b) => a.priority - b.priority);
  
  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
  
  return true;
}

/**
 * Process jobs in the queue
 */
async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  
  isProcessing = true;
  
  try {
    // Process jobs while there are items in the queue and slots available
    while (queue.length > 0 && activeJobs.size < MAX_CONCURRENT_JOBS) {
      const { jobId } = queue.shift();
      
      // Skip if job no longer exists
      const job = jobModel.getJob(jobId);
      if (!job) continue;
      
      // Process job in background
      activeJobs.add(jobId);
      processJob(jobId).finally(() => {
        activeJobs.delete(jobId);
      });
    }
  } finally {
    isProcessing = false;
    
    // If there are still jobs and available slots, continue processing
    if (queue.length > 0 && activeJobs.size < MAX_CONCURRENT_JOBS) {
      processQueue();
    }
  }
}

/**
 * Process a single job
 * @param {string} jobId - Job identifier
 */
async function processJob(jobId) {
  const job = jobModel.getJob(jobId);
  if (!job) return;
  
  // Update job status to processing
  jobModel.updateJob(jobId, {
    status: jobModel.JobStatus.PROCESSING,
    progress: 5
  });
  
  try {
    console.log(`🚀 Processing job ${jobId}: ${job.url}`);
    
    // Execute the scraper
    const results = await mainScraper(job.url, job.options || {});
    
    // Update job status to completed
    jobModel.updateJob(jobId, {
      status: jobModel.JobStatus.COMPLETED,
      progress: 100
    });
    
    // Store results
    await jobModel.storeResults(jobId, results);
    
    // Send webhook notification if configured
    if (job.webhook) {
      try {
        await sendWebhook(job, results);
      } catch (webhookError) {
        console.error(`Error sending webhook for job ${jobId}:`, webhookError);
      }
    }
    
    console.log(`✅ Completed job ${jobId}`);
    return results;
  } catch (error) {
    console.error(`❌ Error processing job ${jobId}:`, error);
    
    // Update job status to failed
    jobModel.updateJob(jobId, {
      status: jobModel.JobStatus.FAILED,
      error: error.message || 'Unknown error',
      progress: 0
    });
    
    // Send webhook notification for failure if configured
    if (job.webhook) {
      try {
        await sendWebhook(job, null, error);
      } catch (webhookError) {
        console.error(`Error sending webhook for job ${jobId}:`, webhookError);
      }
    }
    
    throw error;
  }
}

/**
 * Send webhook notification for job completion or failure
 * @param {object} job - Job object
 * @param {object|null} results - Job results (null if job failed)
 * @param {Error|null} error - Error object if job failed
 */
async function sendWebhook(job, results, error = null) {
  if (!job.webhook) return;
  
  const payload = {
    jobId: job.jobId,
    status: job.status,
    url: job.url,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    error: error ? error.message : job.error
  };
  
  // Include result summary if available
  if (results) {
    payload.resultSummary = {
      title: results.title,
      contentLength: results.content.length,
      structureType: results.structureType,
      paginationType: results.paginationType
    };
  }
  
  // Send webhook notification
  try {
    await axios.post(job.webhook, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Prysm-Scraper-API/1.0'
      },
      timeout: 10000 // 10 second timeout
    });
    console.log(`📨 Webhook sent for job ${job.jobId}`);
  } catch (error) {
    console.error(`⚠️ Webhook delivery failed for job ${job.jobId}:`, error.message);
    throw error;
  }
}

/**
 * Cancel a job in the queue
 * @param {string} jobId - Job identifier
 * @returns {boolean} - Whether the job was cancelled successfully
 */
function cancelJob(jobId) {
  // Remove job from queue if it's still there
  const queueIndex = queue.findIndex(item => item.jobId === jobId);
  if (queueIndex !== -1) {
    queue.splice(queueIndex, 1);
    
    // Update job status
    jobModel.updateJob(jobId, {
      status: jobModel.JobStatus.CANCELLED
    });
    
    return true;
  }
  
  // Check if job is active (already processing)
  if (activeJobs.has(jobId)) {
    // We can't stop an active job easily, but we can mark it as cancelled
    jobModel.updateJob(jobId, {
      status: jobModel.JobStatus.CANCELLED
    });
    
    return true;
  }
  
  return false;
}

/**
 * Get queue status
 * @returns {object} - Queue status information
 */
function getQueueStatus() {
  return {
    waiting: queue.length,
    active: activeJobs.size,
    isProcessing
  };
}

module.exports = {
  addJob,
  cancelJob,
  getQueueStatus
}; 