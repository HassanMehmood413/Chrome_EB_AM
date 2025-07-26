import moment from 'moment';
import {
  useEffect,
  useState
} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Button,
  Checkbox,
  Select
} from 'antd';
import { uniqBy, round } from 'lodash';

import {
  getLocal,
  setLocal,
  onChange as onChangeLocalState
} from '../../services/dbService';
import { getCurrencySymbolFromCurrentURL, getCurrencySymbolFromSelectedDomain } from '../../services/currencyUtils';

import './style.css';
import { sleep } from '../../services/utils';
import { removeCurrencySymbol } from '../../content-scripts/ebay/product-page';

const useStyles = makeStyles({
  div1: {
    display: 'flex',
    gap: '5px',
    paddingTop: '15px'
  },
  div2: {
    paddingTop: '15px'
  },
  div3: {
    marginTop: '15px',
    border: '0.5px solid grey',
    width: '405px',
    borderRadius: '5px',
    backgroundColor: '#f9f9f9'
  },
  p1: {
    fontWeight: 'bolder',
    paddingLeft: '12px'
  },
  p2: {
    paddingLeft: '12px'
  },
  select1: {
    paddingLeft: '12px',
    width: '120px',
    marginBottom: '15px'
  }
});

const ScrapEbayPage = ({
  document,
  ebayProducts
}) => {
  const classes = useStyles();

  const { Option } = Select;

  const [getSoldHistory, setGetSoldHistory] = useState('Off');
  const [extractingTitles, setExtractingTitles] = useState(false);
  const [titlesCleared, setTitlesCleared] = useState(false);
  const [totalEbayHuntedProducts, setTotalEbayHuntedProducts] = useState(0);
  const [scrapAllPagesCheckbox, setScrapAllPagesCheckbox] = useState(false);
  const [runByCompetitorSearch, setRunByCompetitorSearch] = useState('false');

  const changeSoldHistory = (soldHistoryObject, day, lastDate, purchaseDate) => {
    let history = soldHistoryObject;
    if (moment(purchaseDate).isAfter(lastDate)) {
      history = {
        ...history,
        [day]: (history[day] || 0) + 1
      };
    } else {
      history = {
        ...history,
        [day]: (history[day] || 0)
      };
    }

    return history;
  };

  const handleEbayExtractTitles = async (currentValue) => {
    try {
      setExtractingTitles(true);
      setTitlesCleared(false);
  
      const currentUserId = await getLocal('current-user');
      const domain = await getLocal(`selected-domain-${currentUserId}`);
      await setLocal(`extract-current-state-${currentUserId}`, currentValue);
  
      const getSoldHistoryCheck = await getLocal(`get-sold-history-check-${currentUserId}`);
      const localEbayHuntedProducts = await getLocal(`ebay-hunted-products-${currentUserId}`);
      let competitorSearchSoldHistory;
      let competitorSearchSoldWithin;
      let competitorSearch = new URLSearchParams(window.location.search);
      competitorSearch = competitorSearch.get('Competitor_Search');
      if (competitorSearch === 'true') {
        competitorSearchSoldHistory = await getLocal('competitor-search-sold-history');
        competitorSearchSoldWithin = await getLocal('competitor-search-sold-within');
      }

      const cookie = document.cookie;
  
      const requestOptions = {
        method: 'GET',
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'accept-language': 'en-US,en;q=0.9',
          'cache-control': 'max-age=0',
          cookie
        },
        redirect: 'follow'
      };
  
      if (currentValue !== 'Stop Extracting Titles') {
        const ebayHuntedProducts = [];
        let scrappingProducts = ebayProducts;
        if (runByCompetitorSearch === 'true') {
          // Try multiple selectors for modern eBay structure
          const selectors = [
            '.s-item:not([articlecovered])',
            'li[id*="item"]:not([articlecovered])',
            '.srp-results .s-item:not([articlecovered])',
            '[data-testid*="item"]:not([articlecovered])',
            '.srp-item:not([articlecovered])',
            '.s-item__wrapper:not([articlecovered])'
          ];
          
          for (const selector of selectors) {
            scrappingProducts = document.querySelectorAll(selector);
            if (scrappingProducts.length > 0) {
              console.log(`Found ${scrappingProducts.length} products using selector: ${selector}`);
              break;
            }
          }
          
          if (scrappingProducts.length === 0) {
            console.log('No products found with any selector, trying all item-like elements...');
            scrappingProducts = document.querySelectorAll('[class*="s-item"], [id*="item"], [class*="srp-item"]');
            console.log(`Found ${scrappingProducts.length} products using fallback selectors`);
          }
        }
        
        if (!scrappingProducts || scrappingProducts.length === 0) {
          console.log('No products found to process');
          setExtractingTitles(false);
          return;
        }

        console.log(`Starting to process ${scrappingProducts.length} products...`);
        for (let i = 0; i < scrappingProducts.length; i += 1) {
          try {
            console.log(`Processing product ${i + 1}/${scrappingProducts.length}...`);
            const visibleProduct = scrappingProducts[i];
            if (!visibleProduct) {
              console.log('Skipping undefined product at index:', i);
              continue;
            }

            let soldAt1 = visibleProduct.querySelector('span[class*="s-item__caption--signal"]')?.innerText || '';
            if (soldAt1) {
              soldAt1 = soldAt1.split('Sold ')[1];
            }

            if (competitorSearchSoldWithin) {
              try {
                const date = moment().subtract(competitorSearchSoldWithin, 'days').toDate();
                if (soldAt1) {
                  // Try multiple date formats that eBay might use
                  let soldDate;
                  const formats = ['DD MMM YYYY', 'D MMM YYYY', 'MMM DD, YYYY', 'YYYY-MM-DD'];
                  for (const format of formats) {
                    soldDate = moment(soldAt1, format, true);
                    if (soldDate.isValid()) break;
                  }
                  
                  if (!soldDate || !soldDate.isValid()) {
                    console.log('Could not parse sold date:', soldAt1);
                    continue;
                  }
                  
                  if (soldDate.isAfter(date)) {
                    // do nothing
                  } else {
                    continue;
                  }
                }
              } catch (dateError) {
                console.log('Error processing date for product at index:', i, dateError);
                continue;
              }
            }

            let sellerIdSpan = visibleProduct.querySelector('span[class*="s-item__seller-info"]');
            if (!sellerIdSpan) {
              const wrapper = visibleProduct.querySelector('div[class*="s-item__wrapper"]');
              if (wrapper) {
                sellerIdSpan = wrapper.querySelector('div[class*="s-item__info"]');
              }
            }
  
          visibleProduct?.setAttribute('articleCovered', true);
  
          let storeName = visibleProduct.querySelector('span[class="s-item__seller-info-text"]')?.innerText;
          if (storeName) {
            storeName = storeName.split(' (')[0];
          } else {
            const productDetailPageLink = visibleProduct.querySelector('a[class="s-item__link"]')?.href;
            if (productDetailPageLink) {
              try {
                const requestOptions = {
                  method: 'GET',
                  headers: {
                    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    cookie: document.cookie
                  },
                  redirect: 'follow'
                };
      
                let response = await fetch(productDetailPageLink, requestOptions);
                response = await response.text();
                const htmlData = new DOMParser().parseFromString(response, 'text/html');
                const sellerCardInfoDiv = htmlData.querySelector('div[class="x-sellercard-atf__info"]');
                storeName = sellerCardInfoDiv?.querySelector('span[class*="ux-textspans"]')?.innerText || 'Unknown Seller';
              } catch (fetchError) {
                console.log('Failed to fetch seller name from product page:', fetchError);
                storeName = 'Unknown Seller';
              }
            } else {
              storeName = 'Unknown Seller';
            }
          }
  
          const productDetailLink = visibleProduct.querySelector('a[class="s-item__link"]')?.href;
          if (!productDetailLink) {
            console.log('No product detail link found for product at index:', i);
            continue;
          }
          
          const productIdMatch = productDetailLink.match(/\/(\d+)(?:\?|\b)/);
          if (!productIdMatch) {
            console.log('Could not extract product ID from link:', productDetailLink);
            continue;
          }
          const productId = productIdMatch[1];
  
          const title = visibleProduct.querySelector('div[class="s-item__title"]')?.innerText || 'No Title';
          const priceDiv = visibleProduct.querySelector('span[class="s-item__price"]');
          let price = '0';
          if (priceDiv) {
            const priceElements = priceDiv.querySelectorAll('.POSITIVE');
            if (priceElements.length) {
              price = priceElements[priceElements.length - 1]?.innerText || '0';
            } else {
              price = priceDiv.innerText || '0';
            }
          }
          const priceWithoutSymbol = removeCurrencySymbol(price);
          
          // Get currency symbol based on current page URL or selected domain
          const currencyFromURL = getCurrencySymbolFromCurrentURL();
          const currencyFromDomain = getCurrencySymbolFromSelectedDomain(domain);
          
          // Use URL-based currency if available, otherwise use domain setting
          const currency = currencyFromURL || currencyFromDomain;
          
          let bePrice = null;
          if (domain === 'USA') {
            // Item List Price + 12.9% + $0.55 for USA
            bePrice = `${currency}${round(priceWithoutSymbol - priceWithoutSymbol * 12.9 * 0.01 + 0.55, 2)}`;
          } else {
            // Item List Price + 9.48% + £0.36 + £0.12 (or equivalent for other currencies)
            bePrice = `${currency}${round(priceWithoutSymbol - priceWithoutSymbol * 9.48 * 0.01 + 0.36 + 0.12, 2)}`;
          }
  
          const imageLink = visibleProduct.querySelector('img')?.src;
  
          let soldAt = visibleProduct.querySelector('span[class*="s-item__caption--signal"]')?.innerText || '';
          if (soldAt) {
            soldAt = soldAt.split('Sold ')[1];
          }

          let pushProduct = true;
          if (competitorSearchSoldWithin) {
            const date = moment().subtract(competitorSearchSoldWithin, 'days').toDate();
            if (soldAt) {
              // Try multiple date formats that eBay might use
              let soldDate;
              const formats = ['DD MMM YYYY', 'D MMM YYYY', 'MMM DD, YYYY', 'YYYY-MM-DD'];
              for (const format of formats) {
                soldDate = moment(soldAt, format, true);
                if (soldDate.isValid()) break;
              }
              
              if (soldDate && soldDate.isValid() && soldDate.isAfter(date)) {
                // do nothing
              } else {
                pushProduct = false;
              }
            }
          }
  
          let quantity = 0;
          let soldHistory = {};

          if (((getSoldHistoryCheck && competitorSearch !== 'true') || (competitorSearchSoldHistory && competitorSearch === 'true')) && productId) {
            const last1Day = moment().subtract(1, 'day').toDate();
            const last3Days = moment().subtract(3, 'days').toDate();
            const last7Days = moment().subtract(7, 'days').toDate();
            const last14Days = moment().subtract(14, 'days').toDate();
            const last30Days = moment().subtract(30, 'days').toDate();
            const last60Days = moment().subtract(60, 'days').toDate();
            const last90Days = moment().subtract(90, 'days').toDate();

            let ebayLink = 'https://www.ebay.com';
            if (domain === 'UK') {
              ebayLink = 'https://www.ebay.co.uk';
            }
  
            let response;
            try {
              response = await fetch(`${ebayLink}/bin/purchaseHistory?item=${productId}`, requestOptions);
            } catch (error) {
              await sleep(2);
              response = await fetch(`${ebayLink}/bin/purchaseHistory?item=${productId}`, requestOptions);
            }

            response = await response.text();
            const htmlData = new DOMParser().parseFromString(response, 'text/html');
  
            const table = htmlData?.querySelector('table.app-table__table');
            const tableHeader = table?.querySelector('tr.app-table__header-row');
            const allTablesHeaderCells = tableHeader?.querySelectorAll('th');
            let quantityCellIndex = 0;
            let dateOfPurchaseIndex = 0;

            for (let k = 0; k < allTablesHeaderCells?.length; k += 1) {
              if (allTablesHeaderCells[k].innerText.toLowerCase() === 'quantity') {
                quantityCellIndex = k;
              } else if (allTablesHeaderCells[k].innerText.toLowerCase().includes('purchase')) {
                dateOfPurchaseIndex = k;
              }
            }
  
            const allRows = table?.querySelectorAll('tr.app-table__row');
  
            for (let i = 0; i < allRows?.length; i += 1) {
              const quan = allRows[i].querySelectorAll('td')[quantityCellIndex].innerText;
              let dateOfPurchase = allRows[i].querySelectorAll('td')[dateOfPurchaseIndex].innerText;
              const format = 'DD MMM YYYY [at] h:mm:ssa [GMT]';

              dateOfPurchase = moment(dateOfPurchase, format).toDate();
              soldHistory = changeSoldHistory(soldHistory, '1', last1Day, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '3', last3Days, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '7', last7Days, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '14', last14Days, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '30', last30Days, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '60', last60Days, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '90', last90Days, dateOfPurchase);

              quantity += Number(quan);
            }
  
            const product = ebayHuntedProducts.find(product => product.itemNumber === productId);
            if (product) {
              product.totalSold = quantity;
            }
            await sleep(1);
          }
  
          if (pushProduct) {
            const scrappedProduct = {
              image: imageLink,
              title,
              price,
              breakevenPrice: bePrice,
              soldAt,
              itemNumber: productId,
              sellerName: storeName,
              soldHistory,
              totalSold: quantity
            };
              // scrappedProducts.push(scrappedProduct);
            const previousScrappedProducts = await getLocal(`ebay-hunted-products-${currentUserId}`);
            if (previousScrappedProducts?.length) {
              previousScrappedProducts.push(scrappedProduct);
  
              const uniqueProducts = uniqBy(previousScrappedProducts, 'itemNumber');
              await setLocal(`ebay-hunted-products-${currentUserId}`, uniqueProducts);
              console.log(`✅ Successfully saved product ${productId} to storage. Total products: ${uniqueProducts.length}`);
            } else {
              await setLocal(`ebay-hunted-products-${currentUserId}`, [scrappedProduct]);
              console.log(`✅ Successfully saved first product ${productId} to storage. Total products: 1`);
            }
  
            const alreadyScrapped = localEbayHuntedProducts?.find(obj => obj.itemNumber === productId);
            if (!alreadyScrapped) {
              ebayHuntedProducts.push({
                image: imageLink,
                title,
                price,
                breakevenPrice: bePrice,
                soldAt,
                itemNumber: productId,
                sellerName: storeName,
                soldHistory
              });
            }
          }

          const getCurrentExtractState = await getLocal(`extract-current-state-${currentUserId}`);
          if (getCurrentExtractState === 'Stop Extracting Titles') {
            await setLocal(`extract-titles-${currentUserId}`, false);
            break;
          }
          } catch (productError) {
            console.log('Error processing product at index:', i, productError);
            continue;
          }
        }
  
        setTotalEbayHuntedProducts(ebayHuntedProducts?.length || 0);
        // const allProducts = [...ebayHuntedProducts, ...localEbayHuntedProducts || []];
        // await setLocal(`ebay-hunted-products-${currentUserId}`, uniqueProducts);
        setExtractingTitles(false);
        
        // Ensure all data is saved before proceeding
        console.log('Extraction completed, ensuring data is saved...');
        await sleep(1);
  
        const scrapAllPages = await getLocal(`scrap-all-pages-${currentUserId}`);
        if (currentValue !== 'Stop Extracting Titles' && scrapAllPages && document.URL.includes('store_name=')) {
          await setLocal(`extract-titles-${currentUserId}`, true);
          const nextPageAvailable = document.querySelector('a[class*="pagination__next"]');
  
          if (nextPageAvailable) {
            nextPageAvailable.click();
          } else {
            await setLocal(`extract-titles-${currentUserId}`, false);
          }
        } else {
          await setLocal(`extract-titles-${currentUserId}`, false);
        }

        console.log('~ handleEbayExtractTitles ~ runByCompetitorSearch:', runByCompetitorSearch);

        let competitorSearch = new URLSearchParams(window.location.search);
        competitorSearch = competitorSearch.get('Competitor_Search');
        if (runByCompetitorSearch || competitorSearch === 'true') {
          console.log('\n seller done');
          await setLocal('competitor-search-status', 'success');
          
          // Add delay to ensure data is saved before closing
          console.log('Waiting 3 seconds for data to be saved...');
          await sleep(3);
          
          // Verify data was saved before closing
          const savedProducts = await getLocal(`ebay-hunted-products-${currentUserId}`);
          console.log(`Final verification: ${savedProducts?.length || 0} products saved to storage`);
          
          console.log('Closing tab after data save delay...');
          await chrome.runtime.sendMessage({
            callback: 'closeTab'
          });
          window.close();
          return;
        }
      } else {
        await setLocal(`extract-titles-${currentUserId}`, false);
      }
    } catch (error) {
      console.log('🚀 ~ handleEbayExtractTitles ~ error:', error);
      // do nothing
      await setLocal('competitor-search-status', 'error');
      await setLocal('competitor-search-error', error?.message);
    }
  };

  const handleChangeSoldHistory = async (value) => {
    const currentUserId = await getLocal('current-user');
    if (value === 'On') {
      await setLocal(`get-sold-history-check-${currentUserId}`, true);
      setGetSoldHistory('On');
    } else {
      await setLocal(`get-sold-history-check-${currentUserId}`, false);
      setGetSoldHistory('Off');
    }
  };

  const handleClearTitles = async () => {
    const currentUserId = await getLocal('current-user');
    await setLocal(`ebay-hunted-products-${currentUserId}`, []);
    setTotalEbayHuntedProducts(0);
    setTitlesCleared(true);
  };

  const handleChromeScreen = async () => {
    // chrome.tabs.create({ url: chrome.runtime.getURL('ebay-items-scanner.html')})
    await chrome.runtime.sendMessage({
      payload: {
        screenToOpen: 'ebay-items-scanner.html'
      },
      callback: 'openChromePopupScreen'
    });
  };

  const handleScrapCheckbox = async (checked) => {
    const currentUserId = await getLocal('current-user');

    await setLocal(`scrap-all-pages-${currentUserId}`, checked);
    setScrapAllPagesCheckbox(checked);
  };

  const changeHuntedProducts = (param1, huntedProducts) => {
    setTotalEbayHuntedProducts(huntedProducts?.length || 0);
  };

  useEffect(() => {
    const checkData = async () => {
      const userId = await getLocal('current-user');
      const getSoldHistoryCheck = await getLocal(`get-sold-history-check-${userId}`);
      if (getSoldHistoryCheck) setGetSoldHistory('On');

      const ebayHuntedProducts = await getLocal(`ebay-hunted-products-${userId}`);
      setTotalEbayHuntedProducts(ebayHuntedProducts?.length || 0);

      const scrapAllPages = await getLocal(`scrap-all-pages-${userId}`);
      setScrapAllPagesCheckbox(scrapAllPages || false);
      const extractTitles = await getLocal(`extract-titles-${userId}`);

      let competitorSearch = new URLSearchParams(window.location.search);
      competitorSearch = competitorSearch.get('Competitor_Search');
      console.log('\n competitorSearch', typeof competitorSearch, competitorSearch);
      setRunByCompetitorSearch(competitorSearch);
      if (competitorSearch) {
        // set local states
        const competitorSearchSoldHistory = await getLocal('competitor-search-sold-history');
        if (competitorSearchSoldHistory) setGetSoldHistory('On');
      }

      onChangeLocalState(`ebay-hunted-products-${userId}`, changeHuntedProducts);
      console.log('Checking auto-extraction conditions:', { scrapAllPages, extractTitles, competitorSearch });
      
      if ((scrapAllPages && extractTitles) || competitorSearch) {
        console.log('Auto-extraction condition met, looking for extract button...');
        
        // Add a small delay to ensure the component is fully rendered
        setTimeout(() => {
          const extractButton = document.querySelector('#extract-titles-dev');
          console.log('Extract button found:', !!extractButton);
          if (extractButton) {
            console.log('Clicking extract button automatically...');
            extractButton.click();
          } else {
            console.log('Extract button not found, will retry in 2 seconds...');
            // Retry after 2 seconds
            setTimeout(() => {
              const retryButton = document.querySelector('#extract-titles-dev');
              if (retryButton) {
                console.log('Found extract button on retry, clicking...');
                retryButton.click();
              } else {
                console.log('Extract button still not found after retry');
              }
            }, 2000);
          }
        }, 1000);
      }
    };

    checkData();
  }, []);

  return (
    <div>
      <div className={classes.div1}>
        <Button
          id='extract-titles-dev'
          style={{
            backgroundColor: !extractingTitles ? '#5db85c' : '#E93D35',
            color: 'white',
            borderColor: !extractingTitles ? '#5db85c' : '#E93D35'
          }}
          onClick={() => handleEbayExtractTitles(!extractingTitles ? 'Extract All Titles' : 'Stop Extracting Titles')}
        >
          {!extractingTitles ? 'Extract All Titles' : 'Stop Extracting Titles'}
        </Button>
        <Button
          style={{
            backgroundColor: '#f0ad4e',
            color: 'white',
            borderColor: '#f0ad4e'
          }}
          onClick={() => handleClearTitles()}
        >
          {`${!titlesCleared ? 'Clear Titles' : 'Titles Cleared'} (${totalEbayHuntedProducts})`}
        </Button>
        <Button
          style={{
            backgroundColor: '#5bc0de',
            color: 'white',
            borderColor: '#5bc0de'
          }}
          onClick={() => handleChromeScreen()}
        >
          Filter Titles
        </Button>
      </div>
      <div className={classes.div2}>
        <Checkbox
          onChange={(e) => handleScrapCheckbox(e.target.checked)}
          checked={scrapAllPagesCheckbox}
        >
          Scrape All Pages
        </Checkbox>
      </div>
      <div className={classes.div3}>
        <p className={classes.p1}>{'Enable \'Total Sold\' to access complete sales history.'}</p>
        <p className={classes.p1}>{'Note: This setting will slow down the scanning process.'}</p>
        <p className={classes.p2}>{'Get Total Sold History:'}</p>
        <Select
          className={classes.select1}
          onChange={(e) => handleChangeSoldHistory(e)}
          value={getSoldHistory}
        >
          <Option value='Off'>Off</Option>
          <Option value='On'>On</Option>
        </Select>
      </div>
    </div>
  );
};

export default ScrapEbayPage;
