import { createRoot } from 'react-dom/client';

import ProductPageIconsDataBox from '../../components/Ebay/AllProductsPageDatabox';
import ScrapEbayPages from '../../components/Ebay/ScrapEbayPages';

import { sleep } from '../../services/utils';
import { getLocal } from '../../services/dbService';

const ShowDataBox = ({
  visibleProduct,
  storeName,
  productId,
  dataToBeCopied
}) => {
  const newDiv = document.createElement('div');
  newDiv.id = 'main-product-info-div';

  const root = createRoot(newDiv);

  root.render(<ProductPageIconsDataBox
    storeName={storeName}
    productId={productId}
    dataToBeCopied={dataToBeCopied}
  />);

  visibleProduct?.insertAdjacentElement('afterend', newDiv);
};

export const removeCurrencySymbol = (amount) => {
  const regex = /[\$\€\£\¥\₹\₽\₩\¢\₫]/g;
  const filtered = amount.replace(regex, '').trim();
  return parseFloat(filtered);
};

(async () => {
  await sleep(3);
  console.log('\n *** Ebay Product Page Script Running ***');

  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  if (response.success) {
    const allProducts = document.querySelectorAll('li[id*="item"]:not([articlecovered])');

    const currentUrl = document.URL;
    
    // Handle store pages (/str/)
    if (currentUrl?.includes('/str/')) {
      console.log('Store page detected:', currentUrl);
      const storeName = currentUrl.split('/str/')[1]?.split('?')[0]?.split('/')[0];
      console.log('Store name extracted:', storeName);
      
      if (storeName) {
        // Try multiple selectors to find a visible section to add the button
        let storeHeader = document.querySelector('.str-header__store-info') || 
                         document.querySelector('.str-header__store-details') ||
                         document.querySelector('[class*="store-info"]') ||
                         document.querySelector('[class*="store-details"]') ||
                         document.querySelector('.str-header__content') ||
                         document.querySelector('.str-header__main') ||
                         document.querySelector('[class*="str-header"]:not(.str-header__banner)') ||
                         document.querySelector('.str-header') ||
                         document.querySelector('main') ||
                         document.querySelector('header') ||
                         document.body;
        
        console.log('Store header element found:', storeHeader);
        
        if (storeHeader) {
          const buttonDiv = document.createElement('div');
          buttonDiv.style.cssText = 'margin: 15px 0; padding: 10px 15px; background: #f8f9fa; border: 2px solid #007cba; border-radius: 6px; display: inline-block; position: relative; z-index: 1000; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
          
          const button = document.createElement('button');
          button.textContent = "All Seller's Sold Items";
          button.style.cssText = 'background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
          button.onclick = async () => {
            const userId = await getLocal('current-user');
            const domain = await getLocal(`selected-domain-${userId}`);
            let ebayLink = 'https://www.ebay.com';
            if (domain === 'UK') {
              ebayLink = 'https://www.ebay.co.uk';
            }
            window.open(`${ebayLink}/sch/i.html?_dkr=1&_fsrp=1&iconV2Request=true&_blrs=recall_filtering&_ssn=${storeName}&_ipg=240&_oac=1&LH_Sold=1`, '_blank');
          };
          
          buttonDiv.appendChild(button);
          storeHeader.appendChild(buttonDiv);
          console.log('Button added to store page');
        } else {
          console.log('No store header element found');
        }
      } else {
        console.log('Could not extract store name from URL');
      }
    }
    
    // Handle search pages (existing logic)
    if (currentUrl?.includes('store_name=')) {
      const searchDiv = document.querySelector('div[class="str-search-wrap"]');
      if (searchDiv) {
        const newDiv = document.createElement('div');
        newDiv.id = 'scrap-ebay-div';

        const root = createRoot(newDiv);

        root.render(<ScrapEbayPages
          document={document}
          ebayProducts={allProducts}
        />);
        searchDiv?.insertAdjacentElement('afterend', newDiv);
      } else {
        const controlsDiv = document.querySelector('div[class*="srp-controls srp-controls-v3"]');
        if (controlsDiv) {
          const newDiv = document.createElement('div');
          newDiv.id = 'scrap-ebay-div';

          const root = createRoot(newDiv);
          root.render(<ScrapEbayPages
            document={document}
            ebayProducts={allProducts}
          />);
          controlsDiv?.insertAdjacentElement('beforeend', newDiv);
        }
      }
    }

    for (let i = 0; i < allProducts.length; i += 1) {
      const visibleProduct = allProducts[i];
      let sellerIdSpan = visibleProduct.querySelector('span[class*="s-item__seller-info"]');
      if (!sellerIdSpan) {
        sellerIdSpan = visibleProduct.querySelector('div[class*="s-item__wrapper"]');
        sellerIdSpan = sellerIdSpan.querySelector('div[class*="s-item__info"]');
      }
      if (document.querySelector('ul.srp-list')) {
        sellerIdSpan = visibleProduct.querySelector('div[class*="s-item__details"]')
        console.log("NEW SELLER ID", sellerIdSpan)
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
      price = removeCurrencySymbol(price);

      const imageLink = visibleProduct.querySelector('img')?.src;
      const isProductSponsored = visibleProduct.querySelector('span[data-w="pSnosroed"]');
      let soldAt = visibleProduct.querySelector('span[class*="s-item__caption--signal"]')?.innerText || '';
      if (soldAt) {
        soldAt = soldAt.split('Sold ')[1];
      }

      const dataToBeCopied = {
        title,
        price,
        sponsored: isProductSponsored ? true : false,
        itemNumber: productId,
        image: imageLink,
        username: storeName
      };

      ShowDataBox({
        visibleProduct: sellerIdSpan,
        storeName,
        productId,
        dataToBeCopied
      });
    }
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
})();
