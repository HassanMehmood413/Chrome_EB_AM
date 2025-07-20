import * as Callbacks from '../services/helpers/contentScript';
import { print } from '../services/utils';
print('Content script works!');

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    console.log('Main content script received message:', req.callback);
    
    if (req.callback === 'debugAmazonPage') {
      const result = Callbacks.debugAmazonPage(req.payload);
      sendResponse(result);
    } else if (req.callback === 'scrapeAmazonProducts') {
      Callbacks.scrapeAmazonProducts(req.payload).then(result => {
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, message: error.message });
      });
      return true; // Keep message channel open for async response
    } else if (req.callback === 'stopAmazonScraping') {
      const result = Callbacks.stopAmazonScraping(req.payload);
      sendResponse(result);
    } else {
      // Handle other existing callbacks
      Callbacks[req.callback](req.payload);
      sendResponse({ success: true });
    }
  } catch (e) {
    console.log('Error in main content script:', e);
    sendResponse({ success: false, message: e.message });
  }
  return true;
});
