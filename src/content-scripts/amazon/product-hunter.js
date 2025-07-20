import * as Callbacks from '../../services/helpers/contentScript';

console.log('🔧 Amazon Product Hunter Content Script Loaded!');
console.log('Current URL:', window.location.href);
console.log('Available callbacks:', Object.keys(Callbacks));

// Enhanced Amazon Product Scraper - Works with different Amazon layouts
window.scrapeAmazonProducts = function(maxProducts, onProgress) {
    if (!maxProducts || maxProducts <= 0) {
        console.log('❌ Please specify a valid number of products to scrape');
        return [];
    }
    console.log(`🔍 Starting to scrape ${maxProducts} products...`);
    
    const products = [];
    
    // Try multiple selectors for different Amazon layouts
    const selectors = [
        '[data-component-type="s-search-result"]',
        '.s-result-item[data-component-type="s-search-result"]',
        '.s-result-item',
        '[data-asin]:not([data-asin=""])',
        '.s-card-container',
        '.sg-col-inner .s-card-container',
        '[data-cy="asin-faceout-container"]',
        '[data-testid="product-card"]',
        '.puis-card-container'
    ];
    
    let productContainers = [];
    
    // Try each selector until we find products
    for (const selector of selectors) {
        productContainers = document.querySelectorAll(selector);
        console.log(`Trying selector "${selector}": found ${productContainers.length} containers`);
        if (productContainers.length > 0) break;
    }
    
    if (productContainers.length === 0) {
        console.log('❌ No product containers found. Trying alternative method...');
        return window.tryAlternativeMethod(maxProducts, onProgress);
    }
    
    console.log(`✅ Found ${productContainers.length} product containers`);
    
    // Send initial progress
    if (onProgress) {
        onProgress({
            current: 0,
            total: maxProducts,
            status: 'Starting to scrape products...',
            products: []
        });
    }
    
    for (let i = 0; i < productContainers.length && products.length < maxProducts; i++) {
        const container = productContainers[i];
        
        // Skip sponsored products
        if (window.isSponsored(container)) {
            console.log(`⏭️  Skipping sponsored product ${i + 1}`);
            continue;
        }
        
        const productData = window.extractProductData(container);
        console.log(`🔍 Product data extracted:`, productData);
        if (productData && productData.title && productData.title !== 'N/A' && productData.title.length > 0) {
            products.push(productData);
            console.log(`✅ Product ${products.length}: ${productData.title.substring(0, 50)}...`);
            console.log(`   Price: ${productData.price}, Rating: ${productData.rating}, Reviews: ${productData.reviews}`);
            
            // Send progress update
            if (onProgress) {
                const progressPercent = Math.min((products.length / maxProducts) * 100, 100);
                onProgress({
                    current: products.length,
                    total: maxProducts,
                    percent: progressPercent,
                    status: `Scraped ${products.length} of ${maxProducts} products...`,
                    products: products
                });
            }
        } else {
            console.log(`⚠️  Skipping product ${i + 1} - insufficient data`);
        }
    }
    
    console.log(`\n🎉 Successfully scraped ${products.length} products!`);
    
    if (products.length > 0) {
        // Display results in a nice table
        console.table(products);
        
        // Show summary
        console.log(`\n📊 Summary:`);
        console.log(`Total products: ${products.length}`);
        console.log(`Products with prices: ${products.filter(p => p.price !== 'N/A').length}`);
        console.log(`Products with ratings: ${products.filter(p => p.rating !== 'N/A').length}`);
        console.log(`Prime products: ${products.filter(p => p.hasPrime).length}`);
    } else {
        console.log('❌ No products found. Make sure you\'re on an Amazon search results page.');
    }
    
    return products;
}

window.tryAlternativeMethod = function(maxProducts, onProgress) {
    console.log('🔄 Trying alternative scraping method...');
    
    const products = [];
    
    // Look for any elements that might contain product information
    const possibleContainers = document.querySelectorAll('div[data-asin], div[data-index], .s-item-container, .s-search-result, .s-result-item, [data-cy="asin-faceout-container"], [data-testid="product-card"], .puis-card-container, .AdHolder, .s-card-container');
    
    console.log(`Found ${possibleContainers.length} possible containers`);
    
    // Send initial progress for alternative method
    if (onProgress) {
        onProgress({
            current: 0,
            total: maxProducts,
            status: 'Trying alternative scraping method...',
            products: []
        });
    }
    
    for (let i = 0; i < possibleContainers.length && products.length < maxProducts; i++) {
        const container = possibleContainers[i];
        
        if (window.isSponsored(container)) continue;
        
        const productData = window.extractProductData(container);
        if (productData && productData.title && productData.title !== 'N/A' && productData.title.length > 5) {
            products.push(productData);
            console.log(`✅ Alt method - Product ${products.length}: ${productData.title.substring(0, 50)}...`);
            
            // Send progress update
            if (onProgress) {
                const progressPercent = Math.min((products.length / maxProducts) * 100, 100);
                onProgress({
                    current: products.length,
                    total: maxProducts,
                    percent: progressPercent,
                    status: `Alternative method - Scraped ${products.length} of ${maxProducts} products...`,
                    products: products
                });
            }
        }
    }
    
    if (products.length === 0) {
        console.log('🔄 Trying final fallback method...');
        // Final fallback: look for any div with common Amazon product patterns
        const fallbackContainers = document.querySelectorAll('div[class*="s-result"], div[class*="product"], div[class*="item"], div[id*="result"], div[data-uuid], div[data-cel-widget]');
        console.log(`Found ${fallbackContainers.length} fallback containers`);
        
        for (let i = 0; i < fallbackContainers.length && products.length < maxProducts; i++) {
            const container = fallbackContainers[i];
            if (window.isSponsored(container)) continue;
            
            const productData = window.extractProductData(container);
            if (productData && productData.title && productData.title !== 'N/A' && productData.title.length > 5) {
                products.push(productData);
                console.log(`✅ Fallback - Product ${products.length}: ${productData.title.substring(0, 50)}...`);
            }
        }
        
        if (products.length === 0) {
            console.log(`
❌ Still no products found. Try these troubleshooting steps:

1. Make sure you're on an Amazon search results page
2. Wait for the page to fully load
3. Try scrolling down to load more products
4. Check if you're logged in to Amazon
5. Try running: debugAmazonPage() for more info
            `);
        }
    }
    
    return products;
}

window.isSponsored = function(container) {
    if (!container) return false;
    
    const textContent = container.textContent.toLowerCase();
    const sponsoredKeywords = ['sponsored', 'ad', 'advertisement'];
    
    // Check text content
    for (const keyword of sponsoredKeywords) {
        if (textContent.includes(keyword)) return true;
    }
    
    // Check for sponsored elements
    const sponsoredSelectors = [
        '[data-component-type="s-sponsored-label"]',
        '.s-sponsored-label',
        '[data-sponsored="true"]',
        '.AdHolder',
        '.s-sponsored-list-item'
    ];
    
    for (const selector of sponsoredSelectors) {
        if (container.querySelector(selector)) return true;
    }
    
    return false;
}

window.extractProductData = function(container) {
    try {
        // Title - try multiple selectors
        const titleSelectors = [
            'h2 a span',
            'h2 .a-size-medium',
            'h2 .a-size-base-plus',
            'h2 span',
            '.a-size-base-plus',
            '.a-size-medium',
            '.s-size-mini',
            'a[data-cy="title-recipe-link"] span'
        ];
        let title = 'N/A';
        for (const selector of titleSelectors) {
            const element = container.querySelector(selector);
            if (element && element.textContent.trim().length > 0) {
                title = element.textContent.trim();
                break;
            }
        }

        // Price - comprehensive extraction with multiple strategies
        let price = 'N/A';
        
        // Strategy 1: Look for price elements with currency symbols
        const priceSelectors = [
            '.a-price .a-offscreen',
            '.a-price .a-price-whole',
            '.a-price-range .a-offscreen',
            '.a-price-range .a-price-whole',
            '.a-price .a-price-whole + .a-price-fraction',
            '.a-price-range .a-price-whole + .a-price-fraction',
            '.a-price .a-price-symbol + .a-price-whole',
            '.a-price-range .a-price-symbol + .a-price-whole',
            '.a-price .a-price-fraction',
            '.a-price-range .a-price-fraction',
            '.a-price .a-price-symbol',
            '.a-price-range .a-price-symbol',
        ];
        
        for (const selector of priceSelectors) {
            const element = container.querySelector(selector);
            if (element && element.textContent.trim().length > 0) {
                const priceText = element.textContent.trim();
                // Validate that this looks like a price
                if (priceText.match(/[£$€¥₹]|\d+\.\d{2}|\d+,\d{2}/) && !priceText.includes('XBOX') && !priceText.includes('PlayStation')) {
                    price = priceText;
                    break;
                }
            }
        }
        
        // Strategy 2: Look for any element containing price patterns
        if (price === 'N/A') {
            const allElements = container.querySelectorAll('*');
            for (const element of allElements) {
                const text = element.textContent.trim();
                // Look for price patterns: £XX.XX, £XX,XX, $XX.XX, etc.
                if (text.match(/[£$€¥₹]\s*\d+[.,]\d{2}|[£$€¥₹]\s*\d+/) && 
                    !text.includes('XBOX') && 
                    !text.includes('PlayStation') && 
                    text.length < 30 &&
                    !text.includes('out of') &&
                    !text.includes('stars')) {
                    price = text;
                    break;
                }
            }
        }
        
        // Strategy 3: Look for aria-labels containing price information
        if (price === 'N/A') {
            const priceElements = container.querySelectorAll('[aria-label*="price"], [aria-label*="£"], [aria-label*="$"]');
            for (const element of priceElements) {
                const ariaLabel = element.getAttribute('aria-label');
                if (ariaLabel && ariaLabel.match(/[£$€¥₹]\s*\d+[.,]\d{2}|[£$€¥₹]\s*\d+/)) {
                    price = ariaLabel;
                    break;
                }
            }
        }
        
        // Strategy 4: Look for data attributes containing price
        if (price === 'N/A') {
            const dataElements = container.querySelectorAll('[data-price], [data-currency]');
            for (const element of dataElements) {
                const dataPrice = element.getAttribute('data-price') || element.getAttribute('data-currency');
                if (dataPrice && dataPrice.match(/[£$€¥₹]\s*\d+[.,]\d{2}|[£$€¥₹]\s*\d+/)) {
                    price = dataPrice;
                    break;
                }
            }
        }

        // Rating
        const ratingSelectors = [
            '.a-icon-alt',
            '[data-cy="reviews-block"] .a-icon-alt',
            '.a-star-medium .a-icon-alt',
            '[aria-label*="out of 5 stars"]',
        ];
        let rating = 'N/A';
        for (const selector of ratingSelectors) {
            const element = container.querySelector(selector);
            if (element && element.textContent.trim().length > 0) {
                rating = element.textContent.trim();
                break;
            }
        }

        // Reviews count - improved selectors
        const reviewsSelectors = [
            '[aria-label$="ratings"]',
            '[aria-label$="rating"]',
            '.a-size-base.s-underline-text',
            '.a-link-normal .a-size-base',
            '.a-row.a-size-small span[aria-label]',
            'a[href*="#customerReviews"]',
            'a[href*="#customerReviews"] span',
            '.a-link-normal .a-size-small',
            '.a-size-base',
        ];
        let reviews = 'N/A';
        for (const selector of reviewsSelectors) {
            const element = container.querySelector(selector);
            if (element && element.textContent.trim().length > 0 && /[0-9]/.test(element.textContent)) {
                reviews = element.textContent.trim();
                break;
            }
        }

        // Product URL
        const linkSelectors = [
            'h2 a',
            'a[data-cy="title-recipe-link"]',
            '.a-link-normal'
        ];
        let productUrl = 'N/A';
        for (const selector of linkSelectors) {
            const element = container.querySelector(selector);
            if (element && element.href) {
                productUrl = element.href;
                break;
            }
        }

        // Image - improved for lazy loading
        let imageUrl = 'N/A';
        const imgElement = container.querySelector('.s-image, img[data-image-index], img.s-img, img');
        if (imgElement) {
            imageUrl = imgElement.src || imgElement.getAttribute('data-src') || imgElement.getAttribute('data-lazy') || 'N/A';
        }

        // Prime
        const primeElement = container.querySelector('[aria-label*="Prime"], .a-icon-prime');
        const hasPrime = !!primeElement;

        // ASIN (Amazon Standard Identification Number)
        const asin = container.getAttribute('data-asin') || 'N/A';

        return {
            title,
            price,
            rating,
            reviews,
            url: productUrl,
            imageUrl,
            hasPrime,
            asin
        };
    } catch (error) {
        console.error('Error extracting product:', error);
        return null;
    }
}



// Debug function to help troubleshoot
window.debugAmazonPage = function() {
    console.log('🔍 Debugging Amazon page structure...');
    
    const allDivs = document.querySelectorAll('div');
    console.log(`Total divs on page: ${allDivs.length}`);
    
    const withDataAsin = document.querySelectorAll('[data-asin]');
    console.log(`Elements with data-asin: ${withDataAsin.length}`);
    
    const searchResults = document.querySelectorAll('[data-component-type="s-search-result"]');
    console.log(`Elements with s-search-result: ${searchResults.length}`);
    
    const sResultItems = document.querySelectorAll('.s-result-item');
    console.log(`Elements with s-result-item class: ${sResultItems.length}`);
    
    const cardContainers = document.querySelectorAll('.s-card-container');
    console.log(`Elements with s-card-container: ${cardContainers.length}`);
    
    // Check URL
    console.log(`Current URL: ${window.location.href}`);
    console.log(`Is Amazon domain: ${window.location.href.includes('amazon')}`);
    console.log(`Is search page: ${window.location.href.includes('/s?')}`);
    
    // Look for any h2 elements (titles)
    const h2Elements = document.querySelectorAll('h2');
    console.log(`H2 elements found: ${h2Elements.length}`);
    
    if (h2Elements.length > 0) {
        console.log('Sample H2 content:', h2Elements[0].textContent.substring(0, 100));
    }
    
    // Debug price elements
    const priceElements = document.querySelectorAll('.a-price, .a-price-whole, .a-price-fraction, .a-offscreen');
    console.log(`Price elements found: ${priceElements.length}`);
    if (priceElements.length > 0) {
        console.log('Sample price elements:');
        for (let i = 0; i < Math.min(5, priceElements.length); i++) {
            console.log(`  ${i + 1}. "${priceElements[i].textContent.trim()}"`);
        }
    }
    
    // Debug all elements with currency symbols
    const allElements = document.querySelectorAll('*');
    const currencyElements = [];
    for (const element of allElements) {
        const text = element.textContent.trim();
        if (text.match(/[£$€¥₹]\s*\d+[.,]\d{2}|[£$€¥₹]\s*\d+/) && text.length < 50) {
            currencyElements.push({
                text: text,
                tagName: element.tagName,
                className: element.className
            });
        }
    }
    console.log(`Elements with currency symbols found: ${currencyElements.length}`);
    if (currencyElements.length > 0) {
        console.log('Sample currency elements:');
        for (let i = 0; i < Math.min(10, currencyElements.length); i++) {
            console.log(`  ${i + 1}. "${currencyElements[i].text}" (${currencyElements[i].tagName}.${currencyElements[i].className})`);
        }
    }
    
    return {
        success: true,
        message: 'Debug completed successfully',
        data: {
            totalDivs: allDivs.length,
            withDataAsin: withDataAsin.length,
            searchResults: searchResults.length,
            sResultItems: sResultItems.length,
            cardContainers: cardContainers.length,
            h2Elements: h2Elements.length,
            priceElements: priceElements.length,
            isAmazonDomain: window.location.href.includes('amazon'),
            isSearchPage: window.location.href.includes('/s?')
        }
    };
}

// Add global functions for testing
window.testAmazonScraper = () => {
  console.log('Testing Amazon scraper from global scope...');
  return { success: true, message: 'Content script is working!' };
};

window.debugAmazonPageGlobal = () => {
  console.log('Debug Amazon page from global scope...');
  return window.debugAmazonPage();
};

window.scrapeAmazonProductsGlobal = (maxProducts) => {
  console.log('Scrape Amazon products from global scope...');
  if (!maxProducts || maxProducts <= 0) {
    return { success: false, message: 'Please specify a valid number of products to scrape' };
  }
  try {
    const products = window.scrapeAmazonProducts(maxProducts);
    return { success: true, products: products, total: products.length };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Add the working scraper code as a fallback
window.scrapeAmazonProductsWorking = (maxProducts) => {
  console.log(`🔍 Starting to scrape ${maxProducts} products with working method...`);
  if (!maxProducts || maxProducts <= 0) {
    return { success: false, message: 'Please specify a valid number of products to scrape' };
  }
  try {
    const products = window.scrapeAmazonProducts(maxProducts);
    return { success: true, products: products, total: products.length };
  } catch (error) {
    console.error('Working scraper failed:', error);
    return { success: false, message: error.message };
  }
};

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    console.log('🔧 Content script received message:', req.callback);
    console.log('🔧 Message payload:', req.payload);
    
    if (req.callback === 'debugAmazonPage') {
      console.log('🔧 Calling debugAmazonPage...');
      const result = window.debugAmazonPage();
      console.log('🔧 Debug result:', result);
      sendResponse(result);
    } else if (req.callback === 'scrapeAmazonProducts') {
      console.log('🔧 Calling scrapeAmazonProducts...');
      try {
        const maxProducts = req.payload?.maxProducts;
        if (!maxProducts || maxProducts <= 0) {
          sendResponse({ success: false, message: 'Please specify a valid number of products to scrape' });
          return;
        }
        
        // Create progress callback to send updates to background script
        const onProgress = (progressData) => {
          chrome.runtime.sendMessage({
            callback: 'updateScrapingProgress',
            payload: {
              ...progressData,
              tabId: req.payload?.tabId
            }
          });
        };
        
        const products = window.scrapeAmazonProducts(maxProducts, onProgress);
        const result = { success: true, products: products, total: products.length };
        console.log('🔧 Scrape result:', result);
        sendResponse(result);
      } catch (error) {
        console.log('🔧 Scrape error:', error);
        sendResponse({ success: false, message: error.message });
      }
    } else if (req.callback === 'stopAmazonScraping') {
      console.log('🔧 Calling stopAmazonScraping...');
      const result = { success: true, message: 'Scraping stopped' };
      sendResponse(result);
    } else if (req.callback === 'testContentScript') {
      console.log('🔧 Calling testContentScript...');
      const result = { success: true, message: 'Content script is working!' };
      sendResponse(result);
    } else {
      console.log('🔧 Handling other callback:', req.callback);
      // Handle other existing callbacks
      if (Callbacks[req.callback]) {
        Callbacks[req.callback](req.payload);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, message: 'Callback not found' });
      }
    }
  } catch (e) {
    console.log('❌ Error in content script:', e);
    sendResponse({ success: false, message: e.message });
  }
  return true;
});

document.onreadystatechange = async () => {
  console.log('State', document.readyState);
  if (document.readyState === 'complete') {
    await Callbacks.AmazonProductHunter(document);
  }
};

// ============================================
// USAGE INSTRUCTIONS:
// ============================================

console.log(`
🚀 Enhanced Amazon Product Scraper Ready!

Usage:
1. scrapeAmazonProducts(10)     // Scrape 10 products
2. scrapeAmazonProducts(50)     // Scrape 50 products  
3. scrapeAmazonProducts(n)      // Scrape n products (specify your number)

Troubleshooting:
- debugAmazonPage()             // Check page structure
- Make sure you're on Amazon search results page
- Wait for page to fully load before running

The scraper will:
✓ Skip sponsored products
✓ Extract product details
✓ Show results in console
✓ Work with different Amazon layouts
✓ Display results in the extension UI

Example: scrapeAmazonProducts(5) to scrape 5 products
`);