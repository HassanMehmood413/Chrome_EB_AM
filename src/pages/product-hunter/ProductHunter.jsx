import { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  notification,
  Row,
  Typography,
  Button,
  Input,
  Col,
  InputNumber,
  Checkbox,
  Progress,
  Table
} from 'antd';
import { sortBy } from 'lodash';
import EcomMiracleBlack from '../popup/ecom-miracle-black.png';
import {
  getLocal,
  onChange as onChangeLocalState,
  setLocal
} from '../../services/dbService';
import { PagesLayout } from '../../components/shared/pagesLayout';
import { PageBtn } from '../../components/shared/buttons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const useStyles = makeStyles({
  mainDiv: {
    margin: '10px 15px 10px 15px'
  },
  header: {
    marginTop: '1px'
  },
  clearImportButtons: {
    marginTop: '5px',
    gap: '5px'
  },
  searchButtons: {
    marginTop: '5px',
    gap: '5px',
    alignItems: 'center'
  }
});

const ProductHunter = () => {
  const classes = useStyles();

  const columns = [
    {
      title: 'Image',
      key: 'image',
      render: (_, record) => {
        const imageUrl = record.amazonImageLink || record.imageUrl || 'N/A';
        return (
          <img 
            src={imageUrl} 
            className='w-20 h-20 object-contain' 
            alt='No Image'
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg2MFY2MEgyMFYyMFoiIGZpbGw9IiNEN0Q3RDciLz4KPHN2ZyB4PSIzMCIgeT0iMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMTkgM0g1QzMuOSAzIDMgMy45IDMgNVYxOUMzIDIwLjEgMy45IDIxIDUgMjFIMTlDMjAuMSAyMSAyMSAyMC4xIDIxIDE5VjVDMjEgMy45IDIwLjEgMyAxOSAzWk0xOSAxOUg1VjVIMTlWMTlaIiBmaWxsPSIjOTk5OTk5Ii8+CjxwYXRoIGQ9Ik0xMiAxMkMxMy42NTY5IDEyIDE1IDEwLjY1NjkgMTUgOUMxNSA3LjM0MzE1IDEzLjY1NjkgNiAxMiA2QzEwLjM0MzEgNiA5IDcuMzQzMTUgOSA5QzkgMTAuNjU2OSAxMC4zNDMxIDEyIDEyIDEyWk0xMiA4QzEyLjU1MjMgOCAxMyA4LjQ0Nzc0IDEzIDlDMTMgOS41NTIyNiAxMi41NTIzIDEwIDEyIDEwQzExLjQ0NzcgMTAgMTEgOS41NTIyNiAxMSA5QzExIDguNDQ3NzQgMTEuNDQ3NyA4IDEyIDhaIiBmaWxsPSIjOTk5OTk5Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
            }}
          />
        );
      }
    },
    {
      title: 'Title',
      key: 'title',
      render: (_, record) => {
        const title = record.amazonTitle || record.title || 'N/A';
        const url = record.amazonProductLink || record.url || '#';
        return (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {title}
          </a>
        );
      }
    },
    {
      title: 'Price',
      key: 'price',
      render: (_, record) => {
        const price = record.amazonPrice || record.price || 'N/A';
        return <span className="font-semibold text-green-600">{price}</span>;
      }
    },
    {
      title: 'Rating',
      key: 'rating',
      render: (_, record) => {
        const rating = record.rating || 'N/A';
        return <span>{rating}</span>;
      }
    },
    {
      title: 'Reviews',
      key: 'reviews',
      render: (_, record) => {
        const reviews = record.amazonReviews || record.reviews || 'N/A';
        return <span>{reviews}</span>;
      }
    },
    {
      title: 'SKU',
      key: 'sku',
      render: (_, record) => {
        // View SKU button opens the product's Amazon link in a new tab
        return (
          <Button
            type="primary"
            onClick={() => {
              const url = record.amazonProductLink || record.url;
              if (url) window.open(url, '_blank');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" alt="Amazon" style={{ width: 18, height: 18 }} />
            View SKU
          </Button>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record, index) => {
        console.log('Actions column render:', { record, index });
        return (
          <button
            onClick={() => handleRemoveProduct(index)}
            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 border border-red-300 bg-red-50"
            title="Remove product"
            style={{ minWidth: '32px', minHeight: '32px' }}
          >
            ✕
          </button>
        );
      }
    }
  ];

  const [isSearching, setIsSearching] = useState(false);
  const [productTitles, setProductTitles] = useState(['']);
  const [amazonHuntedProducts, setAmazonHuntedProducts] = useState([]);
  const [percentage, setPercentage] = useState(0);
  const [totalTitles, setTotalTitles] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [results5AtATime, setResults5AtATime] = useState(false);
  const [isFiltersApplied, setIsFiltersApplied] = useState(false);
  const [localRunScriptStatus, setLocalRunScriptStatus] = useState('');
  const [sortPrice, setSortPrice] = useState('');
  const [resultFilters, setResultFilters] = useState({
    minPrice: 0,
    maxPrice: 0,
    minReviews: 0,
    maxReviews: 0
  });
  const [hunterSettings, setHunterSettings] = useState({
    resultFetchLimit: 2,
    minPrice: 0,
    maxPrice: 0,
    minReviews: 0,
    maxReviews: 0,
    amazonChoice: false,
    bestSeller: false,
    duplicateItem: false,
    veroItem: false,
    removeBooks: false,
    amazonIsSeller: false,
    itemsWithWords: '',
    highestReviewed: false,
    isPrime: false
  });

  // URL Scraping State
  const [urlToScrape, setUrlToScrape] = useState('');
  const [urlScrapeLimit, setUrlScrapeLimit] = useState(20); // New state for URL scraping limit
  const [scrapingProgress, setScrapingProgress] = useState(0);
  const [isUrlScraping, setIsUrlScraping] = useState(false);
  const [scrapedProducts, setScrapedProducts] = useState([]);
  const [scrapingStatus, setScrapingStatus] = useState('');

  const handlePauseResume = async (runScriptStatus) => {
    await setLocal('run-script-status', runScriptStatus);
    setLocalRunScriptStatus(runScriptStatus);

    if (runScriptStatus === 'resume') {
      handleResumeAmazonTab();
    }
  };

  const handleProductTitles = async (value) => {
    const userId = await getLocal('current-user');
    await setLocal('product-hunter-titles', []);

    let titles = value.split('\n');
    // titles = titles.filter(title => title);
    titles = [...new Set(titles)];

    let chromeStorageTitles = await getLocal('product-hunter-titles');
    if (chromeStorageTitles.length) {
      chromeStorageTitles = [...chromeStorageTitles, ...titles];
      chromeStorageTitles = [...new Set(chromeStorageTitles)];

      await setLocal('product-hunter-titles', chromeStorageTitles);
      await setLocal('product-hunter-titles-persisted', chromeStorageTitles);

      setProductTitles(chromeStorageTitles);
    } else {
      if (value) {
        await setLocal('product-hunter-titles', titles);
        await setLocal('product-hunter-titles-persisted', titles);
        setProductTitles(titles);
      } else {
        await setLocal('product-hunter-titles', []);
        await setLocal('product-hunter-titles-persisted', []);
        setProductTitles([]);
      }
    }

    setTotalTitles(titles.length);
    await setLocal(
      `result-percentage-add-value-${userId}`,
      100 / titles.length
    );
  };

  const handleResumeAmazonTab = async () => {
    const userId = await getLocal('current-user');
    const productHunterTitles = await getLocal('product-hunter-titles');
    await setLocal(`run-script-${userId}`, true);

    const domain = await getLocal(`selected-domain-${userId}`);

    //https://www.amazon.com/s?k=water+bottle&rh=p_6:ATVPDKIKX0DER,p_85:2470955011&s=review-rank
    //https://www.amazon.co.uk/s?k=lipstick&rh=p_6%3AA3P5ROKL5A1OLE //this is good one
    //https://www.amazon.co.uk/s?k=lipstick&rh=sfs%3A1%2Cp_85%3A569035031

    let amazonLink = 'https://www.amazon.com';
    let marketplaceId = 'ATVPDKIKX0DER';
    // let primeId = '2470955011';
    if (domain === 'UK') {
      amazonLink = 'https://www.amazon.co.uk';
      marketplaceId = 'A3P5ROKL5A1OLE';
      // primeId = '569035031';
    }
    amazonLink += `/s?k=${encodeURIComponent(productHunterTitles[0])}`;

    if (hunterSettings?.amazonIsSeller) {
      amazonLink += `&rh=p_6:${marketplaceId}`;

      // if (hunterSettings?.isPrime) {
      //   amazonLink += `&rh=p_85:${primeId}`;
      // }
    }
    if (hunterSettings?.highestReviewed) {
      amazonLink += 's=review-rank';
    }

    await chrome.runtime.sendMessage({
      payload: {
        url: amazonLink,
        active: false
      },
      callback: 'openTab'
    });
  };

  const handleAmazonTabAll = async () => {
    setIsSearching(true);
    const userId = await getLocal('current-user');
    await setLocal('run-script-status', '');
    await setLocal('single-title-fetch-limit', 0);

    const titles = productTitles.filter((title) => title);
    setProductTitles(titles);
    setTotalTitles(titles.length);
    await setLocal('product-hunter-titles', titles);
    await setLocal('product-hunter-titles-persisted', titles);
    await setLocal(
      `result-percentage-add-value-${userId}`,
      100 / titles.length
    );
    await setLocal(`run-script-${userId}`, true);
    await setLocal(`result-percentage-${userId}`, 0);

    const domain = await getLocal(`selected-domain-${userId}`);

    let amazonLink = 'https://www.amazon.com';
    let marketplaceId = 'ATVPDKIKX0DER';

    if (domain === 'UK') {
      amazonLink = 'https://www.amazon.co.uk';
      marketplaceId = 'A1F83G8C2ARO7P';
    }

    // Build enhanced search URL with filters
    let baseUrl = `${amazonLink}/s?k=${encodeURIComponent(titles[0])}`;
    
    if (hunterSettings.isPrime) {
      baseUrl += `&rh=p_85:${domain === 'UK' ? '569035031' : '2470955011'}`;
    }
    
    if (hunterSettings.amazonIsSeller) {
      baseUrl += `&rh=p_6:${marketplaceId}`;
    }
    
    if (hunterSettings.bestSeller) {
      baseUrl += '&rh=n:16225007011,p_72:1248879011';
    }
    
    if (hunterSettings.highestReviewed) {
      baseUrl += '&s=review-rank';
    }

    setScrapingStatus('Opening Amazon search page...');
    
    console.log('eComMiracle Searcher All opened tab with URL:', baseUrl);
         const newTab = await chrome.runtime.sendMessage({
       callback: 'openTab',
       payload: {
         url: baseUrl,
         active: false
       }
     });

    if (!newTab) {
      setIsSearching(false);
      return;
    }

    console.log('eComMiracle Searcher All opened tab:', newTab);
    
    // Wait for page to load and find the tab
    let targetTab = null;
    let attempts = 0;
    const maxAttempts = 20;

    while (!targetTab && attempts < maxAttempts) {
      attempts++;
      console.log(`eComMiracle Searcher All: Attempt ${attempts} to find target tab...`);
      setScrapingStatus(`Finding Amazon tab... (attempt ${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const tabs = await chrome.tabs.query({});
        targetTab = tabs.find(tab => 
          tab.url && 
          tab.url.includes('amazon') && 
          tab.id === newTab.id
        );
      } catch (error) {
        console.log('eComMiracle Searcher All: Tab not found yet, waiting...');
      }
    }

    if (targetTab) {
      console.log('eComMiracle Searcher All: Target tab found:', targetTab);
    } else {
      console.log('eComMiracle Searcher All: Could not find the opened Amazon tab');
      setScrapingStatus('Could not find the opened Amazon tab');
      setIsSearching(false);
      return;
    }

    // Wait for page to load
    setScrapingStatus('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify tab still exists before injecting
    try {
      await chrome.tabs.get(targetTab.id);
    } catch (tabError) {
      console.log('eComMiracle Searcher All: Tab no longer exists:', tabError);
      setScrapingStatus('Tab was closed');
      setIsSearching(false);
      return;
    }

    // Inject content script
    setScrapingStatus('Injecting content script...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        files: ['content-scripts/amazon/product-hunter.js']
      });
      console.log('eComMiracle Searcher All: Content script injected successfully');
    } catch (injectionError) {
      console.log('eComMiracle Searcher All: Content script injection failed:', injectionError);
      setScrapingStatus('Failed to inject content script');
      setIsUrlScraping(false);
      setIsSearching(false);
      return;
    }
    
    // Wait for content script to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
         // Start scraping ALL products (no limit)
     setScrapingStatus('Starting to scrape products...');
     console.log('eComMiracle Searcher All: Starting scraping...');
     const scrapeResult = await chrome.tabs.sendMessage(targetTab.id, {
       callback: 'scrapeAmazonProducts',
       payload: {
         maxProducts: 9999, // Large number to scrape all products on page
         tabId: targetTab.id
       }
     });
    
    console.log('eComMiracle Searcher All: Scraping result:', scrapeResult);
    
    if (scrapeResult && scrapeResult.success) {
      // Let progress monitoring handle the UI updates
      
      // Store in local storage
      await setLocal(`amazon-hunted-products-${userId}`, scrapeResult.products);
      
      // Set final progress to 100% for the progress bar
      await setLocal('amazon-scraping-progress', {
        status: 'Scraping completed successfully!',
        progress: 100,
        currentProduct: scrapeResult.products.length,
        totalProducts: scrapeResult.products.length
      });
      
      console.log('eComMiracle Searcher All: Products updated successfully');
      setScrapingStatus('Scraping completed successfully!');
      setScrapingProgress(100);
      
      notification.success({
        message: 'Scraping Complete',
        description: `Successfully scraped all ${scrapeResult.products.length} products from the page`
      });
      
    } else {
      console.log('eComMiracle Searcher All: Scraping failed:', scrapeResult);
      setScrapingStatus('Scraping failed');
      notification.error({
        message: 'Scraping Failed',
        description: scrapeResult?.error || 'Unknown error occurred'
      });
    }
    
    setIsSearching(false);
  };

  const handleAmazonTab = async () => {
    setIsSearching(true);
    const userId = await getLocal('current-user');
    await setLocal('run-script-status', '');
    await setLocal('single-title-fetch-limit', 0);

    const titles = productTitles.filter((title) => title);
    setProductTitles(titles);
    setTotalTitles(titles.length);
    await setLocal('product-hunter-titles', titles);
    await setLocal('product-hunter-titles-persisted', titles);
    await setLocal(
      `result-percentage-add-value-${userId}`,
      100 / titles.length
    );
    await setLocal(`run-script-${userId}`, true);
    await setLocal(`result-percentage-${userId}`, 0);

    const domain = await getLocal(`selected-domain-${userId}`);

    //https://www.amazon.com/s?k=water+bottle&rh=p_6:ATVPDKIKX0DER,p_85:2470955011&s=review-rank
    //https://www.amazon.co.uk/s?k=lipstick&rh=p_6%3AA3P5ROKL5A1OLE //this is good one
    //https://www.amazon.co.uk/s?k=lipstick&rh=sfs%3A1%2Cp_85%3A569035031

    let amazonLink = 'https://www.amazon.com';
    let marketplaceId = 'ATVPDKIKX0DER';
    // let primeId = '2470955011';
    if (domain === 'UK') {
      amazonLink = 'https://www.amazon.co.uk';
      marketplaceId = 'A3P5ROKL5A1OLE';
      // primeId = '569035031';
    }
    amazonLink += `/s?k=${encodeURIComponent(productTitles[0])}`;

    if (hunterSettings?.amazonIsSeller) {
      amazonLink += `&rh=p_6:${marketplaceId}`;

      // if (hunterSettings?.isPrime) {
      //   amazonLink += `&rh=p_85:${primeId}`;
      // }
    }
    if (hunterSettings?.highestReviewed) {
      amazonLink += 's=review-rank';
    }

    // Open the tab
    const newTab = await chrome.runtime.sendMessage({
      payload: {
        url: amazonLink,
        active: false
      },
      callback: 'openTab'
    });

    console.log('eComMiracle Searcher opened tab:', newTab);

    // Set scraping state to enable progress monitoring
    setIsUrlScraping(true);
    setScrapingProgress(0);
    setPercentage(0);
    setScrapedProducts([]);
    setScrapingStatus('Opening Amazon search page...');
    
    // Clear any existing progress data
    await setLocal('amazon-scraping-progress', null);

    // Wait for page to load and then trigger scraping
    setTimeout(async () => {
      try {
        // Find the specific tab that was just opened
        let targetTab = null;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!targetTab && attempts < maxAttempts) {
          attempts++;
          console.log(`eComMiracle Searcher: Attempt ${attempts} to find target tab...`);
          setScrapingStatus(`Finding Amazon tab... (attempt ${attempts}/${maxAttempts})`);
          
          const allTabs = await chrome.tabs.query({});
          targetTab = allTabs.find(tab => 
            tab.url && tab.url.includes('amazon') && 
            (tab.url.includes(amazonLink.split('?')[0]) || tab.url.includes(amazonLink.split('/s?')[0]))
          );
          
          if (!targetTab) {
            console.log('eComMiracle Searcher: Tab not found yet, waiting...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        console.log('eComMiracle Searcher: Target tab found:', targetTab);
        
        if (!targetTab) {
          console.log('eComMiracle Searcher: Could not find the opened Amazon tab');
          setScrapingStatus('Could not find the opened Amazon tab');
          setIsUrlScraping(false);
          setIsSearching(false);
          return;
        }
        
        // Wait for page to be fully loaded
        setScrapingStatus('Waiting for page to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify tab still exists before injecting
        try {
          await chrome.tabs.get(targetTab.id);
        } catch (tabError) {
          console.log('eComMiracle Searcher: Tab no longer exists:', tabError);
          setScrapingStatus('Tab was closed');
          setIsUrlScraping(false);
          setIsSearching(false);
          return;
        }
        
        // Manually inject content script if needed
        setScrapingStatus('Injecting content script...');
        try {
          await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            files: ['amazon_product_hunter_script.bundle.js']
          });
          console.log('eComMiracle Searcher: Content script injected successfully');
        } catch (injectionError) {
          console.log('eComMiracle Searcher: Content script injection failed:', injectionError);
          setScrapingStatus('Failed to inject content script');
          setIsUrlScraping(false);
          setIsSearching(false);
          return;
        }
        
        // Wait for content script to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start scraping with user-defined limit
        setScrapingStatus('Starting to scrape products...');
        console.log('eComMiracle Searcher: Starting scraping...');
        const scrapeResult = await chrome.tabs.sendMessage(targetTab.id, {
          callback: 'scrapeAmazonProducts',
          payload: {
            maxProducts: hunterSettings.resultFetchLimit || 20,
            tabId: targetTab.id
          }
        });
        
        console.log('eComMiracle Searcher: Scraping result:', scrapeResult);
        
        if (scrapeResult && scrapeResult.success) {
          // Let progress monitoring handle the UI updates
          
          // Store in local storage
          await setLocal(`amazon-hunted-products-${userId}`, scrapeResult.products);
          
          // Set final progress to 100% for the progress bar
          await setLocal('amazon-scraping-progress', {
            percent: 100,
            status: 'Scraping completed successfully!',
            products: scrapeResult.products,
            total: scrapeResult.total || scrapeResult.products.length
          });
          setScrapingProgress(100);
          setPercentage(100);
          
          console.log('eComMiracle Searcher: Products updated successfully');
          setScrapingStatus('Scraping completed successfully!');
          
          // Set final progress to 100% for the progress bar
          await setLocal('amazon-scraping-progress', {
            percent: 100,
            status: 'Scraping completed successfully!',
            products: scrapeResult.products,
            total: scrapeResult.total || scrapeResult.products.length
          });
          setScrapingProgress(100);
          setPercentage(100);
        } else {
          console.log('eComMiracle Searcher: Scraping failed:', scrapeResult);
          setScrapingStatus('Scraping failed');
        }
        
        // Stop scraping state
        setIsUrlScraping(false);
        setIsSearching(false);
        
      } catch (error) {
        console.error('eComMiracle Searcher: Error during scraping:', error);
        setScrapingStatus(`Error: ${error.message}`);
        setIsUrlScraping(false);
        setIsSearching(false);
      }
    }, 3000); // Wait 3 seconds before starting scraping
  };

  const handleTerminate = async (status) => {
    setIsSearching(false);
    const userId = await getLocal('current-user');
    if (status === 'pause') await setLocal('run-script-status', '');
    else await setLocal('run-script-status', 'terminate');

    await setLocal('single-title-fetch-limit', 0);
    await setLocal('product-hunter-titles', []);
    await setLocal(`result-percentage-add-value-${userId}`, 0);
    await setLocal(`run-script-${userId}`, false);
    await setLocal(`result-percentage-${userId}`, 0);
  };

  const changeHuntedProducts = (param1, huntedProducts) => {
    // Ensure huntedProducts is always an array
    const safeProducts = Array.isArray(huntedProducts) ? huntedProducts : [];
    setTotalProducts(safeProducts.length);
    setAmazonHuntedProducts(safeProducts);
  };

  const changeResultPercentage = (param1, percentageValue) => {
    setPercentage(percentageValue);
  };

  const handleFilterResults = async (
    results5AtATime,
    isFiltersApplied,
    sortPrice
  ) => {
    const userId = await getLocal('current-user');

    const products = await getLocal(`amazon-hunted-products-${userId}`);
    let updatedProducts = products?.map((item) => {
      let price = item.amazonPrice;
      if (!price) {
        price = '$0';
      }

      return {
        ...item,
        amazonPrice: price
      };
    });

    if (results5AtATime) {
      updatedProducts = updatedProducts.slice(0, 5);
    } else {
      const products = await getLocal(`amazon-hunted-products-${userId}`);
      updatedProducts = products?.map((item) => {
        let price = item.amazonPrice;
        if (!price) {
          price = '$0';
        }

        return {
          ...item,
          amazonPrice: price
        };
      });
    }

    if (isFiltersApplied) {
      const {
        minPrice = 0,
        maxPrice = 0,
        minReviews = 0,
        maxReviews = 0
      } = resultFilters || {};

      if (!minPrice && !maxPrice && !minReviews && !maxReviews) return;

      if (minPrice && maxPrice) {
        updatedProducts = updatedProducts.filter((item) => {
          const priceValue = parseFloat(
            item.amazonPrice.replace(/[^0-9.]/g, '')
          ); // Use regex to remove the '$'

          return priceValue >= minPrice && priceValue <= maxPrice;
        });
      } else if (minPrice && !maxPrice) {
        updatedProducts = updatedProducts.filter((item) => {
          const priceValue = parseFloat(
            item.amazonPrice.replace(/[^0-9.]/g, '')
          ); // Use regex to remove the '$'

          return priceValue >= minPrice;
        });
      } else if (!minPrice && maxPrice) {
        updatedProducts = updatedProducts.filter((item) => {
          const priceValue = parseFloat(
            item.amazonPrice.replace(/[^0-9.]/g, '')
          ); // Use regex to remove the '$'

          return priceValue <= maxPrice;
        });
      }

      if (minReviews && maxReviews) {
        updatedProducts = updatedProducts.filter(
          (item) =>
            item.amazonReviews >= minReviews && item.amazonReviews <= maxReviews
        );
      } else if (minReviews && !maxReviews) {
        updatedProducts = updatedProducts.filter(
          (item) => item.amazonReviews >= minReviews
        );
      } else if (!minReviews && maxReviews) {
        updatedProducts = updatedProducts.filter(
          (item) => item.amazonReviews <= maxReviews
        );
      }
    }

    if (sortPrice === 'highToLow') {
      updatedProducts = sortBy(updatedProducts, (item) =>
        parseFloat(item.amazonPrice.slice(1))
      ).reverse();
    } else if (sortPrice === 'lowToHigh') {
      updatedProducts = sortBy(updatedProducts, (item) =>
        parseFloat(item.amazonPrice.slice(1))
      );
    }

    // Ensure updatedProducts is always an array
    const safeProducts = Array.isArray(updatedProducts) ? updatedProducts : [];
    setTotalProducts(safeProducts.length);
    setAmazonHuntedProducts(safeProducts);
  };

  const handleOpen5AtATime = async () => {
    handleFilterResults(!results5AtATime, isFiltersApplied, sortPrice);
    setResults5AtATime(!results5AtATime);
  };

  const handleSortPrice = async () => {
    if (!sortPrice || sortPrice === 'lowToHigh') {
      handleFilterResults(results5AtATime, isFiltersApplied, 'highToLow');
      setSortPrice('highToLow');
    } else {
      handleFilterResults(results5AtATime, isFiltersApplied, 'lowToHigh');
      setSortPrice('lowToHigh');
    }
  };

  const handleChangeFilter = async (key, value) => {
    const userId = await getLocal('current-user');

    const filtersObj = {
      ...resultFilters,
      [key]: value || 0
    };

    setResultFilters(filtersObj);
    await setLocal(`result-filters-${userId}`, filtersObj);
  };

  const handleApplyFilters = async () => {
    handleFilterResults(results5AtATime, !isFiltersApplied, sortPrice);
    setIsFiltersApplied(!isFiltersApplied);
  };

  const copyToClip = () => {
    const urls = amazonHuntedProducts
      .map((product) => product.amazonProductLink)
      .filter((url) => url && url !== '#');
    const urlText = urls.join('\n');
    navigator.clipboard.writeText(urlText);
    notification.success({
      message: 'Success',
      description: `${urls.length} Amazon URLs copied to clipboard`
    });
  };

  const addAllUrlsToLister = async () => {
    try {
      // Extract all Amazon URLs from scraped products and convert to ASIN format
      const urls = amazonHuntedProducts
        .map((product) => product.amazonProductLink)
        .filter((url) => url && url !== '#')
        .map(url => {
          // Clean the URL by removing unwanted characters and trimming
          let cleanUrl = url.trim();
          console.log('Original URL:', url);
          
          // Remove @ symbol and any other unwanted characters at the beginning
          cleanUrl = cleanUrl.replace(/^[@\s]+/, '');
          
          // Also remove any unwanted characters that might be at the beginning
          cleanUrl = cleanUrl.replace(/^[^\w]*/, '');
          
          // Additional cleaning: remove any @ symbols anywhere in the URL
          cleanUrl = cleanUrl.replace(/@/g, '');
          
          // Extract ASIN from the URL
          const asinMatch = cleanUrl.match(/\/dp\/([A-Z0-9]{10})|\/product\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
          let asin = null;
          
          if (asinMatch) {
            asin = asinMatch[1] || asinMatch[2] || asinMatch[3];
          }
          
          if (asin) {
            // Return the formatted URL with ASIN
            const formattedUrl = `https://www.amazon.co.uk/dp/${asin}`;
            console.log('Formatted URL:', formattedUrl);
            return formattedUrl;
          } else {
            console.log('No ASIN found in URL:', cleanUrl);
            return null;
          }
        })
        .filter(url => url !== null); // Remove null URLs where ASIN couldn't be extracted

      if (urls.length === 0) {
        notification.warning({
          message: 'No URLs Available',
          description: 'No Amazon URLs with valid ASINs found in the scraped products'
        });
        return;
      }

      // Store URLs in local storage for the lister to access
      await setLocal('bulk-lister-urls', urls);
      await setLocal('bulk-lister-source', 'product-hunter');

      notification.success({
        message: 'URLs Added to Lister',
        description: `${urls.length} Amazon URLs have been added to the lister queue`
      });

      // Navigate to the bulk lister page
      window.location.href = '/bulk-lister.html';
    } catch (error) {
      console.error('Error adding URLs to lister:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to add URLs to lister: ' + error.message
      });
    }
  };

  const handleClearResultButton = async () => {
    const userId = await getLocal('current-user');

    await setLocal(`amazon-hunted-products-${userId}`, []);

    setTotalProducts(0);
    setAmazonHuntedProducts([]);
    setPercentage(0); // Reset main progress bar
    setScrapingProgress(0); // Reset scraping progress
  };

  const handleRemoveProduct = (index) => {
    // Ensure amazonHuntedProducts is always an array
    const currentProducts = Array.isArray(amazonHuntedProducts) ? amazonHuntedProducts : [];
    const updatedProducts = [...currentProducts];
    updatedProducts.splice(index, 1);
    setAmazonHuntedProducts(updatedProducts);
    setTotalProducts(updatedProducts.length);
  };

  const handleSettingsChange = async (key, value) => {
    let settingsObj = {};
    const previousSettings = await getLocal('product-hunter-settings');
    if (!previousSettings) {
      settingsObj = {
        [key]: value
      };
    } else {
      settingsObj = {
        ...previousSettings,
        [key]: value
      };
    }

    setHunterSettings(settingsObj);
    await setLocal('product-hunter-settings', settingsObj);
  };

  const handleRunScriptStateChange = (oldVal, newVal) => {
    setIsSearching(newVal);
  };

  const handleLogs = (oldVal, newVal) => {
    console.log('🚀 ~ ProductHunter Logs:', newVal);
  };

  // URL Scraping Functions
  const handleUrlScrapeAll = async () => {
    if (!urlToScrape.trim()) {
      notification.error({
        message: 'Error',
        description: 'Please enter a valid Amazon URL'
      });
      return;
    }

    setIsUrlScraping(true);
    setScrapingProgress(0);
    setPercentage(0); // Reset main progress bar
    setScrapedProducts([]);
    setScrapingStatus('Opening URL in new tab...');
    
    // Clear any existing progress data
    await setLocal('amazon-scraping-progress', null);

    try {
      // Open URL in new tab
      console.log('Opening URL for scrape all:', urlToScrape);
      const newTab = await chrome.runtime.sendMessage({
        callback: 'openTab',
        payload: {
          url: urlToScrape,
          active: false
        }
      });

      if (!newTab) {
        throw new Error('Failed to open new tab');
      }

      // Wait for page to load and find the tab
      setScrapingStatus('Waiting for page to load...');
      let targetTab = null;
      let attempts = 0;
      const maxAttempts = 20;

      while (!targetTab && attempts < maxAttempts) {
        attempts++;
        setScrapingStatus(`Waiting for page to load... (attempt ${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          const tabs = await chrome.tabs.query({});
          targetTab = tabs.find(tab => 
            tab.url && 
            tab.url.includes('amazon') && 
            tab.id === newTab.id
          );
        } catch (error) {
          console.log('Error querying tabs:', error);
        }
      }

      if (!targetTab) {
        setScrapingStatus('Could not find the opened Amazon tab. The page may still be loading.');
        setIsUrlScraping(false);
        return;
      }

      // Check if it's an Amazon page
      if (!targetTab.url.includes('amazon')) {
        setIsUrlScraping(false);
        notification.error({
          message: 'Error',
          description: 'Not on an Amazon page. Please make sure the URL is a valid Amazon search page.'
        });
        return;
      }

      // Manually inject content script if needed
      try {
        console.log('Injecting content script into tab for scrape all:', targetTab.id);

        // Verify tab still exists before injecting
        try {
          await chrome.tabs.get(targetTab.id);
        } catch (tabError) {
          console.log('Tab no longer exists:', tabError);
          setScrapingStatus('Tab was closed. Please try again.');
          setIsUrlScraping(false);
          notification.error({
            message: 'Error',
            description: 'The Amazon tab was closed. Please try again.'
          });
          return;
        }

        // Try to inject content script
        try {
          await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            files: ['amazon_product_hunter_script.bundle.js']
          });
          console.log('Content script manually injected successfully for scrape all');
        } catch (injectionError) {
          console.log('Content script injection failed for scrape all, trying again:', injectionError);
          // Wait a bit more and try again
          await new Promise(resolve => setTimeout(resolve, 3000));
          await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            files: ['amazon_product_hunter_script.bundle.js']
          });
        }

        // Wait a bit for the content script to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test if content script is working by sending a test message
        try {
          const testResult = await chrome.tabs.sendMessage(targetTab.id, {
            callback: 'testContentScript'
          });
          console.log('Content script test result for scrape all:', testResult);
        } catch (testError) {
          console.log('Content script test failed for scrape all, but continuing:', testError);
          // Don't fail here, just continue
        }
      } catch (error) {
        console.log('Content script injection failed for scrape all:', error);
        setScrapingStatus('Failed to inject content script - page may still be loading');
        setIsUrlScraping(false);
        notification.error({
          message: 'Error',
          description: 'Failed to inject content script. Please wait for the page to fully load and try again.'
        });
        return;
      }

      setScrapingStatus('Debugging page structure...');

      // Debug the page first
      console.log('Sending debugAmazonPage message for scrape all to tab:', targetTab.id);
      let debugResult;
      try {
        debugResult = await Promise.race([
          chrome.tabs.sendMessage(targetTab.id, {
            callback: 'debugAmazonPage',
            payload: {
              tabId: targetTab.id
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Debug timeout after 15 seconds')), 15000)
          )
        ]);
        console.log('Debug result for scrape all:', debugResult);
        
        if (!debugResult) {
          throw new Error('No response received from debugAmazonPage');
        }
      } catch (error) {
        console.error('Debug failed for scrape all:', error);
        setScrapingStatus(`Debug failed: ${error.message}`);
        setIsUrlScraping(false);
        notification.error({
          message: 'Debug Failed',
          description: `Failed to debug page: ${error.message}. Please check if the Amazon page loaded correctly.`
        });
        return;
      }

      if (!debugResult.success) {
        setScrapingStatus('Page not suitable for scraping');
        setIsUrlScraping(false);
        notification.error({
          message: 'Error',
          description: debugResult.message
        });
        return;
      }

      setScrapingStatus('Starting to scrape products...');

      // Wait a bit more to ensure page is fully loaded
      await new Promise(resolve => setTimeout(resolve, 2000));

        // Start scraping ALL products (no limit)
        console.log('Sending scrapeAmazonProducts message for scrape all to tab:', targetTab.id);
        const scrapeResult = await chrome.tabs.sendMessage(targetTab.id, {
          callback: 'scrapeAmazonProducts',
          payload: {
            maxProducts: 100, // Large number to scrape all products on page
            tabId: targetTab.id
          }
        });
        console.log('Scrape all result:', scrapeResult);

        if (scrapeResult.success) {
          console.log('Scrape all result received:', scrapeResult);
          
          // Add scraped products to the main results
          const newProducts = scrapeResult.products.map(product => ({
            ...product,
            // Map scraped data to expected format
            amazonTitle: product.title,
            amazonPrice: product.price,
            amazonReviews: product.reviews,
            amazonProductLink: product.url,
            amazonImageLink: product.imageUrl,
            hasPrime: product.hasPrime || false, // Preserve Prime status
            key: `scraped-all-${Date.now()}-${Math.random()}` // Add unique key
          }));
          
          console.log('Mapped new products from scrape all:', newProducts);
          
          setAmazonHuntedProducts(prev => {
            // Ensure prev is always an array to prevent spread operator errors
            const currentProducts = Array.isArray(prev) ? prev : [];
            const updated = [...currentProducts, ...newProducts];
            console.log('Updated amazonHuntedProducts from scrape all:', updated);
            return updated;
          });
          setTotalProducts(prev => {
            const newTotal = prev + newProducts.length;
            console.log('Updated totalProducts from scrape all:', newTotal);
            return newTotal;
          });
          setScrapedProducts([]); // Clear scraped products since they're now in main results
          
          setScrapingStatus(`Successfully scraped ${scrapeResult.products.length} products and added to results`);
          setScrapingProgress(100); // set progress to 100%
          
          // Update the main progress bar to show completion
          setPercentage(100);
          
          // Wait a moment to show 100% completion
          setTimeout(() => {
            setIsUrlScraping(false); // stop loading
            notification.success({
              message: 'Success',
              description: `Scraped all ${scrapeResult.products.length} products and added to results`
            });
          }, 1000);
        } else {
          console.log('Scrape all failed:', scrapeResult);
          setScrapingStatus('Scraping failed');
          setScrapingProgress(0);
          notification.error({
            message: 'Error',
            description: scrapeResult.message
          });
        }
        
    } catch (error) {
      console.error('Error in handleUrlScrapeAll:', error);
      setScrapingStatus(`Error: ${error.message}`);
      notification.error({
        message: 'Error',
        description: error.message || 'Failed to scrape products'
      });
    } finally {
      setIsUrlScraping(false);
    }
  };

  const handleUrlScrape = async () => {
    if (!urlToScrape.trim()) {
      notification.error({
        message: 'Error',
        description: 'Please enter a valid Amazon URL'
      });
      return;
    }

    setIsUrlScraping(true);
    setScrapingProgress(0);
    setPercentage(0); // Reset main progress bar
    setScrapedProducts([]);
    setScrapingStatus('Opening URL in new tab...');
    
    // Clear any existing progress data
    await setLocal('amazon-scraping-progress', null);

    try {
      // Open URL in new tab
      console.log('Opening URL:', urlToScrape);
      const newTab = await chrome.runtime.sendMessage({
        callback: 'openTab',
        payload: {
          url: urlToScrape,
          active: false
        }
      });
      
      console.log('New tab created:', newTab);
      
      // Wait for page to load and find the tab
      setScrapingStatus('Waiting for page to load...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Find the specific tab that was just opened
      let targetTab = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!targetTab && attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts} to find target tab...`);
        
        const allTabs = await chrome.tabs.query({});
        targetTab = allTabs.find(tab => 
          tab.url && tab.url.includes('amazon') && 
          (tab.url.includes(urlToScrape.split('?')[0]) || tab.url.includes(urlToScrape.split('/s?')[0]))
        );
        
        if (!targetTab) {
          console.log('Tab not found yet, waiting...');
          setScrapingStatus(`Waiting for page to load... (attempt ${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log('Target tab found:', targetTab);
      
      if (!targetTab) {
        setScrapingStatus('Could not find the opened Amazon tab. The page may still be loading.');
        setIsUrlScraping(false);
        notification.error({
          message: 'Error',
          description: 'Could not find the opened Amazon tab. Please wait for the page to fully load and try again.'
        });
        return;
      }
      
      // Check if we're on the correct Amazon domain
      if (!targetTab.url || (!targetTab.url.includes('amazon.com') && !targetTab.url.includes('amazon.co.uk'))) {
        setScrapingStatus('Not on an Amazon page. Please make sure the URL is a valid Amazon search page.');
        setIsUrlScraping(false);
        notification.error({
          message: 'Error',
          description: 'Not on an Amazon page. Please make sure the URL is a valid Amazon search page.'
        });
        return;
      }
      
      // Manually inject content script if needed
      try {
        console.log('Injecting content script into tab:', targetTab.id);
        

        
        // Verify tab still exists before injecting
        try {
          await chrome.tabs.get(targetTab.id);
        } catch (tabError) {
          console.log('Tab no longer exists:', tabError);
          setScrapingStatus('Tab was closed. Please try again.');
          setIsUrlScraping(false);
          notification.error({
            message: 'Error',
            description: 'The Amazon tab was closed. Please try again.'
          });
          return;
        }
        
        // Try to inject content script
        try {
          await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            files: ['amazon_product_hunter_script.bundle.js']
          });
          console.log('Content script manually injected successfully');
        } catch (injectionError) {
          console.log('Content script injection failed, trying again:', injectionError);
          // Wait a bit more and try again
          await new Promise(resolve => setTimeout(resolve, 3000));
          await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            files: ['amazon_product_hunter_script.bundle.js']
          });
        }
        
        // Wait a bit for the content script to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test if content script is working by sending a test message
        try {
          const testResult = await chrome.tabs.sendMessage(targetTab.id, {
            callback: 'testContentScript'
          });
          console.log('Content script test result:', testResult);
        } catch (testError) {
          console.log('Content script test failed, but continuing:', testError);
          // Don't fail here, just continue
        }
      } catch (error) {
        console.log('Content script injection failed:', error);
        setScrapingStatus('Failed to inject content script - page may still be loading');
        setIsUrlScraping(false);
        notification.error({
          message: 'Error',
          description: 'Failed to inject content script. Please wait for the page to fully load and try again.'
        });
        return;
      }

      setScrapingStatus('Debugging page structure...');

      // Debug the page first
      console.log('Sending debugAmazonPage message directly to tab:', targetTab.id);
      let debugResult;
      try {
        debugResult = await Promise.race([
          chrome.tabs.sendMessage(targetTab.id, {
            callback: 'debugAmazonPage',
            payload: {
              tabId: targetTab.id
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Debug timeout after 15 seconds')), 15000)
          )
        ]);
        console.log('Debug result:', debugResult);
        
        if (!debugResult) {
          throw new Error('No response received from debugAmazonPage');
        }
      } catch (error) {
        console.error('Debug failed:', error);
        setScrapingStatus(`Debug failed: ${error.message}`);
        setIsUrlScraping(false);
        notification.error({
          message: 'Debug Failed',
          description: `Failed to debug page: ${error.message}. Please check if the Amazon page loaded correctly.`
        });
        return;
      }

      if (!debugResult.success) {
        setScrapingStatus('Page not suitable for scraping');
        setIsUrlScraping(false);
        notification.error({
          message: 'Error',
          description: debugResult.message
        });
        return;
      }

      setScrapingStatus('Starting to scrape products...');

      // Wait a bit more to ensure page is fully loaded
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Start scraping with user-defined limit
      console.log('Sending scrapeAmazonProducts message directly to tab:', targetTab.id);
      const scrapeResult = await chrome.tabs.sendMessage(targetTab.id, {
        callback: 'scrapeAmazonProducts',
        payload: {
          maxProducts: urlScrapeLimit || 20,
          tabId: targetTab.id
        }
      });
      console.log('Scrape result:', scrapeResult);

      if (scrapeResult.success) {
        console.log('Scrape result received:', scrapeResult);
        
        // Add scraped products to the main results
        const newProducts = scrapeResult.products.map(product => ({
          ...product,
          // Map scraped data to expected format
          amazonTitle: product.title,
          amazonPrice: product.price,
          amazonReviews: product.reviews,
          amazonProductLink: product.url,
          amazonImageLink: product.imageUrl,
          hasPrime: product.hasPrime || false, // Preserve Prime status
          key: `scraped-${Date.now()}-${Math.random()}` // Add unique key
        }));
        
        console.log('Mapped new products:', newProducts);
        
        setAmazonHuntedProducts(prev => {
          // Ensure prev is always an array to prevent spread operator errors
          const currentProducts = Array.isArray(prev) ? prev : [];
          const updated = [...currentProducts, ...newProducts];
          console.log('Updated amazonHuntedProducts:', updated);
          return updated;
        });
        setTotalProducts(prev => {
          const newTotal = prev + newProducts.length;
          console.log('Updated totalProducts:', newTotal);
          return newTotal;
        });
        setScrapedProducts([]); // Clear scraped products since they're now in main results
        
        setScrapingStatus(`Successfully scraped ${scrapeResult.products.length} products and added to results`);
        setScrapingProgress(100); // set progress to 100%
        
        // Update the main progress bar to show completion
        setPercentage(100);
        
        // Wait a moment to show 100% completion
        setTimeout(() => {
          setIsUrlScraping(false); // stop loading
          notification.success({
            message: 'Success',
            description: `Scraped ${scrapeResult.products.length} products and added to results`
          });
        }, 1000);
      } else {
        console.log('Scrape failed:', scrapeResult);
        setScrapingStatus('Scraping failed');
        notification.error({
          message: 'Error',
          description: scrapeResult.message
        });
      }

    } catch (error) {
      setScrapingStatus('Error occurred during scraping');
      setScrapingProgress(0);
      notification.error({
        message: 'Error',
        description: error.message
      });
    } finally {
      setIsUrlScraping(false);
    }
  };

  const stopUrlScraping = async () => {
    try {
      // Find the target tab again
      const allTabs = await chrome.tabs.query({});
      const targetTab = allTabs.find(tab => 
        tab.url && tab.url.includes('amazon') && 
        (tab.url.includes(urlToScrape.split('?')[0]) || tab.url.includes(urlToScrape.split('/s?')[0]))
      );
      
      if (targetTab) {
        await chrome.runtime.sendMessage({
          callback: 'stopAmazonScraping',
          payload: {
            tabId: targetTab.id
          }
        });
      }
      setScrapingStatus('Scraping stopped by user');
      setScrapingProgress(0);
      setIsUrlScraping(false);
    } catch (error) {
      console.error('Error stopping scraping:', error);
    }
  };

  // Monitor scraping progress
  useEffect(() => {
    const checkProgress = async () => {
      try {
        const progress = await getLocal('amazon-scraping-progress');
        if (progress) {
          // Update progress bar
          if (progress.percent !== undefined) {
            setScrapingProgress(progress.percent);
            // Also update main progress bar when scraping is active
            if (isUrlScraping || isSearching) {
              setPercentage(progress.percent);
            }
          } else if (progress.current && progress.total) {
            const calculatedPercent = (progress.current / progress.total) * 100;
            setScrapingProgress(calculatedPercent);
            // Also update main progress bar when scraping is active
            if (isUrlScraping || isSearching) {
              setPercentage(calculatedPercent);
            }
          }
          
          // Update status message
          if (progress.status) {
            setScrapingStatus(progress.status);
          }
          
          // Update products in real-time as they're scraped
          if (progress.products && progress.products.length > 0) {
            const newProducts = progress.products.map(product => ({
              ...product,
              amazonTitle: product.title,
              amazonPrice: product.price,
              amazonReviews: product.reviews,
              amazonProductLink: product.url,
              amazonImageLink: product.imageUrl,
              hasPrime: product.hasPrime || false, // Preserve Prime status
              key: `progress-${Date.now()}-${Math.random()}`
            }));
            
            setAmazonHuntedProducts(prev => {
              // Ensure prev is always an array
              const currentProducts = Array.isArray(prev) ? prev : [];
              return newProducts;
            });
            
            // Update total products count
            setTotalProducts(newProducts.length);
          }
        }
      } catch (error) {
        console.error('Error checking progress:', error);
      }
    };

    if (isUrlScraping || isSearching) {
      const interval = setInterval(checkProgress, 500); // Check more frequently for real-time updates
      return () => clearInterval(interval);
    } else {
      // When scraping stops, do one final check to ensure we capture the final state
      checkProgress();
    }
  }, [isUrlScraping, isSearching]);

  // Handle final progress state when scraping completes
  useEffect(() => {
    if (!isUrlScraping && !isSearching && scrapingProgress > 0) {
      // Scraping just completed, ensure final state is captured
      const finalizeProgress = async () => {
        try {
          const progress = await getLocal('amazon-scraping-progress');
          if (progress && progress.products && progress.products.length > 0) {
            // Update main progress bar to show completion
            setPercentage(100);
            
            // Ensure products are properly displayed
            const finalProducts = progress.products.map(product => ({
              ...product,
              amazonTitle: product.title,
              amazonPrice: product.price,
              amazonReviews: product.reviews,
              amazonProductLink: product.url,
              amazonImageLink: product.imageUrl,
              key: `final-${Date.now()}-${Math.random()}`
            }));
            
            setAmazonHuntedProducts(prev => {
              // Ensure prev is always an array to prevent spread operator errors
              const currentProducts = Array.isArray(prev) ? prev : [];
              // Remove any existing progress products and add final ones
              const filtered = currentProducts.filter(p => !p.key?.startsWith('progress-'));
              return [...filtered, ...finalProducts];
            });
            
            setTotalProducts(finalProducts.length);
          }
        } catch (error) {
          console.error('Error finalizing progress:', error);
        }
      };
      
      // Small delay to ensure all updates are processed
      setTimeout(finalizeProgress, 100);
    }
  }, [isUrlScraping, isSearching, scrapingProgress]);

  // Debug: Log when products change
  useEffect(() => {
    console.log('Products changed:', {
      totalProducts,
      amazonHuntedProducts: amazonHuntedProducts?.length || 0,
      products: amazonHuntedProducts?.map(p => ({
        title: p.amazonTitle || p.title,
        hasPrime: p.hasPrime,
        key: p.key
      })) || []
    });
  }, [amazonHuntedProducts, totalProducts]);

  useEffect(() => {
    const dosmth = async () => {
      // await setLocal(`amazon-hunted-products-${userId}`, []);
      const userId = await getLocal('current-user');

      const products = await getLocal(`amazon-hunted-products-${userId}`);
      const updatedProducts = products?.map((item) => {
        let price = item.amazonPrice;
        if (!price) {
          price = '$0';
        }

        return {
          ...item,
          amazonPrice: price
        };
      });

      setTotalProducts(updatedProducts?.length || 0);
      setAmazonHuntedProducts(updatedProducts);

      onChangeLocalState(
        `amazon-hunted-products-${userId}`,
        changeHuntedProducts
      );
      onChangeLocalState(`result-percentage-${userId}`, changeResultPercentage);
      onChangeLocalState(`run-script-${userId}`, handleRunScriptStateChange);
      onChangeLocalState('product-hunter-logs', handleLogs);

      const resultFiltersInStorage = await getLocal(`result-filters-${userId}`);
      if (resultFiltersInStorage) setResultFilters(resultFiltersInStorage);

      const settings = await getLocal('product-hunter-settings');
      if (settings)
        setHunterSettings({
          ...settings,
          resultFetchLimit: 2
        });
      await setLocal('product-hunter-settings', {
        ...settings,
        resultFetchLimit: 2
      });

      const localTitles = await getLocal('product-hunter-titles-persisted');
      if (localTitles?.length) {
        setProductTitles(localTitles);
      }
    };
    dosmth();
  }, []);
  
  const handleReset = async () => {
    const userId = await getLocal('current-user');
    setIsSearching(false);
    setTotalProducts(0);
    setProductTitles([]);
    setAmazonHuntedProducts([]);
    setPercentage(0); // Reset main progress bar
    setScrapingProgress(0); // Reset scraping progress
    setIsUrlScraping(false); // Stop any ongoing scraping
    setScrapingStatus(''); // Clear scraping status
    await setLocal('run-script-status', 'terminate');
    await setLocal('product-hunter-titles', []);
    await setLocal('product-hunter-titles-persisted', []);
    await setLocal(`amazon-hunted-products-${userId}`, []);
    await setLocal(`result-percentage-add-value-${userId}`, 0);
    await setLocal(`run-script-${userId}`, false);
    await setLocal(`result-percentage-${userId}`, 0);
    await setLocal('amazon-scraping-progress', null); // Clear scraping progress data
    
    // Also stop any ongoing eComMiracle Searcher scraping
    setIsSearching(false);
  };

  const styles = {
    numInput:
      'w-16 text-sm px-2 border rounded-lg border-neutral-500 bg-neutral-50 text-black'
  };

  return (
    <PagesLayout>
      <div className='w-full flex flex-col gap-4'>
        <div >
          <div className='lg:w-1/2 mx-auto text-center'>
            <h1 className='font-bold text-2xl mb-2'>Finder</h1>
            <PageBtn
              variant='red'
              onClick={() => handleReset()}
              customClass='w-full'
            >
              Reset Finder
            </PageBtn>
          </div>
          <div className='my-4 p-4 border  border-red-400 rounded-lg'>
            <h2 className='font-bold'>Master Filters</h2>
            <div className='flex flex-col lg:flex-row'>
              <div className='lg:flex-1'>
                <p className='text-neutral-500'>
                  For either Custom Amazon Search URL or eComMiracle Searcher
                </p>
                <Checkbox
                  onChange={(e) =>
                    handleSettingsChange('veroItem', e.target.checked)
                  }
                  checked={hunterSettings.veroItem}
                  className='my-2'
                >
                  Do not grab VeRO item
                </Checkbox>
              </div>
              <div  className='lg:flex-1'>
                <p className='font-semibold'>
                  Ignore Amazon items with these keywords in the title
                </p>
                <TextArea
                  rows={5}
                  onChange={(e) =>
                    handleSettingsChange('itemsWithWords', e.target.value)
                  }
                  className='bg-neutral-50 p-4 mt-2 max-h-64 h-32 w-full rounded-lg border'
                />
              </div>
            </div>
          </div>
          <div className='my-4 mt-8 lg:w-1/2 mx-auto text-center'>
            <h2 className='font-bold'>Find Products</h2>
            <p className='text-neutral-500'>
              You have two different ways to find products. Your own Amazon Search URL or use our filters to search for you. We recommend the first option. Run the one you wish then see the results below.
            </p>
          </div>
          <div className='flex flex-col lg:flex-row lg:gap-4'>
            <div className='my-4 p-4 border lg:flex-1 lg:h-full  border-neutral-300 rounded-lg'>
              <h2 className='font-bold'>Custom Amazon Search URL</h2>
              <p className='text-neutral-500'>
                The best way to get the exact products you want is to customise
                the search on Amazon itself and then paste the URL here
              </p>
              <TextArea 
                className='bg-neutral-50 p-4 mt-2 max-h-64 h-32 w-full rounded-lg border'
                value={urlToScrape}
                onChange={(e) => setUrlToScrape(e.target.value)}
                placeholder="Paste your Amazon search URL here..."
              />
              <div className='my-4'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm'>
                    Number of products to scrape:{' '}
                  </span>
                  <InputNumber 
                    min={1} 
                    max={50}
                    className={styles.numInput}
                    value={urlScrapeLimit}
                    onChange={(value) => setUrlScrapeLimit(value)}
                  />
                </div>
              </div>
              <div className='my-4 flex flex-wrap gap-3'>
                <PageBtn 
                  variant='blue'
                  onClick={handleUrlScrape}
                  disabled={isUrlScraping || !urlToScrape.trim()}
                >
                  {isUrlScraping ? 'Scraping...' : 'Run'}
                </PageBtn>
                <PageBtn 
                  variant='green'
                  onClick={handleUrlScrapeAll}
                  disabled={isUrlScraping || !urlToScrape.trim()}
                >
                  {isUrlScraping ? 'Scraping All...' : 'Scrape All Page'}
                </PageBtn>
                <PageBtn 
                  onClick={stopUrlScraping}
                  disabled={!isUrlScraping}
                >
                  Stop
                </PageBtn>
                <PageBtn 
                  variant='red'
                  onClick={() => {
                    setUrlToScrape('');
                    setScrapedProducts([]);
                    setScrapingProgress(0);
                    setScrapingStatus('');
                  }}
                >
                  Clear
                </PageBtn>
              </div>

            </div>
            <span className='py-2 lg:py-0 text-center w-full lg:w-auto lg:flex lg:px-2 relative lg:top-20'>OR</span>
            <div className='my-4 p-4 border lg:flex-1 lg:h-full border-neutral-300 rounded-lg'>
              <h2 className='font-bold'>eComMiracle Searcher</h2>
              <p className='text-neutral-500'>
                If you would rather use our own tool, then enter your desired
                settings below
              </p>
              <div className='my-4'>
                <h3 className='font-semibold text-sm'>
                  Enter a title or keyword to search for
                </h3>
                <TextArea
                  rows={5}
                  value={productTitles.join('\n')}
                  onChange={(e) => handleProductTitles(e.target.value)}
                  className='bg-neutral-50 p-4 mt-2 max-h-64 h-32 w-full rounded-lg border'
                />
                <p className='text-right text-xs text-neutral-400 font-medium mt-1'>
                  {0} - Total Items
                </p>
              </div>
              <div className='my-4'>
                <h3 className='font-semibold text-sm'>Customize Your Search</h3>
                <p className='text-neutral-500 text-sm'>
                  We highly recommend you use Amazon Prime only, so that you get
                  fast delivery and good reviews. It still opens you up to all of
                  Amazon Marketplace Sellers, but the items are sent from Amazon
                  warehouses not from the sellers themselves which ensures very
                  fast delivery and gift option
                </p>
                <div className='flex flex-wrap gap-3'>
                  <div className='my-4 flex items-center gap-2'>
                    <InputNumber
                      style={{ width: '315px' }}
                      min={0}
                      onChange={(value) =>
                        handleSettingsChange('resultFetchLimit', value)
                      }
                      className={styles.numInput}
                      value={hunterSettings?.resultFetchLimit || 0}
                    />
                    <span className='text-sm'>
                      How many Amazon items to take from each keyword
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm'>Min Price: </span>
                    <InputNumber
                      min={0}
                      onChange={(value) =>
                        handleSettingsChange('minPrice', value)
                      }
                      value={hunterSettings?.minPrice || 0}
                      className={styles.numInput}
                    />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm'>Max Price: </span>
                    <InputNumber
                      min={0}
                      onChange={(value) =>
                        handleSettingsChange('maxPrice', value)
                      }
                      value={hunterSettings?.maxPrice || 0}
                      className={styles.numInput}
                    />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm'>Min Reviews: </span>
                    <InputNumber min={1} className={styles.numInput} />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm'>Max Reviews: </span>
                    <InputNumber min={1} className={styles.numInput} />
                  </div>
                </div>
                <div className='flex flex-col gap-1 my-4'>
                  <Checkbox
                    onChange={(e) =>
                      handleSettingsChange('isPrime', e.target.checked)
                    }
                    checked={hunterSettings.isPrime}
                  >
                    Amazon Prime Only
                  </Checkbox>
                  <Checkbox
                    onChange={(e) =>
                      handleSettingsChange('amazonIsSeller', e.target.checked)
                    }
                    checked={hunterSettings.amazonIsSeller}
                  >
                    Amazon Is Seller
                  </Checkbox>
                  <Checkbox
                    onChange={(e) =>
                      handleSettingsChange('bestSeller', e.target.checked)
                    }
                    checked={hunterSettings.bestSeller}
                  >
                    Best Seller
                  </Checkbox>
                  <Checkbox
                    onChange={(e) =>
                      handleSettingsChange('highestReviewed', e.target.checked)
                    }
                    checked={hunterSettings.highestReviewed}
                  >
                    Sort Highest Reviewed Before Fetching
                  </Checkbox>
                  <Checkbox
                    onChange={(e) =>
                      handleSettingsChange('removeBooks', e.target.checked)
                    }
                    checked={hunterSettings.removeBooks}
                  >
                    Remove Books
                  </Checkbox>
                </div>
                <div className='my-4 flex flex-wrap gap-3'>
                  <PageBtn
                    variant='blue'
                    onClick={() => handleAmazonTab()}
                    loading={isSearching}
                    disabled={
                      localRunScriptStatus === 'pause' || !productTitles.length
                    }
                  >
                    Run
                  </PageBtn>
                  <PageBtn
                    variant='green'
                    onClick={() => handleAmazonTabAll()}
                    loading={isSearching}
                    disabled={
                      localRunScriptStatus === 'pause' || !productTitles.length
                    }
                  >
                    Scrape All Page
                  </PageBtn>
                  {localRunScriptStatus === 'pause' ? (
                    <PageBtn
                      onClick={() => handlePauseResume('resume')}
                      disabled={
                        localRunScriptStatus === 'resume' || !localRunScriptStatus
                      }
                    >
                      Resume
                    </PageBtn>
                  ) : (
                    <PageBtn
                      onClick={() => handlePauseResume('pause')}
                      disabled={localRunScriptStatus === 'pause' || !isSearching}
                    >
                      Pause
                    </PageBtn>
                  )}
                  <PageBtn
                    onClick={() => handleTerminate(localRunScriptStatus)}
                    disabled={!isSearching}
                  >
                    Stop
                  </PageBtn>
                  <PageBtn
                    variant='red'
                    disabled={isSearching}
                    onClick={async () => {
                      setProductTitles([]);
                      await setLocal('product-hunter-titles', []);
                      await setLocal('product-hunter-titles-persisted', []);
                    }}
                  >
                    Clear
                  </PageBtn>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div>
            <h2 className='font-bold text-lg'>Progress</h2>
            <p className='text-neutral-300 font-medium text-sm'>
              Total Products - {totalProducts}
            </p>
            <Progress
              percent={(isUrlScraping || isSearching) ? scrapingProgress : percentage}
              style={{ fontSize: '11px' }}
              percentPosition={{
                align: 'center',
                type: 'inner'
              }}
              size={[null, 20]}
              status={(isUrlScraping || isSearching) ? (scrapingProgress === 100 ? 'success' : 'active') : undefined}
            />
            {(isUrlScraping || isSearching) && scrapingStatus && (
              <p className='text-sm text-blue-600 mt-1'>{scrapingStatus}</p>
            )}
          </div>
          <div className='my-4 flex flex-wrap gap-3'>
            <PageBtn variant='red' onClick={() => handleClearResultButton()}>
              Clear
            </PageBtn>
            <PageBtn variant='blue' onClick={() => copyToClip()}>
              Copy All Amazon URLs
            </PageBtn>
            <PageBtn variant='blue' onClick={addAllUrlsToLister}>
              Add All Amazon URLs To Lister
            </PageBtn>
            <PageBtn 
              variant='blue' 
              onClick={async () => {
                try {
                  // Extract all Amazon URLs from scraped products and convert to ASIN format
                  const urls = amazonHuntedProducts
                    .map((product) => product.amazonProductLink)
                    .filter((url) => url && url !== '#')
                    .map(url => {
                      // Clean the URL by removing unwanted characters and trimming
                      let cleanUrl = url.trim();
                      console.log('Original URL:', url);
                      
                      // Remove @ symbol and any other unwanted characters at the beginning
                      cleanUrl = cleanUrl.replace(/^[@\s]+/, '');
                      
                      // Also remove any unwanted characters that might be at the beginning
                      cleanUrl = cleanUrl.replace(/^[^\w]*/, '');
                      
                      // Additional cleaning: remove any @ symbols anywhere in the URL
                      cleanUrl = cleanUrl.replace(/@/g, '');
                      
                      // Extract ASIN from the URL
                      const asinMatch = cleanUrl.match(/\/dp\/([A-Z0-9]{10})|\/product\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
                      let asin = null;
                      
                      if (asinMatch) {
                        asin = asinMatch[1] || asinMatch[2] || asinMatch[3];
                      }
                      
                      if (asin) {
                        // Return the formatted URL with ASIN
                        const formattedUrl = `https://www.amazon.co.uk/dp/${asin}`;
                        console.log('Formatted URL:', formattedUrl);
                        return formattedUrl;
                      } else {
                        console.log('No ASIN found in URL:', cleanUrl);
                        return null;
                      }
                    })
                    .filter(url => url !== null); // Remove null URLs where ASIN couldn't be extracted

                  if (urls.length === 0) {
                    notification.warning({
                      message: 'No URLs Available',
                      description: 'No Amazon URLs with valid ASINs found in the scraped products'
                    });
                    return;
                  }

                  // Store URLs in local storage for the lister to access
                  await setLocal('bulk-lister-urls', urls);
                  await setLocal('bulk-lister-source', 'product-hunter');
                  // Set a flag to indicate that the lister should clear existing URLs
                  await setLocal('bulk-lister-clear-existing', true);

                  notification.success({
                    message: 'URLs Added to Lister',
                    description: `${urls.length} Amazon URLs have been added to the lister queue (existing URLs cleared)`
                  });

                  // Navigate to the bulk lister page
                  window.location.href = '/bulk-lister.html';
                } catch (error) {
                  console.error('Error adding URLs to lister:', error);
                  notification.error({
                    message: 'Error',
                    description: 'Failed to add URLs to lister: ' + error.message
                  });
                }
              }}
            >
              Clear Lister Queue & Add These Amazon URLs
            </PageBtn>
          </div>
          <div className='my-4'>
            <Table
              key={`table-${amazonHuntedProducts?.length || 0}-${Date.now()}`}
              columns={columns}
              dataSource={amazonHuntedProducts || []}
              rowKey={(record) => record.key || record.asin || Math.random()}
              pagination={false}
              style={{
                marginTop: '10px'
              }}
            />
          </div>
          <div className='flex flex-wrap gap-4 mb-4'>
            <div className='flex items-center gap-2'>
              <span className='text-sm'>Min Price: </span>
              <InputNumber
                min={0}
                onChange={(value) => handleChangeFilter('minPrice', value)}
                value={resultFilters?.minPrice || 0}
                className={styles.numInput}
              />
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm'>Max Price: </span>
              <InputNumber
                min={0}
                onChange={(value) => handleChangeFilter('maxPrice', value)}
                value={resultFilters?.maxPrice || 0}
                className={styles.numInput}
              />
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm'>Min Reviews: </span>
              <InputNumber
                min={0}
                onChange={(value) => handleChangeFilter('minReviews', value)}
                value={resultFilters?.minReviews || 0}
                className={styles.numInput}
              />
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm'>Max Reviews: </span>
              <InputNumber
                min={0}
                onChange={(value) => handleChangeFilter('maxReviews', value)}
                value={resultFilters?.maxReviews || 0}
                className={styles.numInput}
              />
            </div>
            <PageBtn
              onClick={() => handleApplyFilters()}
              variant={isFiltersApplied ? 'red' : 'blue'}
            >
              {isFiltersApplied ? 'Clear' : 'Apply'} Filters
            </PageBtn>
            <PageBtn variant='blue' onClick={() => handleSortPrice()}>
              Sort Price:{' '}
              {!sortPrice || sortPrice === 'lowToHigh'
                ? 'High to Low'
                : 'Low to High'}
            </PageBtn>
          </div>
        </div>
      </div>
    </PagesLayout>
  );
};

export default ProductHunter;