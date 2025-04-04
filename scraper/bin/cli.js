#!/usr/bin/env node

/**
 * Prysm Scraper CLI
 * 
 * This script provides a user-friendly CLI for the Prysm scraper.
 * It properly handles command line arguments and passes them to the main scraper.
 */

const path = require('path');
const { mainScraper } = require('../main_scraper');
const chalk = require('chalk');

// Get command line arguments (skip 'node' and the script name)
const args = process.argv.slice(2);

// Generate banner
function generateBanner() {
  console.log(`
   ██████╗ ██████╗ ██╗   ██╗███████╗███╗   ███╗
   ██╔══██╗██╔══██╗╚██╗ ██╔╝██╔════╝████╗ ████║
   ██████╔╝██████╔╝ ╚████╔╝ ███████╗██╔████╔██║
   ██╔═══╝ ██╔══██╗  ╚██╔╝  ╚════██║██║╚██╔╝██║
   ██║     ██║  ██║   ██║   ███████║██║ ╚═╝ ██║
   ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝     ╚═╝

   ✨ Structure-Aware Web Scraper
  `);
}

// Show help and exit
function showHelp() {
  generateBanner();
  console.log(`
${chalk.cyanBright('Usage:')} ${chalk.greenBright('npx prysm-scrape')} ${chalk.yellowBright('[url]')} ${chalk.blueBright('[options]')}
  ${chalk.whiteBright('or')}
${chalk.cyanBright('Usage:')} ${chalk.greenBright('npm run scrape')} ${chalk.yellowBright('-- [url]')} ${chalk.blueBright('[options]')}

${chalk.whiteBright('Options:')}
  ${chalk.yellowBright('--pages <number>')}          Number of links to follow from initial URL (default: 1)
  ${chalk.yellowBright('--images')}                  Download images from the page
  ${chalk.yellowBright('--output <path>')}           Custom output path for results (default: ~/prysm/output)
  ${chalk.yellowBright('--image-output <path>')}     Custom output path for images (default: ~/prysm/output/images)
  ${chalk.yellowBright('--help')}                    Show this help message

${chalk.whiteBright('Examples:')}
  ${chalk.greenBright('npm run scrape -- "https://example.com"')}
  ${chalk.greenBright('npm run scrape -- "https://example.com" --pages 5')}
  ${chalk.greenBright('npm run scrape -- "https://example.com" --images')}
  ${chalk.greenBright('npm run scrape -- "https://example.com" --output "/custom/path"')}
  ${chalk.greenBright('npx prysm-scrape "https://example.com" --image-output "/custom/images"')}
`);
  process.exit(0);
}

// Check if help is needed or no URL is provided
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
}

// Check if the first arg looks like a URL
const firstArg = args[0];
if (!firstArg.startsWith('http://') && !firstArg.startsWith('https://')) {
  console.error(chalk.redBright('Error: The first argument must be a valid URL starting with http:// or https://'));
  showHelp();
}

// Execute the main scraper with all arguments
try {
  // Import and run the main scraper module
  const mainScraperPath = path.resolve(__dirname, '../main_scraper.js');
  const mainScraper = require(mainScraperPath);
  
  // If mainScraper exports a function directly
  if (typeof mainScraper === 'function') {
    mainScraper(args);
  } 
  // If mainScraper exports an object with a main function
  else if (typeof mainScraper.main === 'function') {
    mainScraper.main(args);
  }
  // If mainScraper uses its own argument parsing
  else {
    // Just requiring the file should be enough as it should
    // parse process.argv internally
  }
} catch (error) {
  console.error(chalk.redBright(`Error: ${error.message}`));
  process.exit(1);
} 