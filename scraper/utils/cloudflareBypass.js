/**
 * cloudflareBypass.js - Utilities to help bypass Cloudflare protection
 * Based on techniques from https://www.zenrows.com/blog/puppeteer-cloudflare-bypass
 */

/**
 * Configure browser launch options with Cloudflare bypass settings
 */
function getBrowserLaunchArgs() {
  return {
    headless: true, // Can be set to false for debugging
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--font-render-hinting=medium',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list'
    ],
    ignoreHTTPSErrors: true
  };
}

/**
 * Get realistic browser headers to avoid detection
 */
function getRealisticHeaders() {
  return {
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
  };
}

/**
 * Add scripts to the page to mask browser automation
 */
async function addEvasions(page) {
  await page.evaluateOnNewDocument(() => {
    // Override the navigator.webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Override the plugins array
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ],
    });
    
    // Override permissions
    Object.defineProperty(navigator, 'permissions', {
      get: () => ({
        query: () => Promise.resolve({ state: 'granted' }),
      }),
    });
    
    // Add fake window.chrome
    window.chrome = {
      runtime: {},
    };

    // Override user agent
    const newProto = navigator.__proto__;
    delete newProto.webdriver;
    navigator.__proto__ = newProto;
    
    // Add language
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    
    // Spoof platform
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
    });
  });
}

/**
 * Detect if page is showing a Cloudflare challenge
 */
async function detectCloudflare(page) {
  return page.evaluate(() => {
    return document.title.includes('Attention Required') || 
           document.title.includes('Just a moment') ||
           document.body.textContent.includes('Checking your browser') ||
           !!document.querySelector('.cf-browser-verification') ||
           !!document.querySelector('.cf-im-under-attack');
  });
}

/**
 * Try to bypass a detected Cloudflare challenge
 */
async function bypassCloudflare(page) {
  console.log('⚠️ Cloudflare challenge detected, attempting to bypass...');
  
  // Wait for the Cloudflare challenge to complete automatically
  await page.waitForTimeout(10000);
  
  // Add some human-like behavior (mouse movements, etc.)
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(Math.random() * 500);
    const y = Math.floor(Math.random() * 500);
    await page.mouse.move(x, y);
    await page.waitForTimeout(Math.random() * 200);
  }
  
  // Try clicking the "I am human" checkbox if it exists
  try {
    // Look for various selectors that could be the checkbox
    const selectors = [
      'input[type="checkbox"]',
      '.cf-checkbox',
      '#cf-hcaptcha-container input', 
      '.hcaptcha-box',
      'iframe[src*="hcaptcha"]'
    ];
    
    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        console.log(`Clicked element: ${selector}`);
        await page.waitForTimeout(5000);
        break;
      }
    }
  } catch (e) {
    console.log('No checkbox found or unable to click it');
  }
  
  // Try to press the "Verify you are human" or "Continue" button
  try {
    const buttonSelectors = [
      '.cf-button', 
      'button[type="submit"]',
      'input[type="submit"]',
      'a.button',
      '[data-testid="challenge-submit"]'
    ];
    
    for (const selector of buttonSelectors) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        console.log(`Clicked button: ${selector}`);
        await page.waitForTimeout(5000);
        break;
      }
    }
  } catch (e) {
    console.log('No submit button found or unable to click it');
  }
  
  // Wait a bit more
  await page.waitForTimeout(5000);
  
  // Check if we're still on Cloudflare
  const stillOnCloudflare = await detectCloudflare(page);
  
  if (stillOnCloudflare) {
    console.warn('Could not bypass Cloudflare protection automatically');
    return false;
  } else {
    console.log('✅ Successfully bypassed Cloudflare challenge!');
    return true;
  }
}

/**
 * Set up a page with all recommended Cloudflare bypass techniques
 */
async function setupPageForCloudflareBypass(page, url) {
  // Set realistic viewport
  await page.setViewport({
    width: 1280,
    height: 800
  });

  // Set realistic headers
  await page.setExtraHTTPHeaders(getRealisticHeaders());
  
  // Set cookies to mimic a returning visitor (helps with some Cloudflare configurations)
  await page.setCookie({
    name: 'cf_clearance',
    value: 'random_value',
    domain: new URL(url).hostname
  });
  
  // Add evasions
  await addEvasions(page);
  
  // Set a realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
  
  return page;
}

/**
 * Navigate to a URL with Cloudflare bypass methods
 * Returns null if bypass failed, or the page if successful
 */
async function navigateWithBypass(browser, url) {
  const page = await browser.newPage();
  await setupPageForCloudflareBypass(page, url);
  
  try {
    // Navigate to the site with longer timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 90000 // Longer timeout for Cloudflare
    });
    
    // Check if we hit a Cloudflare challenge
    const cloudflareDetected = await detectCloudflare(page);
    
    if (cloudflareDetected) {
      const bypassSuccess = await bypassCloudflare(page);
      if (!bypassSuccess) {
        await page.close();
        return null;
      }
    }
    
    return page;
  } catch (error) {
    console.error(`Error navigating to ${url}:`, error);
    await page.close();
    return null;
  }
}

// Export the functions
module.exports = {
  getBrowserLaunchArgs,
  getRealisticHeaders,
  addEvasions,
  detectCloudflare,
  bypassCloudflare,
  setupPageForCloudflareBypass,
  navigateWithBypass
};