
import { setLocal, onChange, getLocal } from '../../services/dbService';
import { sleep } from '../../services/utils';

console.log('\n *** Ebay Pre-List Product Page Script Running ***');

window.addEventListener('load', async function () {
  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  if (response.success) {
    preListProduct();
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
});

onChange('listing-status', async (_, newValue) => {
  if (newValue === 'paused' || newValue === 'terminated') {
    await chrome.runtime.sendMessage({
      callback: 'closeTab'
    });
    window.close();
    return;
  }
  if (newValue === 'error') {
    // check if close error listing enable
    const isBulkListing = await getLocal('is-bulk-listing');
    const closeTab = await getLocal('bulk-lister-close-listing');
    if (isBulkListing && closeTab) {
      await chrome.runtime.sendMessage({
        callback: 'closeTab'
      });
      window.close();
      return;
    }
  }
});

const preListProduct = async () => {
  console.log('eBay pre-list product fully loaded!');
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const automation = urlParams.get('automation');
    if (!automation) return;

    // check if continue button exist
    let continueButton = document.querySelector('.prelist-radix__next-action');
    if (continueButton) await continueButton.click();

    // checking if asked for select category
    const categoryDiv = document.querySelector('.category-picker');
    if (categoryDiv) {
      const categoryButtons = categoryDiv.querySelectorAll('.category-picker__suggested-section .se-field-card__body');
      if (categoryButtons?.length) {
        await categoryButtons[0].click();
      }
    }

    await sleep(5);
    continueButton = document.querySelector('.prelist-radix__next-action');
    if (continueButton) await continueButton.click();
    // selecting condition
    let conditionBox = null;
    while (!conditionBox) {
      conditionBox = document.querySelector('.condition-picker-radix');
      await sleep(1);
    }
    let conditionCheckboxes = conditionBox.querySelectorAll('.se-radio-group__option');
    conditionCheckboxes = [...conditionCheckboxes];
    conditionCheckboxes = conditionCheckboxes.filter(item => item.innerText.includes('New'));
    const newCondition = conditionCheckboxes?.[0] || null;
    // let newCondition = conditionCheckboxes.find(item => item.innerText === 'New');
    // if (!newCondition) {
    //   newCondition = conditionCheckboxes.find(item => item.innerText === 'New with box');
    // }
    if (newCondition) {
      await newCondition?.querySelector('input')?.click();

      const listingStatus = await getLocal('listing-status');
      if (listingStatus === 'paused' || listingStatus === 'terminated') {
        await chrome.runtime.sendMessage({
          callback: 'closeTab'
        });
        window.close();
        return;
      }

      // continue to listing button
      let continueListingButton = document.querySelector('.condition-dialog-radix__continue-btn');
      if (continueListingButton) {
        await sleep(.1);
        await continueListingButton.click();
      } else {
        continueListingButton = document.querySelector('.condition-dialog-non-block-radix__continue-btn');
        await sleep(.1);
        await continueListingButton.click();
      }

    }
  } catch (error) {
    await setLocal('listing-status', 'error');
    await setLocal('listing-error', error.message);
    const isBulkListing = await getLocal('is-bulk-listing');
    const closeTab = await getLocal('bulk-lister-close-listing');
    // check if close error listing enable
    if (isBulkListing && closeTab) {
      await chrome.runtime.sendMessage({
        callback: 'closeTab'
      });
      window.close();
    }
  }
};
