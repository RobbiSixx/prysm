#!/usr/bin/env node

/**
 * Simple helper script for Prysm scraper
 * 
 * This script forwards all arguments to the main scraper
 * and provides a more intuitive way to run the scraper.
 */

// Just a wrapper around main_scraper.js to make the command more intuitive
const mainScraper = require('./main_scraper');
const args = process.argv.slice(2);

// Check if help is needed
if (args.length === 0 || args.includes('--help')) {
  console.log(`
🔍 Prysm - Structure-Aware Web Scraper

Usage: node scrape.js [url] [options]

Options:
  --maxScrolls <number>    Maximum scroll attempts (default: 100)
  --scrollDelay <ms>       Delay between scrolls in ms (default: 2000)
  --headless               Run in headless mode (default: true)
  --noHeadless             Run with browser visible
  --output <path>          Custom output path for results
  --help                   Show this help message

Examples:
  node scrape.js "https://example.com"
  node scrape.js "https://example.com" --maxScrolls 10 --noHeadless
  `);
  process.exit(0);
}

// Pass all arguments to the main scraper 