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
      // Try to get the Amazon URL from localStorage or chrome.storage
      let amazonUrl = null;
      try {
        const mapping = JSON.parse(localStorage.getItem('ebay-to-amazon-mapping') || '{}');
        amazonUrl = mapping[title];
      } catch (e) {}
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
      btn.style.cursor = amazonUrl ? 'pointer' : 'not-allowed';
      btn.disabled = !amazonUrl;
      btn.title = amazonUrl ? 'View on Amazon' : 'No Amazon link found';
      btn.onclick = (e) => {
        e.stopPropagation();
        if (amazonUrl) window.open(amazonUrl, '_blank');
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