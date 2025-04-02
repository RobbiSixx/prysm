/**
 * MainExtractor - Content extraction focused on trying all possible methods
 * 
 * This class implements multiple extraction methods and tries all of them
 * on every page to maximize content extraction.
 */

// Create helper function for consistent delays
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to sanitize CSS selectors
const sanitizeSelector = (selector) => {
  if (!selector) return '';
  // Replace invalid characters and escape special characters
  return selector
    .replace(/:/g, '\\:')
    .replace(/\./g, '.')
    .replace(/\//g, '\\/')
    .replace(/\+/g, '\\+')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/!/g, '\\!')
    .replace(/@/g, '\\@')
    .replace(/,/g, '\\,')
    .replace(/~/g, '\\~')
    .trim();
};

class MainExtractor {
  constructor(page) {
    this.page = page;
    this.data = {
      url: '',
      title: '',
      content: [],
      metadata: {}
    };
    
    // Add compatibility for different Puppeteer versions
    this.ensureCompatibility();
  }
  
  /**
   * Ensures compatibility with different Puppeteer versions
   */
  ensureCompatibility() {
    // Check if waitForTimeout is not available (older Puppeteer versions)
    if (!this.page.waitForTimeout) {
      console.log('💡 Added waitForTimeout compatibility');
      // Add waitForTimeout as a custom method
      this.page.waitForTimeout = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
      };
    }

    // Check for waitForFunction compatibility
    if (!this.page.waitForFunction) {
      console.log('💡 Added waitForFunction compatibility');
      // Add a basic implementation
      this.page.waitForFunction = (pageFunction, options = {}, ...args) => {
        const { timeout = 30000, polling = 'raf' } = options;
        const startTime = Date.now();
        
        return new Promise(async (resolve, reject) => {
          const checkCondition = async () => {
            try {
              const result = await this.page.evaluate(pageFunction, ...args);
              if (result) {
                return resolve(result);
              }
              
              if (Date.now() - startTime > timeout) {
                return reject(new Error('waitForFunction timeout'));
              }
              
              setTimeout(checkCondition, typeof polling === 'number' ? polling : 100);
            } catch (error) {
              reject(error);
            }
          };
          
          checkCondition();
        });
      };
    }
  }
  
  /**
   * Safe wait function that works with all Puppeteer versions
   */
  async safeWait(ms) {
    try {
      if (this.page.waitForTimeout) {
        await this.page.waitForTimeout(ms);
      } else {
        await new Promise(resolve => setTimeout(resolve, ms));
      }
    } catch (error) {
      // Fallback to setTimeout if there's an error
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  /**
   * Main extraction method that tries all extraction approaches
   */
  async extract() {
    try {
      // Get the current URL from the page
      this.data.url = await this.page.url();
      
      // Get the page title
      this.data.title = await this.page.title();
      
      // Try all extraction methods
      console.log('🔄 Trying all extraction methods');
      const allContent = [];
      
      // Try extracting from recipe structure
      console.log('🍲 Trying recipe extraction');
      const recipeContent = await this.extractFromRecipe();
      if (recipeContent && recipeContent.length > 0) {
        allContent.push(...recipeContent);
      }
      
      // Try extracting from article elements
      console.log('📰 Trying article extraction');
      const articleContent = await this.extractFromArticle();
      if (articleContent && articleContent.length > 0) {
        allContent.push(...articleContent);
      }
      
      // Try extracting from main content
      console.log('📄 Trying main content extraction');
      const mainContent = await this.extractFromMainContent();
      if (mainContent && mainContent.length > 0) {
        allContent.push(...mainContent);
      }
      
      // Try extracting from semantic content
      console.log('🧠 Trying semantic content extraction');
      const semanticContent = await this.extractFromSemanticContent();
      if (semanticContent && semanticContent.length > 0) {
        allContent.push(...semanticContent);
      }
      
      // Try extracting from header-content-footer
      console.log('📑 Trying header-content-footer extraction');
      const headerContentFooterContent = await this.extractFromHeaderContentFooter();
      if (headerContentFooterContent && headerContentFooterContent.length > 0) {
        allContent.push(...headerContentFooterContent);
      }
      
      // Try extracting from multi-column
      console.log('📏 Trying multi-column extraction');
      const multiColumnContent = await this.extractFromMultiColumn();
      if (multiColumnContent && multiColumnContent.length > 0) {
        allContent.push(...multiColumnContent);
      }
      
      // Try extracting from content sections
      console.log('📋 Trying content sections extraction');
      const contentSectionsContent = await this.extractFromContentSections();
      if (contentSectionsContent && contentSectionsContent.length > 0) {
        allContent.push(...contentSectionsContent);
      }
      
      // Try extracting from single column
      console.log('📊 Trying single column extraction');
      const singleColumnContent = await this.extractFromSingleColumn();
      if (singleColumnContent && singleColumnContent.length > 0) {
        allContent.push(...singleColumnContent);
      }
      
      // Try extracting from largest content
      console.log('📈 Trying largest content extraction');
      const largestContent = await this.extractFromLargestContent();
      if (largestContent && largestContent.length > 0) {
        allContent.push(...largestContent);
      }
      
      // Try extracting from product pages
      console.log('🛒 Trying product extraction');
      const productContent = await this.extractFromProduct();
      if (productContent && productContent.length > 0) {
        allContent.push(...productContent);
      }
      
      // Try extracting from documentation pages
      console.log('📚 Trying documentation extraction');
      const docContent = await this.extractFromDocumentation();
      if (docContent && docContent.length > 0) {
        allContent.push(...docContent);
      }
      
      // Try extracting using text density analysis
      console.log('📊 Trying text density extraction');
      const textDensityContent = await this.extractFromTextDensity();
      if (textDensityContent && textDensityContent.length > 0) {
        allContent.push(...textDensityContent);
      }
      
      // Try to extract all text from selectors
      console.log('📝 Trying basic selector extraction');
      const basicContent = await this.extractFromBasic();
      if (basicContent && basicContent.length > 0) {
        allContent.push(...basicContent);
      }
      
      // Handle pagination to get more content
      console.log('📄 Handling pagination');
      try {
        await this.attemptPagination();
      } catch (error) {
        console.error('Error handling pagination:', error);
      }
      
      // Extract metadata
      await this.extractMetadata();
      
      // Combine and deduplicate content
      const seen = new Set();
      this.data.content = allContent.filter(item => {
        // Skip empty items or very short items
        if (!item || item.length < 5) return false;
        
        // Normalize for comparison
        const normalized = item.trim().toLowerCase();
        
        // Skip if we've seen this item before
        if (seen.has(normalized)) return false;
        
        // Mark as seen and keep this item
        seen.add(normalized);
        return true;
      });
      
      console.log(`✅ Extracted ${this.data.content.length} unique content items`);
      return this.data;
    } catch (error) {
      console.error('Error in MainExtractor:', error);
      return this.data;
    }
  }

  /**
   * Attempts all pagination approaches
   */
  async attemptPagination() {
    try {
      console.log('📄 Handling pagination - trying all approaches');
      
      // Store initial content length to check if we've added anything
      const initialContentLength = this.data.content ? this.data.content.length : 0;
      
      // First try infinite scroll
      console.log('🔄 Trying infinite scroll pagination');
      await this.handleInfiniteScroll(3);
      
      // Then try click-based pagination
      console.log('🔄 Trying click pagination');
      // Try common pagination selectors
      const paginationSelectors = [
        '.pagination a', 
        '.pager a', 
        '.page-numbers', 
        '[aria-label*="page"]', 
        '[aria-label*="Page"]', 
        '.pages a',
        'a.next',
        'button.next',
        '[rel="next"]',
        '.load-more',
        '.show-more',
        '.view-more',
        '.next-page',
        'button:contains("Load More")',
        'button:contains("Show More")',
        'button:contains("Next")',
        '.more'
      ];
      
      for (const selector of paginationSelectors) {
        await this.handleClickPagination(selector, 2);
      }
      
      // Then try URL-based pagination
      console.log('🔄 Trying URL pagination');
      await this.handleUrlPagination(null, 2);
      
      // Check if we've added any content
      const newContentItems = this.data.content ? 
        this.data.content.length - initialContentLength : 0;
      
      if (newContentItems > 0) {
        console.log(`✅ Added ${newContentItems} new content items from pagination`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error handling pagination:', error);
      return false;
    }
  }

  /**
   * Extracts content from article elements
   */
  async extractFromArticle() {
    try {
      const articleContent = await this.page.evaluate(() => {
        const results = [];
        const articles = document.querySelectorAll('article');
        
        for (const article of articles) {
          // Get all paragraphs, headings, and lists within the article
          const elements = article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
          
          for (const elem of elements) {
            const text = elem.textContent.trim();
            if (text.length > 0) {
              results.push(text);
            }
          }
          
          // If no structured elements found, get the raw text
          if (results.length === 0 && article.textContent.trim().length > 0) {
            results.push(article.textContent.trim());
          }
        }
        
        return results;
      });
      
      return articleContent;
    } catch (error) {
      console.error('Error extracting from article:', error);
      return [];
    }
  }

  /**
   * Extracts content from main content elements
   */
  async extractFromMainContent() {
    try {
      const mainContent = await this.page.evaluate(() => {
        const results = [];
        const mainElements = document.querySelectorAll('main, [role="main"], #main, .main, .content, #content, .post-content, .article-content');
        
        for (const main of mainElements) {
          // Get all paragraphs, headings, and lists within the main content
          const elements = main.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
          
          for (const elem of elements) {
            const text = elem.textContent.trim();
            if (text.length > 0) {
              results.push(text);
            }
          }
          
          // If no structured elements found, get the raw text
          if (results.length === 0 && main.textContent.trim().length > 0) {
            results.push(main.textContent.trim());
          }
        }
        
        return results;
      });
      
      return mainContent;
    } catch (error) {
      console.error('Error extracting from main content:', error);
      return [];
    }
  }

  /**
   * Extracts content from header-content-footer structure
   */
  async extractFromHeaderContentFooter() {
    try {
      const content = await this.page.evaluate(() => {
        const results = [];
        const header = document.querySelector('header');
        const footer = document.querySelector('footer');
        
        if (!header || !footer) return results;
        
        // Function to get next sibling elements
        function getNextSiblings(elem, filter) {
          const siblings = [];
          while (elem && elem !== footer) {
            elem = elem.nextElementSibling;
            if (elem && elem !== footer && (!filter || filter(elem))) {
              siblings.push(elem);
            }
          }
          return siblings;
        }
        
        // Get all elements between header and footer
        const contentElements = getNextSiblings(header, elem => {
          // Skip empty elements or navigation
          return elem.textContent.trim().length > 0 && 
                 !elem.matches('nav, aside, .sidebar, .ad, .advertisement');
        });
        
        for (const elem of contentElements) {
          // Get all text-containing elements
          const textElements = elem.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
          
          for (const textElem of textElements) {
            const text = textElem.textContent.trim();
            if (text.length > 0) {
              results.push(text);
            }
          }
          
          // If no text elements found, get the raw text
          if (textElements.length === 0 && elem.textContent.trim().length > 0) {
            results.push(elem.textContent.trim());
          }
        }
        
        return results;
      });
      
      return content;
    } catch (error) {
      console.error('Error extracting from header-content-footer:', error);
      return [];
    }
  }

  /**
   * Extracts content from multi-column layouts
   */
  async extractFromMultiColumn() {
    try {
      const content = await this.page.evaluate(() => {
        const results = [];
        const columns = document.querySelectorAll('.column, .col, [class*="col-"], [class*="column-"]');
        
        // Find the main content column (usually the largest one with most text)
        let mainColumn = null;
        let maxTextLength = 0;
        
        for (const column of columns) {
          const textLength = column.textContent.trim().length;
          if (textLength > maxTextLength) {
            maxTextLength = textLength;
            mainColumn = column;
          }
        }
        
        if (mainColumn) {
          // Get all paragraphs, headings, and lists within the main column
          const elements = mainColumn.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
          
          for (const elem of elements) {
            const text = elem.textContent.trim();
            if (text.length > 0) {
              results.push(text);
            }
          }
          
          // If no structured elements found, get the raw text
          if (results.length === 0 && mainColumn.textContent.trim().length > 0) {
            results.push(mainColumn.textContent.trim());
          }
        }
        
        return results;
      });
      
      return content;
    } catch (error) {
      console.error('Error extracting from multi-column:', error);
      return [];
    }
  }

  /**
   * Extracts content from the largest content block on the page
   * This is a fallback method when other methods fail
   */
  async extractFromLargestContent() {
    try {
      const content = await this.page.evaluate(() => {
        const results = [];
        
        // Find elements with substantial text content
        const allElements = document.querySelectorAll('div, section, main, article');
        let bestElement = null;
        let maxTextLength = 0;
        let maxParagraphs = 0;
        
        for (const elem of allElements) {
          // Skip hidden elements, navigation, and other non-content elements
          if (
            !elem.offsetParent || // Hidden element
            elem.matches('nav, header, footer, aside, .sidebar, .ad, .advertisement, .menu') ||
            elem.id && /nav|menu|sidebar|footer|header/i.test(elem.id) ||
            elem.className && /nav|menu|sidebar|footer|header/i.test(elem.className)
          ) {
            continue;
          }
          
          const paragraphs = elem.querySelectorAll('p');
          const textLength = elem.textContent.trim().length;
          
          // Prioritize elements with more paragraphs and more text
          if (
            (paragraphs.length > maxParagraphs) ||
            (paragraphs.length === maxParagraphs && textLength > maxTextLength)
          ) {
            maxParagraphs = paragraphs.length;
            maxTextLength = textLength;
            bestElement = elem;
          }
        }
        
        if (bestElement) {
          // Get all paragraphs, headings, and lists within the best element
          const elements = bestElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
          
          for (const elem of elements) {
            const text = elem.textContent.trim();
            if (text.length > 0) {
              results.push(text);
            }
          }
          
          // If no structured elements found, get the raw text
          if (results.length === 0 && bestElement.textContent.trim().length > 0) {
            results.push(bestElement.textContent.trim());
          }
        }
        
        return results;
      });
      
      return content;
    } catch (error) {
      console.error('Error extracting from largest content:', error);
      return [];
    }
  }

  /**
   * Extracts content from elements with semantic meaning
   * Looks for elements with semantic roles or schema.org attributes
   */
  async extractFromSemanticContent() {
    try {
      const semanticContent = await this.page.evaluate(() => {
        const results = [];
        
        // Look for elements with semantic attributes
        const semanticSelectors = [
          // ARIA roles related to content
          '[role="article"]',
          '[role="main"]',
          '[role="contentinfo"]',
          '[role="document"]',
          '[role="region"]',
          
          // Schema.org attributes
          '[itemtype*="Article"]',
          '[itemtype*="NewsArticle"]',
          '[itemtype*="BlogPosting"]',
          '[itemtype*="WebPage"]',
          '[itemtype*="CreativeWork"]',
          
          // HTML5 semantic elements not covered by other methods
          'article',
          'section',
          
          // OpenGraph marked content
          '[property="og:description"]',
          
          // Common content classes without being overly specific
          '.post-content',
          '.entry-content',
          '.article-content',
          '.blog-content',
          '.story-content',
          '.page-content'
        ];
        
        // Try each semantic selector
        for (const selector of semanticSelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            
            for (const element of elements) {
              // Skip elements with no content or too small content
              if (element.textContent.trim().length < 100) continue;
              
              // Skip hidden elements
              if (!element.offsetParent) continue;
              
              // Skip navigation, sidebars, etc.
              if (
                element.matches('nav, aside, header, footer') ||
                element.id && /nav|menu|sidebar|header|footer/i.test(element.id) ||
                element.className && /nav|menu|sidebar|header|footer/i.test(element.className)
              ) {
                continue;
              }
              
              // Get all text elements within this semantic element
              const textElements = element.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, code, pre');
              
              if (textElements.length > 0) {
                for (const textElem of textElements) {
                  const text = textElem.textContent.trim();
                  if (text.length > 0) {
                    results.push(text);
                  }
                }
              } else if (element.textContent.trim().length > 150) {
                // If no structured elements but has substantial text
                results.push(element.textContent.trim());
              }
            }
          } catch (e) {
            // Skip this selector if there's an error
            continue;
          }
        }
        
        return results;
      });
      
      return semanticContent;
    } catch (error) {
      console.error('Error extracting from semantic content:', error);
      return [];
    }
  }

  /**
   * Extract content from recipe pages
   */
  async extractFromRecipe() {
    try {
      const recipeData = await this.page.evaluate(() => {
        const content = [];
        
        // Try to extract title
        const titleElement = document.querySelector('h1');
        if (titleElement) {
          content.push(titleElement.textContent.trim());
        }
        
        // Extract from JSON-LD first (most reliable)
        const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
        let recipeStructuredData = null;
        
        for (const element of jsonLdElements) {
          try {
            const parsed = JSON.parse(element.textContent);
            let recipeData = null;
            
            if (parsed['@type'] === 'Recipe') {
              recipeData = parsed;
            } else if (Array.isArray(parsed['@type']) && parsed['@type'].includes('Recipe')) {
              recipeData = parsed;
            } else if (parsed['@graph']) {
              const recipeItem = parsed['@graph'].find(item => item['@type'] === 'Recipe');
              if (recipeItem) {
                recipeData = recipeItem;
              }
            }
            
            if (recipeData) {
              recipeStructuredData = recipeData;
              break;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
        
        // If we have structured data, extract from it
        if (recipeStructuredData) {
          // Add recipe description
          if (recipeStructuredData.description) {
            content.push(recipeStructuredData.description);
          }
          
          // Add ingredients heading
          content.push('Ingredients');
          
          // Add ingredients
          if (Array.isArray(recipeStructuredData.recipeIngredient)) {
            recipeStructuredData.recipeIngredient.forEach(ingredient => {
              content.push(ingredient);
            });
          }
          
          // Add instructions heading
          content.push('Instructions');
          
          // Add instructions
          if (Array.isArray(recipeStructuredData.recipeInstructions)) {
            recipeStructuredData.recipeInstructions.forEach((instruction, index) => {
              const instructionText = typeof instruction === 'string' ? 
                instruction : 
                (instruction.text || '');
              
              if (instructionText) {
                content.push(`${index + 1}. ${instructionText}`);
              }
            });
          }
          
          // Add recipe metadata
          const recipeMetadata = [];
          
          if (recipeStructuredData.prepTime) {
            recipeMetadata.push(`Prep Time: ${recipeStructuredData.prepTime}`);
          }
          
          if (recipeStructuredData.cookTime) {
            recipeMetadata.push(`Cook Time: ${recipeStructuredData.cookTime}`);
          }
          
          if (recipeStructuredData.totalTime) {
            recipeMetadata.push(`Total Time: ${recipeStructuredData.totalTime}`);
          }
          
          if (recipeStructuredData.recipeYield) {
            recipeMetadata.push(`Servings: ${recipeStructuredData.recipeYield}`);
          }
          
          if (recipeMetadata.length > 0) {
            content.push('Recipe Information');
            recipeMetadata.forEach(item => content.push(item));
          }
          
          return content;
        }
        
        // If no structured data, extract from HTML
        
        // Try to find recipe container
        const recipeContainerSelectors = [
          '.recipe', '.recipe-container', '.recipe-card', '.recipe-content',
          '.recipe-body', '.recipe-main', '[itemtype*="Recipe"]', '[typeof*="Recipe"]',
          'article', 'main', '#content', '.content', '.post-content', '.entry-content'
        ];
        
        let recipeContainer = null;
        for (const selector of recipeContainerSelectors) {
          try {
            const container = document.querySelector(selector);
            if (container) {
              recipeContainer = container;
              break;
            }
          } catch (e) {
            // Ignore errors with selectors
          }
        }
        
        if (!recipeContainer) {
          recipeContainer = document.body; // Fall back to body if no container found
        }
        
        // Extract ingredients
        let ingredients = [];
        const ingredientSelectors = [
          '[itemprop="recipeIngredient"]',
          '.ingredients li',
          '.ingredient-list li',
          '.recipe-ingredients li',
          '[class*="ingredient"] li',
          '[id*="ingredient"] li',
          'ul li' // fallback - look at all list items if others don't work
        ];
        
        for (const selector of ingredientSelectors) {
          try {
            const ingredientElements = recipeContainer.querySelectorAll(selector);
            if (ingredientElements.length > 0) {
              ingredients = Array.from(ingredientElements)
                .map(el => el.textContent.trim())
                .filter(text => 
                  // Filter for likely ingredients (contains measurements or common food items)
                  text.match(/\d+\s*(cup|tbsp|tsp|tablespoon|teaspoon|oz|ounce|pound|lb|gram|g|ml|l)/i) !== null ||
                  text.length > 3
                );
              
              if (ingredients.length > 0) {
                break;
              }
            }
          } catch (e) {
            // Ignore errors with selectors
          }
        }
        
        // If no ingredients found with selectors, try looking for paragraphs after an "Ingredients" heading
        if (ingredients.length === 0) {
          const headings = Array.from(recipeContainer.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          for (const heading of headings) {
            if (heading.textContent.trim().toLowerCase().includes('ingredient')) {
              // Get all paragraphs and list items that follow this heading
              let currentNode = heading.nextElementSibling;
              while (currentNode && !currentNode.tagName.match(/^H[1-6]$/)) {
                if (currentNode.tagName === 'UL' || currentNode.tagName === 'OL') {
                  const items = Array.from(currentNode.querySelectorAll('li'))
                    .map(li => li.textContent.trim())
                    .filter(text => text.length > 3);
                  
                  if (items.length > 0) {
                    ingredients = items;
                    break;
                  }
                } else if (currentNode.tagName === 'P') {
                  const text = currentNode.textContent.trim();
                  if (text.length > 3) {
                    ingredients.push(text);
                  }
                }
                currentNode = currentNode.nextElementSibling;
              }
              if (ingredients.length > 0) break;
            }
          }
        }
        
        // Extract instructions
        let instructions = [];
        const instructionSelectors = [
          '[itemprop="recipeInstructions"] li',
          '.instructions li',
          '.recipe-instructions li',
          '.steps li',
          '.method li',
          '.directions li',
          '[class*="instruction"] li',
          '[id*="instruction"] li',
          '[class*="direction"] li',
          '[id*="direction"] li',
          '[class*="step"] li',
          '[id*="step"] li',
          'ol li' // fallback - numbered lists are often instructions
        ];
        
        for (const selector of instructionSelectors) {
          try {
            const instructionElements = recipeContainer.querySelectorAll(selector);
            if (instructionElements.length > 0) {
              instructions = Array.from(instructionElements)
                .map(el => el.textContent.trim())
                .filter(text => text.length > 10); // Instructions are usually longer
              
              if (instructions.length > 0) {
                break;
              }
            }
          } catch (e) {
            // Ignore errors with selectors
          }
        }
        
        // If no list items found for instructions, look for paragraphs in instruction container
        if (instructions.length === 0) {
          const instructionContainerSelectors = [
            '[itemprop="recipeInstructions"]',
            '.instructions',
            '.recipe-instructions',
            '.steps',
            '.method',
            '.directions',
            '[class*="instruction"]',
            '[id*="instruction"]',
            '[class*="direction"]',
            '[id*="direction"]',
            '[class*="step"]',
            '[id*="step"]'
          ];
          
          for (const selector of instructionContainerSelectors) {
            try {
              const container = recipeContainer.querySelector(selector);
              if (container) {
                const paragraphs = container.querySelectorAll('p');
                if (paragraphs.length > 0) {
                  instructions = Array.from(paragraphs)
                    .map(el => el.textContent.trim())
                    .filter(text => text.length > 10);
                  
                  if (instructions.length > 0) {
                    break;
                  }
                }
              }
            } catch (e) {
              // Ignore errors with selectors
            }
          }
        }
        
        // If still no instructions, try looking for paragraphs after an "Instructions" heading
        if (instructions.length === 0) {
          const headings = Array.from(recipeContainer.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          for (const heading of headings) {
            if (heading.textContent.trim().toLowerCase().match(/instruction|direction|method|step|preparation/)) {
              // Get all paragraphs and list items that follow this heading
              let currentNode = heading.nextElementSibling;
              while (currentNode && !currentNode.tagName.match(/^H[1-6]$/)) {
                if (currentNode.tagName === 'OL' || currentNode.tagName === 'UL') {
                  const items = Array.from(currentNode.querySelectorAll('li'))
                    .map(li => li.textContent.trim())
                    .filter(text => text.length > 10);
                  
                  if (items.length > 0) {
                    instructions = items;
                    break;
                  }
                } else if (currentNode.tagName === 'P') {
                  const text = currentNode.textContent.trim();
                  if (text.length > 10) {
                    instructions.push(text);
                  }
                }
                currentNode = currentNode.nextElementSibling;
              }
              if (instructions.length > 0) break;
            }
          }
        }
        
        // Build content from extracted elements
        
        // If we have ingredients, add them
        if (ingredients.length > 0) {
          content.push('Ingredients');
          ingredients.forEach(ingredient => {
            content.push(ingredient);
          });
        }
        
        // If we have instructions, add them
        if (instructions.length > 0) {
          content.push('Instructions');
          instructions.forEach((instruction, index) => {
            // Add numbering if not already numbered
            if (!instruction.match(/^\d+[\.\)]/)) {
              content.push(`${index + 1}. ${instruction}`);
            } else {
              content.push(instruction);
            }
          });
        }
        
        // If we still don't have content, extract paragraphs from the recipe container
        if (content.length === 0) {
          const paragraphs = recipeContainer.querySelectorAll('p');
          if (paragraphs.length > 0) {
            Array.from(paragraphs)
              .map(p => p.textContent.trim())
              .filter(text => text.length > 20)
              .forEach(text => content.push(text));
          }
        }
        
        return content;
      });
      
      return recipeData;
    } catch (error) {
      console.error('Error extracting recipe content:', error);
      return [];
    }
  }

  /**
   * Extracts content from product pages
   */
  async extractFromProduct() {
    try {
      const productContent = await this.page.evaluate(() => {
        const results = [];
        
        // REI-specific extraction
        const isREIProduct = window.location.href.includes('rei.com');
        if (isREIProduct) {
          try {
            // Try REI-specific selectors first
            const productTitle = document.querySelector('[data-ui="product-title"]')?.textContent.trim() || 
                                document.querySelector('h1')?.textContent.trim();
            
            if (productTitle) {
              results.push(`Product Title: ${productTitle}`);
            }
            
            const brandName = document.querySelector('[data-ui="product-brand"]')?.textContent.trim();
            if (brandName) {
              results.push(`Brand: ${brandName}`);
            }
            
            const productPrice = document.querySelector('[data-ui="sale-price"]')?.textContent.trim() ||
                                document.querySelector('[data-ui="display-price"]')?.textContent.trim();
            if (productPrice) {
              results.push(`Price: ${productPrice}`);
            }
            
            // Extract product description
            const descriptionElem = document.querySelector('.product-information-container');
            if (descriptionElem) {
              const descText = descriptionElem.textContent.trim();
              if (descText.length > 0) {
                results.push(`Description: ${descText}`);
              }
            }
            
            // Extract specifications
            const specSections = document.querySelectorAll('.pdp-accordion-content');
            for (const section of specSections) {
              const sectionTitle = section.previousElementSibling?.textContent.trim();
              if (sectionTitle) {
                results.push(`Section: ${sectionTitle}`);
              }
              
              const specItems = section.querySelectorAll('li, p');
              for (const item of specItems) {
                const itemText = item.textContent.trim();
                if (itemText.length > 0) {
                  results.push(`- ${itemText}`);
                }
              }
            }
            
            // If we found good content, return it
            if (results.length > 0) {
              return results;
            }
          } catch (e) {
            // If REI-specific extraction fails, continue with generic extraction
            console.error('REI-specific extraction failed:', e);
          }
        }
        
        // Generic extraction for other sites
        // Extract product title
        const titleSelectors = [
          '[itemprop="name"]',
          '.product-title',
          '.product-name',
          '.product__title',
          'h1.title',
          '[data-testid="product-title"]',
          '.pdp-title',
          'h1',
          '#productTitle'
        ];
        
        for (const selector of titleSelectors) {
          try {
            const titleElement = document.querySelector(selector);
            if (titleElement && titleElement.textContent.trim().length > 0) {
              results.push(`Product Title: ${titleElement.textContent.trim()}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Extract price
        const priceSelectors = [
          '[itemprop="price"]',
          '.price',
          '.product-price',
          '.product__price',
          '[data-testid="price"]',
          '.pdp-price',
          '.current-price',
          '#priceblock_ourprice',
          '.price-characteristic'
        ];
        
        for (const selector of priceSelectors) {
          try {
            const priceElement = document.querySelector(selector);
            if (priceElement && priceElement.textContent.trim().length > 0) {
              results.push(`Price: ${priceElement.textContent.trim()}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Extract description
        const descriptionSelectors = [
          '[itemprop="description"]',
          '.product-description',
          '.description',
          '.product__description',
          '#description',
          '.pdp-description',
          '[data-testid="product-description"]',
          '#productDescription',
          '[data-component-type="s-product-description"]'
        ];
        
        for (const selector of descriptionSelectors) {
          try {
            const descElements = document.querySelectorAll(selector);
            if (descElements.length > 0) {
              for (const elem of descElements) {
                const text = elem.textContent.trim();
                if (text.length > 0) {
                  results.push(`Description: ${text}`);
                }
              }
            }
          } catch (e) {
            continue;
          }
        }
        
        // Extract features/specs
        const featureSelectors = [
          '.product-features',
          '.features',
          '.specifications',
          '.specs',
          '.product-specs',
          '.tech-specs',
          '[data-testid="product-specs"]',
          '#feature-bullets',
          '.product-attributes',
          '.accordion-inner'
        ];
        
        for (const selector of featureSelectors) {
          try {
            const featureElements = document.querySelectorAll(`${selector} li, ${selector} p, ${selector} div`);
            if (featureElements.length > 0) {
              for (const elem of featureElements) {
                const text = elem.textContent.trim();
                if (text.length > 10 && text.length < 500) { // Reasonable feature length
                  results.push(`Feature: ${text}`);
                }
              }
            }
          } catch (e) {
            continue;
          }
        }
        
        // If we have very little content, try more aggressive extraction
        if (results.length < 3) {
          // Look for product details in any container
          const possibleContainers = document.querySelectorAll('.product-details, .product-info, [class*="product-"], [class*="pdp-"], [id*="product-"]');
          
          for (const container of possibleContainers) {
            // Skip tiny containers or hidden elements
            if (!container.offsetParent || container.textContent.trim().length < 50) continue;
            
            // Get structured content like paragraphs, lists, etc.
            const textElements = container.querySelectorAll('p, li, h3, h4, h5, h6');
            for (const elem of textElements) {
              const text = elem.textContent.trim();
              if (text.length > 10 && !results.includes(text)) {
                results.push(text);
              }
            }
            
            // If no structured elements, get the container text
            if (textElements.length === 0 && container.textContent.trim().length > 50) {
              results.push(container.textContent.trim().substring(0, 500) + 
                          (container.textContent.trim().length > 500 ? '...' : ''));
            }
          }
        }
        
        // Last resort: grab heading and all nearby paragraphs
        if (results.length < 2) {
          const h1 = document.querySelector('h1');
          if (h1) {
            if (!results.some(r => r.includes(h1.textContent.trim()))) {
              results.push(`Product Title: ${h1.textContent.trim()}`);
            }
            
            let sibling = h1.nextElementSibling;
            while (sibling && results.length < 10) {
              if (sibling.tagName === 'P' || sibling.tagName === 'DIV') {
                const text = sibling.textContent.trim();
                if (text.length > 20 && !results.includes(text)) {
                  results.push(text);
                }
              }
              sibling = sibling.nextElementSibling;
            }
          }
        }
        
        return results;
      });
      
      return productContent;
    } catch (error) {
      console.error('Error extracting from product page:', error);
      return [];
    }
  }

  /**
   * Extracts content from documentation pages
   */
  async extractFromDocumentation() {
    try {
      const docContent = await this.page.evaluate(() => {
        const results = [];
        
        // MDN-specific extraction
        const isMDN = window.location.href.includes('mozilla.org') || window.location.href.includes('mdn.');
        if (isMDN) {
          try {
            // Try MDN-specific selectors first
            const mainContent = document.querySelector('.main-page-content, .article, #content-main, .article__content');
            if (mainContent) {
              // Extract title and headings
              const title = document.querySelector('h1')?.textContent.trim();
              if (title) {
                results.push(`Title: ${title}`);
              }
              
              // Extract all section headings and their content
              const headings = mainContent.querySelectorAll('h2, h3, h4, h5, h6');
              for (const heading of headings) {
                const headingText = heading.textContent.trim();
                if (headingText) {
                  results.push(`\n${headingText}`);
                  
                  // Get all content until next heading
                  let nextElem = heading.nextElementSibling;
                  while (nextElem && !['H2', 'H3', 'H4', 'H5', 'H6'].includes(nextElem.tagName)) {
                    // Only add paragraphs, lists, and code blocks
                    if (['P', 'UL', 'OL', 'PRE', 'CODE', 'DL', 'TABLE'].includes(nextElem.tagName)) {
                      const text = nextElem.textContent.trim();
                      if (text.length > 0) {
                        results.push(text);
                      }
                    }
                    nextElem = nextElem.nextElementSibling;
                  }
                }
              }
              
              // If we found good content, return it
              if (results.length > 0) {
                return results;
              }
            }
          } catch (e) {
            // If MDN-specific extraction fails, continue with generic extraction
            console.error('MDN-specific extraction failed:', e);
          }
        }
        
        // Try documentation-specific selectors
        const docSelectors = [
          '.documentation', 
          '.docs', 
          '.doc-content',
          '.article__content',
          '.article-content',
          '.documentation__main',
          '.documentation__content',
          '.markdown-body',
          '.markdown-section',
          '.main-content',
          '.content-with-sidebar'
        ];
        
        for (const selector of docSelectors) {
          try {
            const docElements = document.querySelectorAll(selector);
            for (const elem of docElements) {
              // Skip hidden elements
              if (!elem.offsetParent) continue;
              
              // Get the title first
              const title = elem.querySelector('h1, h2')?.textContent.trim();
              if (title && !results.includes(`Title: ${title}`)) {
                results.push(`Title: ${title}`);
              }
              
              // Extract headings and their content
              const headings = elem.querySelectorAll('h2, h3, h4, h5, h6');
              if (headings.length > 0) {
                for (const heading of headings) {
                  const headingText = heading.textContent.trim();
                  if (headingText) {
                    results.push(`\n${headingText}`);
                    
                    // Get content until next heading
                    let nextElem = heading.nextElementSibling;
                    while (nextElem && !['H2', 'H3', 'H4', 'H5', 'H6'].includes(nextElem.tagName)) {
                      if (['P', 'UL', 'OL', 'PRE', 'CODE', 'DL', 'TABLE'].includes(nextElem.tagName)) {
                        const text = nextElem.textContent.trim();
                        if (text.length > 0) {
                          results.push(text);
                        }
                      }
                      nextElem = nextElem.nextElementSibling;
                    }
                  }
                }
              } else {
                // If no headings, get all paragraphs, lists, and code blocks
                const contentElements = elem.querySelectorAll('p, ul, ol, pre, code, dl, table');
                for (const content of contentElements) {
                  const text = content.textContent.trim();
                  if (text.length > 0) {
                    results.push(text);
                  }
                }
              }
              
              // If we found good content, return it
              if (results.length > 5) {
                return results;
              }
            }
          } catch (e) {
            // Skip this selector if there's an error
            continue;
          }
        }
        
        // If still no content, try generic article extraction
        if (results.length < 3) {
          const contentContainers = document.querySelectorAll('article, main, [role="main"], #content, .content');
          for (const container of contentContainers) {
            if (!container.offsetParent || container.textContent.trim().length < 300) continue;
            
            // Get title
            const title = container.querySelector('h1, h2')?.textContent.trim();
            if (title && !results.includes(`Title: ${title}`)) {
              results.push(`Title: ${title}`);
            }
            
            // Get all content elements
            const contentElements = container.querySelectorAll('p, ul, ol, pre, code, dl, table, h2, h3, h4, h5, h6');
            for (const elem of contentElements) {
              const text = elem.textContent.trim();
              if (text.length > 0 && !results.includes(text)) {
                results.push(text);
              }
            }
            
            if (results.length > 5) {
              break;
            }
          }
        }
        
        return results;
      });
      
      return docContent;
    } catch (error) {
      console.error('Error extracting from documentation:', error);
      return [];
    }
  }

  /**
   * Detects if the page has a product structure
   */
  async detectProductStructure() {
    try {
      const hasProductStructure = await this.page.evaluate(() => {
        // Check for product-specific elements
        const productIndicators = [
          // Price indicators
          '.price',
          '[itemprop="price"]',
          '[itemprop="offers"]',
          '.product-price',
          '.product__price',
          '#priceblock_ourprice',
          '[data-automation-id="price"]',
          
          // Buy/Add to cart buttons
          '.add-to-cart',
          '.buy-now',
          '.add-to-bag',
          '[data-add-to-cart]',
          '.product-form__cart-submit',
          '#add-to-cart',
          '#buy-now',
          '.buyBox',
          'button[data-ux-id*="add-to-cart"]',
          '[data-id="buybox"]',
          
          // Product schema
          '[itemtype*="Product"]',
          '[typeof*="Product"]',
          
          // Product galleries
          '.product-gallery',
          '.product-images',
          '.product-thumbnails',
          '[data-component-type="image-gallery"]',
          '[data-testid="product-gallery"]',
          '[data-id="image-gallery"]',
          '[data-ui="image-viewer"]',
          
          // Common product elements
          '.product-details',
          '.product-info',
          '.product-description',
          '.product-features',
          '.product-options',
          '.variant-selector',
          '.pdp-accordion-content',
          '.product-title-container',
          '[data-ui="product-title"]',
          '[data-id="purchase-buttons"]',
        ];
        
        // Check for the presence of multiple product indicators
        let indicatorsFound = 0;
        let specificIndicatorsFound = false;
        
        for (const selector of productIndicators) {
          try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              indicatorsFound++;

              // Some selectors are strong indicators by themselves
              if (
                selector.includes('add-to-cart') || 
                selector.includes('buy-now') || 
                selector.includes('product-gallery') || 
                selector.includes('image-gallery') || 
                selector === '[itemtype*="Product"]' ||
                selector.includes('product-title')
              ) {
                specificIndicatorsFound = true;
              }
              
              if (specificIndicatorsFound || indicatorsFound >= 2) {
                return true;
              }
            }
          } catch (e) {
            // Skip this selector if there's an error
            continue;
          }
        }
        
        // Check for common product page keywords in the URL
        const url = window.location.href.toLowerCase();
        const productUrlPatterns = ['/product/', '/products/', '/item/', '/dp/', '/shop/', '/buy/', '/pd/'];
        for (const pattern of productUrlPatterns) {
          if (url.includes(pattern)) {
            indicatorsFound++;
            if (indicatorsFound >= 2) return true;
          }
        }
        
        // Check for other common product page features
        // Like price with currency symbol pattern
        const priceRegex = /\$\d+(\.\d{2})?|\d+\.\d{2}\s*USD|\€\d+(\.\d{2})?|\£\d+(\.\d{2})?/;
        const bodyText = document.body.textContent;
        if (priceRegex.test(bodyText)) {
          indicatorsFound++;
          if (indicatorsFound >= 2) return true;
        }
        
        // Social sharing buttons often present on product pages
        if (document.querySelectorAll('.social-sharing, .share-buttons, [data-share]').length > 0) {
          indicatorsFound++;
        }
        
        // Additional checks for e-commerce sites
        // REI specific checks
        if (url.includes('rei.com')) {
          const reiSpecificSelectors = [
            '#buy-box',
            '[data-id="buy-box"]',
            '.product-color-chips',
            '#size-variation',
            '.product-specifications',
            '[data-ui="recently-viewed"]'
          ];
          
          for (const selector of reiSpecificSelectors) {
            try {
              if (document.querySelector(selector)) {
                indicatorsFound += 2; // Weight these more heavily
                if (indicatorsFound >= 2) return true;
              }
            } catch (e) {
              continue;
            }
          }
        }
        
        return indicatorsFound >= 2;
      });
      
      return hasProductStructure;
    } catch (error) {
      console.error('Error detecting product structure:', error);
      return false;
    }
  }

  /**
   * Detects if the page is a documentation site
   * This is a new method to specifically detect documentation pages
   */
  async detectDocumentationStructure() {
    try {
      const hasDocumentation = await this.page.evaluate(() => {
        // Look for documentation-specific elements
        const docIndicators = [
          // Common doc site elements
          '.documentation', 
          '.docs', 
          '.doc-content',
          '.article__content', // MDN
          '.article-content', // MDN
          '.documentation__main', // MDN
          '.documentation__content',
          '.markdown-body', // GitHub docs and READMEs
          '.markdown-section', // Many doc sites
          '.main-content', // Many documentation sites
          '.content-with-sidebar', // Common docs layout
          
          // API documentation specific
          '.api-docs',
          '.method-list',
          '.parameters',
          '.return-value',
          '.api-documentation',
          
          // MDN specific
          '#content-main', // MDN
          '.main-page-content', // MDN
          '.doc-content', // MDN
          
          // Common doc site classes
          '.installation',
          '.quick-start',
          '.getting-started',
          '.examples',
          '.api-reference',
          '.function-documentation',
          '.class-documentation',
          '.method-documentation',
          '.guide',
          '.tutorial',
          '.reference'
        ];
        
        // Check for presence of documentation indicators
        for (const selector of docIndicators) {
          try {
            const elements = document.querySelectorAll(selector);
            for (const elem of elements) {
              // Skip hidden elements
              if (!elem.offsetParent) continue;
              
              // Check if it has substantial content
              if (elem.textContent && elem.textContent.trim().length > 200) {
                // Look for common documentation patterns
                // Code blocks are strong indicators of documentation
                const codeBlocks = elem.querySelectorAll('pre, code, .highlight, .code-block');
                if (codeBlocks.length > 0) {
                  return true;
                }
                
                // Check for API method signatures
                const methodSignatures = elem.querySelectorAll('.signature, .method-signature, .function-signature');
                if (methodSignatures.length > 0) {
                  return true;
                }
                
                // Check for parameter tables or lists
                const parameterLists = elem.querySelectorAll('.parameters, .params, .parameter-list, .arguments, .props');
                if (parameterLists.length > 0) {
                  return true;
                }
                
                // Check for example sections
                const exampleSections = elem.querySelectorAll('.example, .examples, .demo, .sample');
                if (exampleSections.length > 0) {
                  return true;
                }
              }
            }
          } catch (e) {
            // Skip this selector if there's an error
            continue;
          }
        }
        
        // Look for "table of contents" - common in documentation
        const tocElements = document.querySelectorAll('.table-of-contents, .toc, #toc, .sidebar-toc, .docs-toc');
        if (tocElements.length > 0) {
          return true;
        }
        
        // Check URL patterns common to documentation sites
        const url = window.location.href.toLowerCase();
        const docUrlPatterns = [
          '/docs/', '/documentation/', '/api/', '/reference/', 
          '/guide/', '/tutorial/', '/learn/', '/manual/', 
          '/handbook/', '/developer/', '/sdk/', '/api-reference/',
          '/mdn/', 'mozilla.org/docs', 'developer.mozilla.org'
        ];
        
        for (const pattern of docUrlPatterns) {
          if (url.includes(pattern)) {
            // If URL suggests documentation, check for minimal content indicators
            const contentSections = document.querySelectorAll('article, .content, #content, main, [role="main"]');
            for (const section of contentSections) {
              if (section.textContent.trim().length > 300) {
                return true;
              }
            }
          }
        }
        
        // Check for MDN specific patterns
        if (url.includes('mozilla.org') || url.includes('mdn.')) {
          const mdnElements = document.querySelectorAll('#content, #wikiArticle, .article, .wiki-content');
          if (mdnElements.length > 0) {
            return true;
          }
        }
        
        return false;
      });
      
      return hasDocumentation;
    } catch (error) {
      console.error('Error detecting documentation structure:', error);
      return false;
    }
  }

  /**
   * Detects if the page is a recipe site
   */
  async detectRecipeStructure() {
    try {
      const hasRecipeStructure = await this.page.evaluate(() => {
        // Check for recipe structured data
        const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
        let hasRecipeSchema = false;
        
        for (const element of jsonLdElements) {
          try {
            const parsed = JSON.parse(element.textContent);
            if (parsed['@type'] === 'Recipe' || 
                (Array.isArray(parsed['@type']) && parsed['@type'].includes('Recipe')) ||
                (parsed['@graph'] && parsed['@graph'].some(item => item['@type'] === 'Recipe'))) {
              hasRecipeSchema = true;
              break;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
        
        // Check for recipe-specific selectors
        const recipeSelectors = [
          // Recipe containers and wrappers
          '.recipe', '.recipe-container', '.recipe-card', '.recipe-content',
          '.recipe-body', '.recipe-main', '[itemtype*="Recipe"]', '[typeof*="Recipe"]',
          
          // Recipe components
          '.recipe-ingredients', '.ingredients', '.ingredient-list',
          '.recipe-instructions', '.instructions', '.method', '.directions',
          '.recipe-info', '.recipe-meta', '.recipe-time', '.recipe-yield'
        ];
        
        let hasRecipeElements = false;
        for (const selector of recipeSelectors) {
          try {
            if (document.querySelector(selector)) {
              hasRecipeElements = true;
              break;
            }
          } catch (e) {
            // Ignore errors with selectors
          }
        }
        
        // Check URL patterns
        const url = window.location.href;
        const hasRecipeUrl = /recipe|recipes|cooking|baking|food|\d+-ingredients|how-to-make|homemade/i.test(url);
        
        // Check content patterns
        let hasRecipeContent = false;
        
        // Recipe usually has ingredients list with measurements
        const hasIngredientsList = document.body.textContent.match(/ingredients/i) !== null;
        
        // Recipe usually has cooking time info
        const hasCookingTime = document.body.textContent.match(/prep time|cook time|total time|minute|hour/i) !== null;
        
        // Recipe often has measurement words
        const hasMeasurements = document.body.textContent.match(/cup|tablespoon|teaspoon|pound|ounce|gram|ml|tbsp|tsp/i) !== null;
        
        // Recipe often has numbered steps or directions
        const hasNumberedSteps = document.querySelectorAll('ol li').length > 3 || 
                                document.body.textContent.match(/step \d|direction \d|\d\.\s+[A-Z]/i) !== null;
        
        // Check for common ingredient words
        const hasIngredientWords = document.body.textContent.match(/flour|sugar|butter|salt|oil|eggs|milk|water|vanilla|baking powder|baking soda/i) !== null;
        
        if ((hasIngredientsList) || 
            (hasMeasurements && hasNumberedSteps) || 
            (hasIngredientWords && hasNumberedSteps) ||
            (hasIngredientsList && hasCookingTime)) {
          hasRecipeContent = true;
        }
        
        // Look for headings like "Ingredients" and "Instructions"
        const recipeHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
          .map(h => h.textContent.trim().toLowerCase());
        
        const hasRecipeHeadings = recipeHeadings.some(text => 
          text.includes('ingredient') || 
          text.includes('instruction') || 
          text.includes('direction') || 
          text.includes('method') ||
          text.includes('preparation')
        );
        
        // Compute overall score
        let recipeScore = 0;
        if (hasRecipeSchema) recipeScore += 10;
        if (hasRecipeElements) recipeScore += 5;
        if (hasRecipeUrl) recipeScore += 3;
        if (hasRecipeContent) recipeScore += 5;
        if (hasRecipeHeadings) recipeScore += 5;
        if (hasIngredientsList) recipeScore += 3;
        if (hasMeasurements) recipeScore += 2;
        if (hasNumberedSteps) recipeScore += 3;
        if (hasCookingTime) recipeScore += 2;
        if (hasIngredientWords) recipeScore += 2;
        
        return {
          isRecipe: recipeScore >= 8, // Lower threshold from 10 to 8
          recipeScore,
          hasRecipeSchema,
          hasRecipeElements,
          hasRecipeUrl,
          hasRecipeContent,
          hasRecipeHeadings
        };
      });
      
      if (hasRecipeStructure.isRecipe) {
        console.log(`✅ Recipe structure detected (score: ${hasRecipeStructure.recipeScore})`);
        this.data.structureType = 'recipe';
        return true;
      }
      
      // If URL suggests it's a recipe, give it another chance
      if (this.page.url().match(/recipe|recipes|cooking|baking|food/i)) {
        console.log(`⚠️ URL suggests this might be a recipe, forcing recipe structure`);
        this.data.structureType = 'recipe';
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error detecting recipe structure:', error);
      return false;
    }
  }

  /**
   * Extracts content from content sections
   */
  async extractFromContentSections() {
    try {
      const content = await this.page.evaluate(() => {
        const results = [];
        const sections = document.querySelectorAll('section, .section, [role="region"], [role="contentinfo"]');
        
        for (const section of sections) {
          // Skip hidden elements
          if (!section.offsetParent) continue;
          
          // Get all paragraphs, headings, and lists within the section
          const elements = section.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
          
          for (const elem of elements) {
            const text = elem.textContent.trim();
            if (text.length > 0) {
              results.push(text);
            }
          }
          
          // If no structured elements found, get the raw text
          if (results.length === 0 && section.textContent.trim().length > 0) {
            results.push(section.textContent.trim());
          }
        }
        
        return results;
      });
      
      return content;
    } catch (error) {
      console.error('Error extracting from content sections:', error);
      return [];
    }
  }

  /**
   * Extracts content from single column layouts
   */
  async extractFromSingleColumn() {
    try {
      const content = await this.page.evaluate(() => {
        const results = [];
        
        // Look for common single column content containers
        const contentContainers = document.querySelectorAll('.content, #content, .post-content, .entry-content, .site-content, .page-content, .single-content');
        
        for (const container of contentContainers) {
          // Skip hidden elements
          if (!container.offsetParent) continue;
          
          // Get all paragraphs, headings, and lists within the container
          const elements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
          
          for (const elem of elements) {
            const text = elem.textContent.trim();
            if (text.length > 0) {
              results.push(text);
            }
          }
          
          // If structured elements found in this container, stop
          if (results.length > 0) {
            break;
          }
        }
        
        // If no content found yet, look for content in the body
        if (results.length === 0) {
          const bodyElements = document.querySelectorAll('body p, body h1, body h2, body h3, body h4, body h5, body h6, body ul, body ol, body blockquote');
          
          for (const elem of bodyElements) {
            // Skip if in header, footer, sidebar, nav
            if (
              elem.closest('header') ||
              elem.closest('footer') ||
              elem.closest('aside') ||
              elem.closest('nav') ||
              elem.closest('.sidebar') ||
              elem.closest('.navigation')
            ) {
              continue;
            }
            
            const text = elem.textContent.trim();
            if (text.length > 0) {
              results.push(text);
            }
          }
        }
        
        return results;
      });
      
      return content;
    } catch (error) {
      console.error('Error extracting from single column:', error);
      return [];
    }
  }
  
  /**
   * Extracts content using basic selectors
   * This is a fallback method to get content even if other methods fail
   */
  async extractFromBasic() {
    try {
      const content = await this.page.evaluate(() => {
        const results = [];
        
        // Get text from basic content elements
        const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, div > span, div, section, article');
        
        // Keep track of what we've already seen to avoid duplicates
        const seenTexts = new Set();
        
        for (const elem of contentElements) {
          // Skip elements with no size (likely hidden)
          if (elem.offsetWidth === 0 || elem.offsetHeight === 0) continue;
          
          // Skip navigation, headers, footers, etc.
          if (
            elem.closest('nav') ||
            elem.closest('header') ||
            elem.closest('footer') ||
            elem.closest('aside') ||
            elem.closest('.sidebar') ||
            elem.closest('.navigation') ||
            elem.closest('.menu') ||
            elem.closest('.nav') ||
            elem.closest('.ad') ||
            elem.tagName === 'NAV' ||
            elem.tagName === 'HEADER' ||
            elem.tagName === 'FOOTER' ||
            elem.tagName === 'ASIDE'
          ) {
            continue;
          }
          
          // For divs and sections, only consider those with enough text
          if ((elem.tagName === 'DIV' || elem.tagName === 'SECTION' || elem.tagName === 'ARTICLE') && 
              elem.textContent.trim().length < 100) {
            continue;
          }
          
          const text = elem.textContent.trim();
          
          // Skip empty text or very short text
          if (text.length < 10) continue;
          
          // Skip if we've seen this text before
          if (seenTexts.has(text)) continue;
          
          // Add to results and mark as seen
          results.push(text);
          seenTexts.add(text);
          
          // Limit results to avoid excessive content
          if (results.length >= 500) break;
        }
        
        return results;
      });
      
      return content;
    } catch (error) {
      console.error('Error extracting from basic selectors:', error);
      return [];
    }
  }

  /**
   * Extracts content based on text density analysis
   * Finds areas with highest text-to-code ratio
   */
  async extractFromTextDensity() {
    try {
      const textDensityContent = await this.page.evaluate(() => {
        const results = [];
        
        // Calculate text density for all major elements
        const calculateTextDensity = (element) => {
          if (!element) return 0;
          
          const textLength = element.textContent.trim().length;
          if (textLength === 0) return 0;
          
          const htmlLength = element.innerHTML.length;
          if (htmlLength === 0) return 0;
          
          return textLength / htmlLength;
        };
        
        // Get all potential content containers
        const containers = document.querySelectorAll('div, section, main, article');
        const candidates = [];
        
        // Analyze each container
        for (const container of containers) {
          // Skip small elements, hidden elements, and non-content elements
          if (
            container.textContent.trim().length < 200 ||
            !container.offsetParent ||
            container.matches('nav, header, footer, aside') ||
            container.id && /nav|menu|sidebar|header|footer/i.test(container.id) ||
            container.className && /nav|menu|sidebar|header|footer/i.test(container.className)
          ) {
            continue;
          }
          
          // Count paragraphs - content usually has multiple paragraphs
          const paragraphs = container.querySelectorAll('p');
          
          // Count links - content usually doesn't have too many links relative to text
          const links = container.querySelectorAll('a');
          
          // Skip if too many links relative to paragraphs
          if (paragraphs.length < 2 || (links.length > paragraphs.length * 2)) {
            continue;
          }
          
          // Calculate text density
          const density = calculateTextDensity(container);
          
          // Calculate content score based on multiple factors
          let score = density * 100;
          
          // Bonus for more paragraphs
          score += paragraphs.length * 5;
          
          // Bonus for headings - content often has headings
          score += container.querySelectorAll('h1, h2, h3, h4, h5, h6').length * 10;
          
          // Bonus for images with captions - indicates content
          score += container.querySelectorAll('figure, figcaption, img[alt]').length * 5;
          
          // Bonus for blockquotes - indicates content
          score += container.querySelectorAll('blockquote').length * 5;
          
          // Penalty for ads, iframes, etc.
          score -= container.querySelectorAll('iframe, ins, .ad, .ads, .advertisement').length * 20;
          
          candidates.push({ container, score, paragraphs: paragraphs.length });
        }
        
        // Sort candidates by score
        candidates.sort((a, b) => b.score - a.score);
        
        // Get the top 3 candidates
        const topCandidates = candidates.slice(0, 3);
        
        // Extract content from the best candidates
        for (const candidate of topCandidates) {
          // Get all paragraphs, headings, and lists
          const textElements = candidate.container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
          
          for (const elem of textElements) {
            const text = elem.textContent.trim();
            if (text.length > 0) {
              results.push(text);
            }
          }
          
          // If we got enough content, stop
          if (results.length > 5) {
            break;
          }
        }
        
        return results;
      });
      
      return textDensityContent;
    } catch (error) {
      console.error('Error extracting content using text density:', error);
      return [];
    }
  }

  /**
   * Extracts metadata from the page
   */
  async extractMetadata() {
    try {
      const metadata = await this.page.evaluate(() => {
        return {
          title: document.title || '',
          description: document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '',
          ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
          ogType: document.querySelector('meta[property="og:type"]')?.content || '',
          ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
          ogUrl: document.querySelector('meta[property="og:url"]')?.content || '',
          twitterCard: document.querySelector('meta[name="twitter:card"]')?.content || '',
          twitterTitle: document.querySelector('meta[name="twitter:title"]')?.content || '',
          twitterDescription: document.querySelector('meta[name="twitter:description"]')?.content || '',
          twitterImage: document.querySelector('meta[name="twitter:image"]')?.content || '',
          canonicalUrl: document.querySelector('link[rel="canonical"]')?.href || ''
        };
      });
      
      this.data.metadata = metadata;
      console.log('✅ Extracted metadata');
      
      return metadata;
    } catch (error) {
      console.error('Error extracting metadata:', error);
      return {};
    }
  }
  
  /**
   * Handles infinite scroll pagination
   */
  async handleInfiniteScroll(maxScrolls = 3) {
    try {
      console.log(`🔄 Handling infinite scroll, max scrolls: ${maxScrolls}`);
      
      let previousHeight = 0;
      let scrollCount = 0;
      let contentBefore = this.data.content ? this.data.content.length : 0;
      
      while (scrollCount < maxScrolls) {
        // Scroll to bottom
        previousHeight = await this.page.evaluate('document.body.scrollHeight');
        await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await this.safeWait(2000); // Wait for content to load
        
        // Check if scrollHeight has increased
        const newHeight = await this.page.evaluate('document.body.scrollHeight');
        if (newHeight === previousHeight) {
          console.log('📜 No more content loaded, stopping scroll');
          break;
        }
        
        scrollCount++;
        console.log(`📜 Scrolled ${scrollCount}/${maxScrolls} times, content height: ${newHeight}`);
      }
      
      const newContentItems = this.data.content ? this.data.content.length - contentBefore : 0;
      if (newContentItems > 0) {
        console.log(`✅ Added ${newContentItems} new content items from infinite scroll`);
      }
      
      return newContentItems > 0;
    } catch (error) {
      console.error('Error handling infinite scroll:', error);
      return false;
    }
  }

  /**
   * Handles click-based pagination
   */
  async handleClickPagination(selector, maxClicks = 2) {
    try {
      console.log(`🔄 Handling click pagination for selector: ${selector}, max clicks: ${maxClicks}`);
      
      // Sanitize selector to prevent invalid selectors
      try {
        // Simple check to see if selector might be problematic
        if (selector && (selector.includes(':') || selector.includes('(') || selector.includes('['))) {
          console.log(`⚠️ Potentially problematic selector detected: ${selector}`);
          selector = selector.split('.')[0]; // Just use the tag name part
        }
        
        // Test if the selector is valid
        await this.page.evaluate((sel) => {
          try {
            document.querySelector(sel);
            return true;
          } catch (e) {
            return false;
          }
        }, selector);
      } catch (e) {
        console.warn(`⚠️ Invalid selector: ${selector}. Skipping.`);
        return false;
      }
      
      let clickCount = 0;
      let contentBefore = this.data.content ? this.data.content.length : 0;
      
      while (clickCount < maxClicks) {
        // Try to find and click the pagination button
        const buttonVisible = await this.page.evaluate((selector) => {
          try {
            const button = document.querySelector(selector);
            if (button && button.offsetParent !== null) {
              // Check if button is visible in viewport
              const rect = button.getBoundingClientRect();
              return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= window.innerHeight &&
                rect.right <= window.innerWidth
              );
            }
            return false;
          } catch (e) {
            console.error('Error checking button visibility:', e);
            return false;
          }
        }, selector);
        
        if (!buttonVisible) {
          // Scroll down to make button visible if needed
          await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
          await this.safeWait(1000);
        }
        
        // Try to click the button
        const clicked = await this.page.evaluate((selector) => {
          try {
            const button = document.querySelector(selector);
            if (button && !button.disabled && button.offsetParent !== null) {
              button.click();
              return true;
            }
            return false;
          } catch (e) {
            console.error('Error clicking button:', e);
            return false;
          }
        }, selector);
        
        if (!clicked) {
          console.log(`📜 No clickable button found for selector: ${selector}`);
          return false;
        }
        
        // Wait for new content to load
        await this.safeWait(3000);
        
        clickCount++;
        console.log(`📜 Clicked pagination button ${clickCount}/${maxClicks} times`);
      }
      
      const newContentItems = this.data.content ? this.data.content.length - contentBefore : 0;
      if (newContentItems > 0) {
        console.log(`✅ Added ${newContentItems} new content items from click pagination`);
      }
      
      return newContentItems > 0;
    } catch (error) {
      console.error('Error handling click pagination:', error);
      return false;
    }
  }

  /**
   * Handles URL-based pagination
   */
  async handleUrlPagination(pattern, maxPages = 2) {
    try {
      console.log(`🔄 Handling URL pagination, max pages: ${maxPages}`);
      
      const currentUrl = await this.page.url();
      let pageNumber = 1;
      let contentBefore = this.data.content ? this.data.content.length : 0;
      
      while (pageNumber < maxPages) {
        pageNumber++;
        
        // Generate next page URL based on pattern or detection
        let nextPageUrl;
        
        if (pattern === 'query-param') {
          // For URLs like example.com?page=1
          const urlObj = new URL(currentUrl);
          urlObj.searchParams.set('page', pageNumber.toString());
          nextPageUrl = urlObj.toString();
        } else if (pattern === 'path-segment') {
          // For URLs like example.com/page/1
          nextPageUrl = currentUrl.replace(/\/page\/\d+/, `/page/${pageNumber}`);
          if (nextPageUrl === currentUrl) {
            // If no replacement occurred, assume we need to add page
            nextPageUrl = currentUrl.replace(/\/$/, '') + `/page/${pageNumber}`;
          }
        } else {
          // Try to find pagination links and get next URL
          const nextPageUrlFromLinks = await this.page.evaluate(() => {
            const nextLinks = Array.from(document.querySelectorAll('.pagination a, .pager a, .page-numbers, [aria-label*="next"], [aria-label*="Next"], a[rel="next"]'));
            for (const link of nextLinks) {
              if (link.textContent.includes('Next') || link.textContent.includes('next') || 
                  link.getAttribute('aria-label')?.includes('next') || 
                  link.getAttribute('rel') === 'next') {
                return link.href;
              }
            }
            return null;
          });
          
          if (!nextPageUrlFromLinks) {
            console.log('📜 No next page URL found, stopping pagination');
            break;
          }
          
          nextPageUrl = nextPageUrlFromLinks;
        }
        
        console.log(`📜 Navigating to page ${pageNumber}: ${nextPageUrl}`);
        
        // Navigate to next page
        await this.page.goto(nextPageUrl, { waitUntil: 'domcontentloaded' });
        await this.safeWait(2000); // Wait for content to load
      }
      
      const newContentItems = this.data.content ? this.data.content.length - contentBefore : 0;
      if (newContentItems > 0) {
        console.log(`✅ Added ${newContentItems} new content items from URL pagination`);
      }
      
      return newContentItems > 0;
    } catch (error) {
      console.error('Error handling URL pagination:', error);
      return false;
    }
  }
}

module.exports = { MainExtractor }; 