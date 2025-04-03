/**
 * MainExtractor - Content extraction focused on trying all possible methods
 * 
 * This class implements multiple extraction methods and tries all of them
 * on every page to maximize content extraction.
 */

// Import default options from utils
const { DEFAULT_OPTIONS } = require('./defaultOptions');

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
      images: [],
      metadata: {}
    };
    
    // Add compatibility for different Puppeteer versions
    this.ensureCompatibility();
  }
  
  /**
   * Ensure compatibility with different Puppeteer versions
   */
  ensureCompatibility() {
    try {
      // Try to add waitForFunction if it doesn't exist
      if (!this.page.waitForFunction) {
        this.page.waitForFunction = async (pageFunction, options = {}, ...args) => {
          return await this.page.evaluate(pageFunction, ...args);
        };
      }
    } catch (error) {
      // Silently continue if we can't add compatibility
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
      let newContent = [];
      
      // Extract title if not already set
      if (!this.data.title) {
        this.data.title = await this.extractTitle();
      }
      
      // Try ALL extraction methods unconditionally - pure brute force
      const recipesContent = await this.extractFromRecipes();
      newContent.push(...(recipesContent || []));
      
      const articleContent = await this.extractFromArticle();
      newContent.push(...(articleContent || []));
      
      const mainContent = await this.extractFromMainContent();
      newContent.push(...(mainContent || []));
      
      const semanticContent = await this.extractFromSemantic();
      newContent.push(...(semanticContent || []));
      
      const headerContentFooter = await this.extractFromHeaderContentFooter();
      newContent.push(...(headerContentFooter || []));
      
      const multiColumnContent = await this.extractFromMultiColumn();
      newContent.push(...(multiColumnContent || []));
      
      const contentSections = await this.extractFromContentSections();
      newContent.push(...(contentSections || []));
      
      const singleColumnContent = await this.extractFromSingleColumn();
      newContent.push(...(singleColumnContent || []));
      
      const largestContent = await this.extractFromLargest();
      newContent.push(...(largestContent || []));
      
      const productContent = await this.extractFromProduct();
      newContent.push(...(productContent || []));
      
      const docContent = await this.extractFromDocumentation();
      newContent.push(...(docContent || []));
      
      const basicContent = await this.extractFromBasic();
      newContent.push(...(basicContent || []));
      
      const textDensityContent = await this.extractFromTextDensity();
      newContent.push(...(textDensityContent || []));
      
      // Always extract images
      await this.extractImages();
      
      // Add any content in this extraction that wasn't already present
      const existingContentSet = new Set(this.data.content.map(item => item.trim()));
      const uniqueNewContent = newContent.filter(item => 
        item && 
        !existingContentSet.has(item.trim())
      );
      
      // Add unique new content to existing content
      this.data.content = [
        ...this.data.content,
        ...uniqueNewContent.map(item => item.trim())
      ];
      
      // Always extract metadata
      await this.extractMetadata();
      
      return this.data;
    } catch (error) {
      return this.data;
    }
  }

  /**
   * Applies all pagination approaches in brute force mode
   */
  async attemptPagination() {
    try {
      // First try URL parameter pagination
      await this.handleUrlPagination('page/{num}', DEFAULT_OPTIONS.pages);
      
      // Then try infinite scroll
      await this.handleInfiniteScroll(DEFAULT_OPTIONS.maxScrolls);
      
      // Try ALL click-based pagination selectors without condition
      const paginationSelectors = [
        '.pagination a', '.pager a', '.page-numbers', 
        '[aria-label*="page"]', '[aria-label*="Page"]', '.pages a',
        'a.next', 'button.next', '[rel="next"]', '.load-more',
        '.more', '.next', '.view-more', '.show-more', 
        '.load-more-button', '.load-more-link', '.pagination__next',
        '.pagination-next', '.pagination__item--next', '.pagination-item-next',
        '[data-page-next]', '[data-testid="pagination-next"]', 
        '.react-paginate .next', '.rc-pagination-next',
        '.paging-next', '.nextPage', '.next-page',
        'li.next a', 'span.next a', 'button[rel="next"]',
        'a[rel="next"]', 'a.nextLink', 'a.nextpage',
        '[data-pagination="next"]', '[data-test="pagination-next"]',
        '.Pagination-module--next', '[data-component="next"]',
        'button:contains("Next")', 'a:contains("Next")', 
        'button:contains("More")', 'a:contains("More")',
        'button:contains("Load")', 'a:contains("Load")',
        'button:contains("Show")', 'a:contains("Show")'
      ];
      
      // Try every click pagination selector
      for (const selector of paginationSelectors) {
        await this.handleClickPagination(selector, DEFAULT_OPTIONS.maxScrolls);
      }
      
      return true;
    } catch (error) {
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
      return [];
    }
  }

  /**
   * Extracts content from the largest content block on the page
   * This is a fallback method when other methods fail
   */
  async extractFromLargest() {
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
      return [];
    }
  }

  /**
   * Extracts content from elements with semantic meaning
   * Looks for elements with semantic roles or schema.org attributes
   */
  async extractFromSemantic() {
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
      return [];
    }
  }

  /**
   * Extract content from recipe pages
   */
  async extractFromRecipes() {
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
        this.data.structureType = 'recipe';
        return true;
      }
      
      // If URL suggests it's a recipe, give it another chance
      if (this.page.url().match(/recipe|recipes|cooking|baking|food/i)) {
        this.data.structureType = 'recipe';
        return true;
      }
      
      return false;
    } catch (error) {
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
      return [];
    }
  }
  
  /**
   * Extracts content using basic selectors
   * Pure brute force approach without filtering
   */
  async extractFromBasic() {
    try {
      const content = await this.page.evaluate(() => {
        const results = [];
        
        // Get text from all content elements
        const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, div > span, div, section, article');
        
        for (const elem of contentElements) {
          const text = elem.textContent.trim();
          
          // Include all text
          if (text.length > 0) {
            results.push(text);
          }
        }
        
        return results;
      });
      
      return content;
    } catch (error) {
      return [];
    }
  }

  /**
   * Extracts content based on text density 
   * No filtering, just extract from all elements
   */
  async extractFromTextDensity() {
    try {
      const textDensityContent = await this.page.evaluate(() => {
        const results = [];
        
        // Get all potential content containers without filtering
        const containers = document.querySelectorAll('div, section, main, article');
        
        // Extract from all containers
        for (const container of containers) {
          // Get all text elements within this container
          const textElements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, code, pre');
          
          for (const textElem of textElements) {
            const text = textElem.textContent.trim();
            if (text.length > 0) {
              results.push(text);
            }
          }
          
          // If no structured elements, get raw text
          if (textElements.length === 0 && container.textContent.trim().length > 0) {
            results.push(container.textContent.trim());
          }
        }
        
        return results;
      });
      
      return textDensityContent;
    } catch (error) {
      return [];
    }
  }

  /**
   * Extracts metadata from the page
   */
  async extractMetadata() {
    try {
      const metadata = await this.page.evaluate(() => {
        const result = {};
        
        // Extract meta tags
        const metaTags = document.querySelectorAll('meta');
        for (const meta of metaTags) {
          const name = meta.getAttribute('name') || meta.getAttribute('property');
          const content = meta.getAttribute('content');
          if (name && content) {
            result[name] = content;
          }
        }
        
        // Extract JSON-LD
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        if (jsonLdScripts.length > 0) {
          result.jsonLd = [];
          for (const script of jsonLdScripts) {
            try {
              const json = JSON.parse(script.textContent);
              result.jsonLd.push(json);
            } catch (e) {
              // Ignore invalid JSON
            }
          }
        }
        
        return result;
      });
      
      // Store metadata in the data object without logging
      this.data.metadata = metadata;
      return metadata;
    } catch (error) {
      return {};
    }
  }
  
  /**
   * Handle infinite scroll pagination
   */
  async handleInfiniteScroll(maxScrolls = DEFAULT_OPTIONS.maxScrolls) {
    try {
      // Pure brute force - just scroll maxScrolls times with no detection
      for (let i = 0; i < maxScrolls; i++) {
        // Scroll to bottom
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        // Wait using default delay
        await this.safeWait(DEFAULT_OPTIONS.scrollDelay);
        
        // Extract content after each scroll
        await this.extract();
      }
    } catch (error) {
      // Silent failure
    }
  }

  /**
   * Handles click-based pagination
   */
  async handleClickPagination(selector, maxClicks = DEFAULT_OPTIONS.maxScrolls) {
    try {
      let clickCount = 0;
      let previousContentLength = this.data.content ? this.data.content.length : 0;
      
      while (clickCount < maxClicks) {
        // Try to click the button - brute force, no detection
        await this.page.evaluate((sel) => {
          const buttons = document.querySelectorAll(sel);
          if (buttons && buttons.length > 0) {
            for (const button of buttons) {
              try {
                button.click();
              } catch (e) {
                // Ignore errors and try next button
              }
            }
          }
        }, selector);
        
        // Wait for content to load
        await this.safeWait(DEFAULT_OPTIONS.scrollDelay);
        
        // Extract any new content
        await this.extract();
        
        clickCount++;
      }
      
      // Check if we added any new content
      const newContentItems = this.data.content ? 
        this.data.content.length - previousContentLength : 0;
      
      return newContentItems > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle URL-based pagination
   */
  async handleUrlPagination(pattern, maxPages = DEFAULT_OPTIONS.pages) {
    try {
      let currentUrl = this.page.url();
      let baseUrl = currentUrl.split('?')[0].split('#')[0];
      let pageNumber = 1;
      
      const previousContentLength = this.data.content ? this.data.content.length : 0;
      
      // Just try different page number patterns sequentially
      while (pageNumber < maxPages) {
        pageNumber++;
        
        // Try different URL patterns without detection
        const patterns = [
          `/page/${pageNumber}`,
          `/p/${pageNumber}`,
          `?page=${pageNumber}`,
          `&page=${pageNumber}`,
          `-${pageNumber}`,
          `_${pageNumber}`,
          `/${pageNumber}`
        ];
        
        for (const pat of patterns) {
          try {
            // Try both appending to base and replacing numbers in current URL
            let nextPageUrl = baseUrl + pat;
            
            // Go to next page
            await this.page.goto(nextPageUrl, { waitUntil: 'networkidle2' });
            await this.safeWait(DEFAULT_OPTIONS.scrollDelay);
            
            // Extract content
            await this.extract();
          } catch (e) {
            // Ignore errors and try next pattern
            continue;
          }
        }
      }
      
      // Check if we added any new content
      const newContentItems = this.data.content ? 
        this.data.content.length - previousContentLength : 0;
      
      return newContentItems > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract the page title using various methods
   */
  async extractTitle() {
    try {
      const title = await this.page.evaluate(() => {
        // Try different ways to get the title
        return document.querySelector('h1')?.textContent?.trim() ||
               document.title?.trim() ||
               document.querySelector('meta[property="og:title"]')?.content?.trim() ||
               document.querySelector('meta[name="twitter:title"]')?.content?.trim() ||
               '';
      });
      
      return title;
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract all images from the page without filtering
   */
  async extractImages() {
    try {
      // Extract all img elements
      const images = await this.page.evaluate(() => {
        // Helper to generate an absolute URL
        const toAbsoluteUrl = (relativeUrl) => {
          try {
            return new URL(relativeUrl, window.location.href).href;
          } catch (e) {
            return relativeUrl;
          }
        };

        // Get ALL images on the page without filtering
        const imgElements = Array.from(document.querySelectorAll('img'));
        
        // Extract image data from all images
        return imgElements.map(img => {
          return {
            url: toAbsoluteUrl(img.src || img.dataset.src || ''),
            alt: img.alt || '',
            title: img.title || '',
            width: img.width || 0,
            height: img.height || 0
          };
        }).filter(img => img.url); // Only filter out images without URLs
      });
      
      // Add unique images to the data
      if (images && images.length > 0) {
        const existingUrls = new Set(this.data.images.map(img => img.url));
        const uniqueImages = images.filter(img => !existingUrls.has(img.url));
        this.data.images = [...this.data.images, ...uniqueImages];
      }
      
      return this.data.images;
    } catch (error) {
      return [];
    }
  }
}

module.exports = { MainExtractor };