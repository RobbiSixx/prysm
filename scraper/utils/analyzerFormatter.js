/**
 * analyzerFormatter.js - Formats analyzer results for CLI output
 */

const chalk = require('chalk');

/**
 * Formats analysis results for CLI display
 * @param {Object} analysisResult - The analysis result from analyzeSite
 * @param {Object} options - Formatting options
 * @returns {String} Formatted analysis for display
 */
function formatAnalysisResult(analysisResult, options = {}) {
  if (!analysisResult) {
    return chalk.red('❌ No analysis results available');
  }
  
  if (analysisResult.error) {
    return chalk.red(`❌ Analysis error: ${analysisResult.error}`);
  }
  
  const {
    url,
    timestamp,
    metadata,
    contentType,
    structure,
    pagination,
    infiniteScroll,
    pageSize,
    recommendedStrategy
  } = analysisResult;
  
  // Build header
  let output = '\n';
  output += chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  output += chalk.cyan.bold('📊 Smart Scan Analysis Results\n');
  output += chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
  
  // Page info
  output += chalk.white.bold('📄 Page Information\n');
  output += chalk.gray('────────────────────────────────────────────────────────────\n');
  output += chalk.white('URL: ') + chalk.yellow(url) + '\n';
  output += chalk.white('Title: ') + chalk.yellow(metadata?.title || 'Unknown') + '\n';
  output += chalk.white('Analyzed: ') + chalk.yellow(new Date(timestamp).toLocaleString()) + '\n';
  output += chalk.white('Size: ') + chalk.yellow(`${formatNumber(pageSize?.totalElements)} elements, ${formatSize(pageSize?.contentLength)} content`) + '\n';
  output += '\n';
  
  // Content type detection
  output += chalk.white.bold('🔍 Content Type Detection\n');
  output += chalk.gray('────────────────────────────────────────────────────────────\n');
  
  const primaryTypeColor = getTypeColor(contentType?.primaryType);
  
  output += chalk.white('Primary Type: ') + primaryTypeColor.bold(contentType?.primaryType || 'Unknown') + '\n';
  output += chalk.white('Secondary Type: ') + getTypeColor(contentType?.secondaryType)(contentType?.secondaryType || 'None') + '\n';
  
  if (contentType?.scores) {
    output += chalk.white('Type Scores: ');
    const scores = Object.entries(contentType.scores)
      .sort((a, b) => b[1] - a[1])
      .map(([type, score]) => {
        return getTypeColor(type)(`${type}: ${score}`);
      })
      .join(', ');
    
    output += scores + '\n';
  }
  output += '\n';
  
  // Structure information
  output += chalk.white.bold('🏗️ Page Structure\n');
  output += chalk.gray('────────────────────────────────────────────────────────────\n');
  
  if (structure?.elements) {
    const structureItems = [];
    
    if (structure.elements.hasArticleElement) structureItems.push(chalk.green('article'));
    if (structure.elements.hasMainElement) structureItems.push(chalk.green('main'));
    if (structure.elements.hasSidebar) structureItems.push(chalk.yellow('sidebar'));
    if (structure.elements.hasMultipleColumns) structureItems.push(chalk.blue('multi-column'));
    if (structure.elements.hasHeader) structureItems.push(chalk.cyan('header'));
    if (structure.elements.hasFooter) structureItems.push(chalk.cyan('footer'));
    if (structure.elements.hasNav) structureItems.push(chalk.magenta('navigation'));
    if (structure.elements.hasForms) structureItems.push(chalk.red('forms'));
    
    output += chalk.white('Elements: ') + structureItems.join(', ') + '\n';
    
    output += chalk.white('Headings: ') + 
      chalk.red(`H1: ${structure.counts.h1}`) + ', ' +
      chalk.yellow(`H2: ${structure.counts.h2}`) + ', ' +
      chalk.green(`H3: ${structure.counts.h3}`) + '\n';
    
    output += chalk.white('Metrics: ') + 
      chalk.blue(`${structure.metrics.textDensity.toFixed(2)} text density`) + ', ' +
      chalk.magenta(`${structure.metrics.imagePercentage.toFixed(1)}% images`) + '\n';
  }
  
  output += '\n';
  
  // Pagination information
  output += chalk.white.bold('📄 Pagination\n');
  output += chalk.gray('────────────────────────────────────────────────────────────\n');
  
  if (pagination) {
    const paginationDetected = pagination.detected ? 
      chalk.green('✓ Detected') : chalk.red('✗ Not detected');
    
    output += chalk.white('Status: ') + paginationDetected + '\n';
    
    if (pagination.detected) {
      output += chalk.white('Type: ') + chalk.yellow(pagination.primaryType) + '\n';
      
      if (pagination.selectors) {
        if (pagination.selectors.nextLink) {
          output += chalk.white('Next Link: ') + chalk.green(pagination.selectors.nextLink) + '\n';
        }
        
        if (pagination.selectors.loadMoreButton) {
          output += chalk.white('Load More: ') + chalk.green(pagination.selectors.loadMoreButton) + '\n';
        }
      }
    }
  }
  
  // Infinite scroll information
  if (infiniteScroll) {
    const infiniteScrollDetected = infiniteScroll.detected ? 
      chalk.green(`✓ Detected (${infiniteScroll.confidence}/10 confidence)`) : 
      chalk.red('✗ Not detected');
    
    output += chalk.white('Infinite Scroll: ') + infiniteScrollDetected + '\n';
    
    if (infiniteScroll.detected) {
      const features = [];
      
      if (infiniteScroll.heightChangedAfterScroll) {
        features.push(chalk.yellow(`Height changed by ${infiniteScroll.heightDelta}px`));
      }
      
      if (infiniteScroll.loadingIndicators.detected) {
        features.push(chalk.magenta(`Loading indicators found (${infiniteScroll.loadingIndicators.count})`));
      }
      
      if (infiniteScroll.lazyLoading.detected) {
        features.push(chalk.blue(`Lazy-loaded images (${infiniteScroll.lazyLoading.imageCount}/${infiniteScroll.lazyLoading.totalImages})`));
      }
      
      if (features.length > 0) {
        output += chalk.white('Features: ') + features.join(', ') + '\n';
      }
    }
  }
  
  output += '\n';
  
  // Recommended strategy
  output += chalk.white.bold('🚀 Recommended Strategy\n');
  output += chalk.gray('────────────────────────────────────────────────────────────\n');
  
  if (recommendedStrategy) {
    const profileColor = {
      speed: chalk.red,
      balanced: chalk.blue,
      thorough: chalk.green
    }[recommendedStrategy.profile] || chalk.white;
    
    output += chalk.white('Profile: ') + profileColor.bold(recommendedStrategy.profile) + '\n';
    
    if (recommendedStrategy.paginationStrategy) {
      output += chalk.white('Pagination: ') + chalk.yellow(recommendedStrategy.paginationStrategy);
      
      if (recommendedStrategy.clickSelector) {
        output += chalk.gray(` (${recommendedStrategy.clickSelector})`);
      }
      
      output += '\n';
    }
    
    output += chalk.white('Scrolling: ') + 
      chalk.blue(`${recommendedStrategy.scrollStrategy} with `) + 
      chalk.yellow(`${recommendedStrategy.maxScrolls} max scrolls`) + 
      chalk.gray(` (${recommendedStrategy.scrollDelay}ms delay)`) + '\n';
    
    if (recommendedStrategy.contentExtraction?.length > 0) {
      output += chalk.white('Focus Extractors: ') + 
        recommendedStrategy.contentExtraction.map(e => chalk.green(e)).join(', ') + '\n';
    }
    
    if (recommendedStrategy.skipExtractors?.length > 0) {
      output += chalk.white('Skip Extractors: ') + 
        recommendedStrategy.skipExtractors.map(e => chalk.red(e)).join(', ') + '\n';
    }
  }
  
  output += '\n';
  output += chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return output;
}

/**
 * Get a color function for content type
 */
function getTypeColor(type) {
  const colors = {
    article: chalk.blue,
    product: chalk.green,
    listing: chalk.magenta,
    documentation: chalk.cyan,
    recipe: chalk.yellow,
    unknown: chalk.gray
  };
  
  return colors[type] || chalk.white;
}

/**
 * Format a number with commas
 */
function formatNumber(num) {
  if (num === undefined || num === null) return 'Unknown';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format a content size in a human-readable format
 */
function formatSize(bytes) {
  if (bytes === undefined || bytes === null) return 'Unknown';
  
  if (bytes < 1024) return `${bytes} bytes`;
  
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

module.exports = {
  formatAnalysisResult
}; 