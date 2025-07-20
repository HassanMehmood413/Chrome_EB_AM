import { createRoot } from 'react-dom/client';

import ProductPageIconsDataBox from '../../components/Ebay/AllProductsPageDatabox';
import ScrapEbayPages from '../../components/Ebay/ScrapEbayPages';

import { sleep } from '../../services/utils';

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
