// Injects a 'View SKU' button into each eBay Active Listings row

(function() {
  function waitForTableAndInject() {
    // eBay Active Listings table selector (update if needed)
    const table = document.querySelector('table[role="grid"]');
    if (!table) {
      setTimeout(waitForTableAndInject, 1000);
      return;
    }
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      // Avoid duplicate buttons
      if (row.querySelector('.view-sku-btn')) return;
      // Try to get the title cell (update selector if needed)
      const titleCell = row.querySelector('a, .title, .shui-dt-column__title');
      if (!titleCell) return;
      const title = titleCell.textContent.trim();
      // Try to get the SKU or unique identifier
      // (You may want to use a data attribute or another cell)
      // For now, use the title as the key
      // Create the button
      const btn = document.createElement('button');
      btn.textContent = 'View SKU';
      btn.className = 'view-sku-btn';
      btn.style.marginLeft = '8px';
      btn.style.background = '#232f3e';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.padding = '4px 10px';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.title = 'View on Amazon';
      btn.onclick = async (e) => {
        e.stopPropagation();
        try {
          // Try to get the SKU from the listing row
          const skuCell = row.querySelector('[data-testid="custom-label"], .custom-label, input[name="customLabel"]');
          let asin = null;
          
          if (skuCell && skuCell.value) {
            const sku = skuCell.value;
            console.log('Found SKU:', sku);
            
            // Convert SKU to ASIN (base64 decode)
            try {
              asin = atob(sku);
              console.log('Decoded ASIN:', asin);
            } catch (error) {
              console.error('Error decoding SKU to ASIN:', error);
            }
          }
          
          if (asin) {
            // Get user domain settings from chrome.storage
            const userId = await chrome.storage.local.get('current-user');
            const domain = await chrome.storage.local.get(`selected-domain-${userId.current-user}`);
            
            let amazonLink = 'https://www.amazon.com';
            if (domain[`selected-domain-${userId.current-user}`] === 'UK') {
              amazonLink = 'https://www.amazon.co.uk';
            }
            
            window.open(`${amazonLink}/dp/${asin}`, '_blank');
          } else {
            // Fallback: search Amazon with the product title
            const searchQuery = encodeURIComponent(title || '');
            const userId = await chrome.storage.local.get('current-user');
            const domain = await chrome.storage.local.get(`selected-domain-${userId.current-user}`);
            
            let amazonLink = 'https://www.amazon.com';
            if (domain[`selected-domain-${userId.current-user}`] === 'UK') {
              amazonLink = 'https://www.amazon.co.uk';
            }
            
            window.open(`${amazonLink}/s?k=${searchQuery}`, '_blank');
          }
        } catch (error) {
          console.error('Error opening Amazon SKU:', error);
          // Fallback to title search
          const searchQuery = encodeURIComponent(title || '');
          window.open(`https://www.amazon.com/s?k=${searchQuery}`, '_blank');
        }
      };
      // Inject the button after the title
      titleCell.parentElement.appendChild(btn);
    });
  }
  waitForTableAndInject();
  // Optionally, observe for dynamic changes
  const observer = new MutationObserver(waitForTableAndInject);
  observer.observe(document.body, { childList: true, subtree: true });
})(); 