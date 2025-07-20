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
          scrappingProducts = document.querySelectorAll('li[id*="item"]:not([articlecovered])');
        }

        for (let i = 0; i < scrappingProducts.length; i += 1) {
          const visibleProduct = scrappingProducts[i];
          let soldAt1 = visibleProduct.querySelector('span[class*="s-item__caption--signal"]')?.innerText || '';
          if (soldAt1) {
            soldAt1 = soldAt1.split('Sold ')[1];
          }

          if (competitorSearchSoldWithin) {
            const date = moment().subtract(competitorSearchSoldWithin, 'days').toDate();
            if (soldAt1) {
              if (moment(moment(soldAt1).toDate()).isAfter(date)) {
                // do nothing
              } else {
                continue;
              }
            }
          }

          let sellerIdSpan = visibleProduct.querySelector('span[class*="s-item__seller-info"]');
          if (!sellerIdSpan) {
            sellerIdSpan = visibleProduct.querySelector('div[class*="s-item__wrapper"]');
            sellerIdSpan = sellerIdSpan.querySelector('div[class*="s-item__info"]');
          }
  
          visibleProduct?.setAttribute('articleCovered', true);
  
          let storeName = visibleProduct.querySelector('span[class="s-item__seller-info-text"]')?.innerText;
          if (storeName) {
            storeName = storeName.split(' (')[0];
          } else {
            const productDetailPageLink = visibleProduct.querySelector('a[class="s-item__link"]').href;
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
            storeName = sellerCardInfoDiv.querySelector('span[class*="ux-textspans"]')?.innerText;
          }
  
          const productDetailLink = visibleProduct.querySelector('a[class="s-item__link"]')?.href;
          const productId = productDetailLink.match(/\/(\d+)(?:\?|\b)/)[1];
  
          const title = visibleProduct.querySelector('div[class="s-item__title"]')?.innerText;
          const priceDiv = visibleProduct.querySelector('span[class="s-item__price"]');
          let price = priceDiv?.querySelectorAll('.POSITIVE');
          if (price.length) {
            price = price[price.length - 1]?.innerText || '0';
          } else {
            price = priceDiv?.innerText || '0';
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
              if (moment(moment(soldAt).toDate()).isAfter(date)) {
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
            } else {
              await setLocal(`ebay-hunted-products-${currentUserId}`, [scrappedProduct]);
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
        }
  
        setTotalEbayHuntedProducts(ebayHuntedProducts?.length || 0);
        // const allProducts = [...ebayHuntedProducts, ...localEbayHuntedProducts || []];
        // await setLocal(`ebay-hunted-products-${currentUserId}`, allProducts);
        setExtractingTitles(false);
  
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

  useEffect(async () => {
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
      if ((scrapAllPages && extractTitles) || competitorSearch) {
        document.querySelector('#extract-titles-dev').click();
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
