// test_simple_scraper.js - Test our simplified scraper on various websites
const fs = require('fs').promises;
const path = require('path');
const mainScraper = require('./main_scraper');

// Get command line arguments
const args = process.argv.slice(2);
const MODE = args[0] || 'all'; // 'all', 'quick', 'recipe', 'article', etc.
const MAX_SITES = args[1] ? parseInt(args[1], 10) : 100; // Maximum number of sites to test

// Output directory
const OUTPUT_DIR = path.join(__dirname, 'main_results');

// Create a comprehensive test suite combining sites from various categories
const ALL_TEST_SITES = [
  // Recipe Sites
  {
    name: 'AllRecipes',
    url: 'https://www.allrecipes.com/recipe/256618/cubanelle-and-veal-bolognese/',
    category: 'recipe'
  },
  {
    name: '101 Cookbooks',
    url: 'https://www.101cookbooks.com/',
    category: 'recipe'
  },
  {
    name: 'Smitten Kitchen',
    url: 'https://smittenkitchen.com/',
    category: 'recipe'
  },
  {
    name: 'Serious Eats',
    url: 'https://www.seriouseats.com/classic-panzanella-salad-recipe',
    category: 'recipe'
  },
  {
    name: 'Food Network',
    url: 'https://www.foodnetwork.com/recipes/food-network-kitchen/instant-pot-barbecue-pulled-pork-sandwiches-8306825',
    category: 'recipe'
  },
  {
    name: 'BBC Good Food',
    url: 'https://www.bbcgoodfood.com/recipes/easy-chocolate-cake',
    category: 'recipe'
  },
  
  // Blog/Article Sites
  {
    name: 'Medium Article',
    url: 'https://medium.com/blog/what-i-wish-i-knew-navigating-the-geography-of-a-creative-life-requires-a-compass-not-a-map-b7f10afdbd6a',
    category: 'article'
  },
  {
    name: 'WordPress Blog',
    url: 'https://citizenwells.com/2022/02/20/everyone-is-at-risk-for-blood-clots-cdc-and-pfizer-try-to-normalize-diffuse-widespread-stories-of-athletes-collapsing-and-dying-after-covid-jabs-athletes-collapsing-on-field-are/',
    category: 'blog'
  },
  
  // News Sites
  {
    name: 'BBC News',
    url: 'https://www.bbc.com/news/articles/c0m90jjewd7o',
    category: 'news'
  },
  
  // Technical Sites
  {
    name: 'Stack Overflow',
    url: 'https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster-than-processing-an-unsorted-array',
    category: 'technical'
  },
  {
    name: 'GitHub Readme',
    url: 'https://github.com/puppeteer/puppeteer',
    category: 'technical'
  },
  
  // Documentation Sites
  {
    name: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
    category: 'documentation'
  },
  
  // Wiki Sites
  {
    name: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
    category: 'wiki'
  },
  
  // Product Sites
  {
    name: 'macys',
    url: 'https://www.macys.com/shop/product/franco-sarto-womens-marlina-fisherman-pointed-toe-kitten-heel-mules?ID=19490453',
    category: 'product'
  },
  
  // Travel Sites
  {
    name: 'Lonely Planet',
    url: 'https://www.lonelyplanet.com/articles/best-places-to-visit-in-japan',
    category: 'travel'
  },
  {
    name: 'TripAdvisor',
    url: 'https://www.tripadvisor.com/Tourism-g60763-New_York_City_New_York-Vacations.html',
    category: 'travel'
  },
  
  // Challenging Sites - Additional Tests
  {
    name: 'Blogger',
    url: 'https://althouse.blogspot.com/2025/04/would-american-public-stand-for-it-it.html',
    category: 'blog'
  },
  {
    name: 'Wix Site',
    url: 'https://robmensching.com/blog/',
    category: 'blog'
  },
  {
    name: 'Amazon Product',
    url: 'https://www.amazon.com/Paris-Hydrating-Dehydrated-Hyaluronic-Paraben-Free/dp/B0BCR23QDG',
    category: 'ecommerce'
  },
  {
    name: 'Substack',
    url: 'https://substack.com/browse/staff-picks/post/150741708',
    category: 'newsletter'
  }
];

// Define preset test configurations
const TEST_PRESETS = {
  // Run all tests
  all: ALL_TEST_SITES,
  
  // Quick test mode with one site from each category
  quick: [
    ALL_TEST_SITES.find(site => site.category === 'recipe'),
    ALL_TEST_SITES.find(site => site.category === 'article'),
    ALL_TEST_SITES.find(site => site.category === 'news'),
    ALL_TEST_SITES.find(site => site.category === 'technical'),
    ALL_TEST_SITES.find(site => site.category === 'documentation'),
    ALL_TEST_SITES.find(site => site.category === 'wiki'),
    ALL_TEST_SITES.find(site => site.category === 'product'),
    ALL_TEST_SITES.find(site => site.category === 'travel'),
    ALL_TEST_SITES.find(site => site.category === 'blog'),
    ALL_TEST_SITES.find(site => site.category === 'ecommerce'),
    ALL_TEST_SITES.find(site => site.category === 'newsletter')
  ],
  
  // Category-specific modes - one for each category
  recipe: ALL_TEST_SITES.filter(site => site.category === 'recipe'),
  article: ALL_TEST_SITES.filter(site => site.category === 'article'),
  news: ALL_TEST_SITES.filter(site => site.category === 'news'),
  technical: ALL_TEST_SITES.filter(site => site.category === 'technical'),
  documentation: ALL_TEST_SITES.filter(site => site.category === 'documentation'),
  wiki: ALL_TEST_SITES.filter(site => site.category === 'wiki'),
  product: ALL_TEST_SITES.filter(site => site.category === 'product'),
  travel: ALL_TEST_SITES.filter(site => site.category === 'travel'),
  blog: ALL_TEST_SITES.filter(site => site.category === 'blog'),
  ecommerce: ALL_TEST_SITES.filter(site => site.category === 'ecommerce'),
  newsletter: ALL_TEST_SITES.filter(site => site.category === 'newsletter')
};

// Determine which sites to test based on the mode
const sitesToTest = TEST_PRESETS[MODE] || 
  // If a specific site name is provided as the mode, test just that site
  ALL_TEST_SITES.filter(site => site.name.toLowerCase() === MODE.toLowerCase()) || 
  // If a specific category is provided, test all sites in that category
  ALL_TEST_SITES.filter(site => site.category === MODE) || 
  // Default to all sites
  ALL_TEST_SITES;

// Limit number of sites to test
const sitesToRun = sitesToTest.slice(0, MAX_SITES);

// Default options for scraper
const DEFAULT_OPTIONS = {
  maxScrolls: 2,
  headless: true,
  useResourceBlocker: true,
  bypassCloudflare: true,
  handlePagination: true
};

/**
 * Test a single site using our simplified scraper
 * @param {object} site - Site configuration to test
 * @param {number} index - Current index in the test queue
 * @param {number} total - Total number of sites to test
 * @returns {Promise<boolean>} - Whether the test was successful
 */
async function testSite(site, index, total) {
  console.log(`\n\n[${index}/${total}] 🚀 Testing ${site.name} (${site.category})`);
  console.log('-----------------------------------------------------------');
  console.log(`🔗 URL: ${site.url}`);
  
  try {
    // Create the output directory if it doesn't exist
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Run the scraper
    console.log('🔍 Starting extraction...');
    const startTime = Date.now();
    
    const result = await mainScraper(site.url, {
      ...DEFAULT_OPTIONS,
      // Custom options based on site category
      maxScrolls: site.category === 'travel' ? 3 : 2,
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Create a sanitized filename based on the domain
    const domain = new URL(site.url).hostname.replace('www.', '');
    const sanitizedDomain = domain.replace(/[^a-z0-9]/g, '_');
    
    // Save the result
    const outputFile = path.join(OUTPUT_DIR, `${sanitizedDomain}_result.json`);
    await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
    
    // Print summary
    console.log('\n📊 Extraction Results:');
    console.log(`⏱️ Duration: ${duration} seconds`);
    console.log(`📄 Title: ${result.title}`);
    console.log(`📝 Content Items: ${result.content.length}`);
    
    // Print sample content (first 3 items)
    if (result.content.length > 0) {
      console.log('\n📄 Sample Content:');
      for (let i = 0; i < Math.min(3, result.content.length); i++) {
        const text = result.content[i];
        // Truncate if too long
        const truncated = text.length > 100 ? text.substr(0, 97) + '...' : text;
        console.log(`  ${i + 1}. ${truncated}`);
      }
    } else {
      console.log('❌ No content extracted');
    }
    
    console.log(`\n✅ Test completed. Results saved to ${outputFile}`);
    return true;
  } catch (error) {
    console.error(`❌ Error testing site:`, error);
    return false;
  }
}

/**
 * Run all tests sequentially
 */
async function runAllTests() {
  console.log('🔍 Starting Simple Scraper Tests');
  console.log('==============================================');
  console.log(`📁 Results will be saved to: ${OUTPUT_DIR}`);
  console.log(`🧪 Testing ${sitesToRun.length} sites in mode: ${MODE}`);
  console.log('==============================================\n');
  
  const results = {
    mode: MODE,
    passed: 0,
    failed: 0,
    sites: []
  };
  
  for (let i = 0; i < sitesToRun.length; i++) {
    const site = sitesToRun[i];
    const success = await testSite(site, i + 1, sitesToRun.length);
    
    results.sites.push({
      name: site.name,
      url: site.url,
      category: site.category,
      success
    });
    
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Pause between tests to avoid rate limiting
    if (i < sitesToRun.length - 1) {
      console.log('\nPausing for 5 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Print final summary
  console.log('\n\n==============================================');
  console.log('📊 TEST SUMMARY');
  console.log('==============================================');
  console.log(`✅ Passed: ${results.passed}/${sitesToRun.length}`);
  console.log(`❌ Failed: ${results.failed}/${sitesToRun.length}`);
  console.log('\nSite Results:');
  
  // Group results by category
  const categorized = {};
  results.sites.forEach(site => {
    if (!categorized[site.category]) {
      categorized[site.category] = { total: 0, passed: 0 };
    }
    categorized[site.category].total++;
    if (site.success) categorized[site.category].passed++;
  });
  
  // Print results by category
  console.log('\nCategory Summary:');
  Object.entries(categorized).forEach(([category, stats]) => {
    console.log(`${category}: ${stats.passed}/${stats.total} passed`);
  });
  
  // Print individual site results
  console.log('\nIndividual Results:');
  results.sites.forEach(site => {
    console.log(`${site.success ? '✅' : '❌'} [${site.category}] ${site.name}`);
  });
  
  console.log('\n==============================================');
  console.log('All tests completed!');
  console.log('==============================================');
  
  // Save summary to file
  const summaryPath = path.join(OUTPUT_DIR, `test_summary_${MODE}.json`);
  await fs.writeFile(summaryPath, JSON.stringify(results, null, 2));
  console.log(`Summary saved to: ${summaryPath}`);
}

// Print usage instructions if help is requested
if (MODE === 'help') {
  console.log(`
  Usage: node test_simple_scraper.js [mode] [max_sites]
  
  Modes:
    all         - Test all sites (default)
    quick       - Test a small subset of sites, one from each category
    recipe      - Test only recipe sites
    article     - Test only article sites
    news        - Test only news sites
    technical   - Test only technical sites
    documentation - Test only documentation sites
    wiki        - Test only wiki sites
    product     - Test only product sites
    travel      - Test only travel sites
    blog        - Test only blog sites
    ecommerce   - Test only ecommerce sites
    newsletter  - Test only newsletter sites
    [site]      - Test a specific site by name (case-insensitive)
    
  Examples:
    node test_simple_scraper.js              # Test all sites
    node test_simple_scraper.js quick        # Run a quick test
    node test_simple_scraper.js recipe       # Test only recipe sites
    node test_simple_scraper.js ecommerce    # Test only ecommerce sites
    node test_simple_scraper.js all 5        # Test first 5 sites from all categories
    node test_simple_scraper.js "AllRecipes" # Test only the AllRecipes site
  `);
  process.exit(0);
}

// Run the tests
runAllTests().catch(console.error); 