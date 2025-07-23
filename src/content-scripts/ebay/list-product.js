import { notification } from 'antd';
import { Buffer } from 'buffer';
import { ceil, extend } from 'lodash';

import { getLocal, setLocal, onChange } from '../../services/dbService';
import { sleep } from '../../services/utils';
import { getDescription } from './helpers';

console.log('\n *** Ebay List Product Page Script Running ***');

window.addEventListener('load', async function () {
  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  if (response.success) {
    listProduct();
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
});

window.addEventListener('beforeunload', async () => {
  await chrome.runtime.sendMessage({
    payload: {},
    callback: 'clearListingData'
  });
  await setLocal('listing-status', null);
});

// Function to create a file object and simulate the upload
const processImageForEbay = async (imageBlob, minWidth = 500, minHeight = 500) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      try {
        const { width, height } = img;
        console.log(`Processing image: ${width}x${height}`);

        // Calculate new dimensions to ensure both width and height meet minimum requirements
        let newWidth = Math.max(width, minWidth);
        let newHeight = Math.max(height, minHeight);

        // If image is smaller than minimum, scale it up maintaining aspect ratio
        if (width < minWidth || height < minHeight) {
          const scaleWidth = minWidth / width;
          const scaleHeight = minHeight / height;
          const scale = Math.max(scaleWidth, scaleHeight);

          newWidth = Math.round(width * scale);
          newHeight = Math.round(height * scale);
        }

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Fill with white background (in case of transparency)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, newWidth, newHeight);

        // Draw and resize image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert canvas to blob
        canvas.toBlob((processedBlob) => {
          if (processedBlob) {
            console.log(`Image processed: ${width}x${height} -> ${newWidth}x${newHeight}`);
            resolve(processedBlob);
          } else {
            reject(new Error('Failed to process image'));
          }
        }, 'image/jpeg', 0.95); // 95% quality for better image quality

      } catch (error) {
        console.error('Error processing image:', error);
        reject(error);
      }
    };

    img.onerror = (error) => {
      console.error('Error loading image:', error);
      reject(new Error('Failed to load image'));
    };

    // Create object URL for the image
    const imageUrl = URL.createObjectURL(imageBlob);
    img.src = imageUrl;
  });
};

const uploadFile = async (fileInput, file) => {
  const dataTransfer = new DataTransfer(); // Create a new DataTransfer object
  dataTransfer.items.add(file); // Add the file to the dataTransfer object
  fileInput.files = dataTransfer.files; // Assign the files to the input element

  // Trigger change event to simulate the user selecting the file
  const event = new Event('change', { bubbles: true });
  await fileInput.dispatchEvent(event);
};

const setInput = (element, value) => {
  return new Promise((resolve) => {
    try {
      // Focus the element first
      element.focus();

      // Clear existing value
      element.value = '';

      // Use React's way of setting value if available
      const prototype = Object.getPrototypeOf(element);
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (valueSetter) {
        valueSetter.call(element, value);
      } else {
        element.value = value;
      }

      // Trigger multiple events to ensure React/eBay detects the change
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

      // Also try React synthetic events
      const reactEvent = new Event('input', { bubbles: true });
      reactEvent.simulated = true;
      element.dispatchEvent(reactEvent);

      resolve(true);
    } catch (error) {
      console.error('Error in setInput:', error);
      resolve(false);
    }
  });
};

const fillEbayFormFields = async (reqData) => {
  // Prevent multiple simultaneous calls with more robust checking
  const currentTime = Date.now();
  const lastCallTime = window.lastEbayFormFillTime || 0;

  // Prevent calls within 5 seconds of each other
  if (currentTime - lastCallTime < 5000) {
    console.log('⚠️ Form filling called too recently, skipping to prevent duplication...');
    return;
  }

  window.lastEbayFormFillTime = currentTime;
  console.log('🚀 Starting form field population...');
  
  try {
  const { title, description, price, attributes } = reqData;

    // Shared description selectors for both filling and verification
    const descriptionSelectors = [
      'div[contenteditable="true"][aria-label="Description"]',
      'div[contenteditable="true"][data-placeholder*="Write a detailed description"]',
      'div[datatestid="richEditor"]', // if not a typo
      'div[contenteditable="true"][role="textbox"]',
      'div.se-rte-editor__rich.placeholder',
      // Legacy or fallback selectors
      'textarea[aria-label*="description" i]',
      '#description',
      '.description textarea',
      'textarea[rows]:not([rows="1"])'
    ];
  
  // Helper function to extract text from HTML
  const extractTextFromHTML = (html) => {
    if (!html) return '';
    
    try {
      // Create a temporary div to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Remove script and style elements
      const scripts = tempDiv.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      
      // Get text content and clean it up
      let text = tempDiv.textContent || tempDiv.innerText || '';
      
      // Clean up whitespace and line breaks
      text = text.replace(/\s+/g, ' ').trim();
      
      // Limit to eBay's description character limit (around 1000 chars for safety)
      if (text.length > 1000) {
        text = text.substring(0, 997) + '...';
      }
      
      return text;
    } catch (error) {
      console.error('Error extracting text from HTML:', error);
      return html; // Fallback to original if extraction fails
    }
  };
  
  // Helper function to set input values with better error handling
  const setInputValue = (element, value) => {
    if (!element) return false;
    
    try {
      element.focus();
      element.value = '';
      
      const prototype = Object.getPrototypeOf(element);
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (valueSetter) {
        valueSetter.call(element, value);
      } else {
        element.value = value;
      }
      
        // Trigger comprehensive events for eBay validation
        element.dispatchEvent(new Event('focus', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('keyup', { bubbles: true, cancelable: true }));

        // Small delay to ensure events are processed
        setTimeout(() => {
      element.dispatchEvent(new Event('blur', { bubbles: true }));
        }, 100);
      
      return true;
    } catch (error) {
      console.error(`❌ Fill error for ${element.name || element.id}:`, error.message);
      return false;
    }
  };

    // Helper function to handle dropdown selection
    const setDropdownValue = async (dropdown, value) => {
      if (!dropdown || !value) return false;

      try {
        // Focus on the dropdown
        dropdown.focus();
        dropdown.click();

        // Wait for dropdown to open
        await sleep(0.5);

        // Find the option that matches the value
        const options = dropdown.querySelectorAll('option');
        let matchedOption = null;

        for (const option of options) {
          const optionText = (option.textContent || option.innerText || '').trim().toLowerCase();
          const targetValue = value.toLowerCase();

          if (optionText === targetValue ||
            optionText.includes(targetValue) ||
            targetValue.includes(optionText)) {
            matchedOption = option;
            break;
          }
        }

        if (matchedOption) {
          dropdown.value = matchedOption.value;
          matchedOption.selected = true;

          // Trigger events
          dropdown.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          dropdown.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          dropdown.blur();

          console.log(`✅ Dropdown filled: ${value} -> ${matchedOption.textContent}`);
          return true;
        } else {
          console.log(`❌ No matching option found for: ${value}`);
          return false;
        }
      } catch (error) {
        console.error(`❌ Dropdown fill error:`, error.message);
      return false;
    }
  };
  
  // Helper function to safely find elements with multiple strategies
  const safeQuerySelector = (selectors) => {
    if (!selectors || !Array.isArray(selectors)) return null;
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (error) {
        console.warn(`Invalid selector: ${selector}`, error);
      }
    }
    return null;
  };
  
  // Wait for form to be ready
  await sleep(2);
  
  // 1. Fill Title - Multiple selector strategies
  const titleSelectors = [
    'input[name="title"]',
    'input[data-testid="title"]',
    '#title',
    'input[placeholder*="title" i]',
    'input[placeholder*="item title" i]',
    'input[aria-label*="title" i]',
    'input[type="text"][name*="title"]',
    'input[type="text"][id*="title"]'
  ];
  
  const titleInput = safeQuerySelector(titleSelectors);
  if (titleInput && title) {
    setInputValue(titleInput, title);
  } else {
    console.log('⚠️ Title input not found. Available inputs:', 
        Array.from(document.querySelectorAll('input')).map(i => ({ name: i.name, id: i.id, placeholder: i.placeholder, 'aria-label': i.getAttribute('aria-label') })));
    }

    // 2. Fill Description - Using working approach from console test
    if (description) {
      // Generate AI description instead of using raw product detail
      let aiDescription = '';
      try {
        // Use the description from getDescription helper or generate a better one
        if (title && title.length > 0) {
          aiDescription = `${title}\n\nThis is a high-quality product that meets all specifications. Fast shipping and excellent customer service guaranteed.`;
        } else {
          aiDescription = description;
        }
      } catch (error) {
        console.warn('❌ AI description generation failed, using original:', error);
        aiDescription = description;
      }

      // Clean and limit description for eBay
      let cleanDescription = aiDescription;
      if (aiDescription.includes('<') && aiDescription.includes('>')) {
        cleanDescription = extractTextFromHTML(aiDescription);
    }
    
    // Limit length for eBay
    if (cleanDescription.length > 1000) {
      cleanDescription = cleanDescription.substring(0, 997) + '...';
    }
    
      console.log('🚀 Filling description:', cleanDescription.substring(0, 100) + '...');

      // Target the exact eBay description field structure
      const workingDescriptionSelectors = [
        'div.se-rte-editor__rich.placeholder[datatestid="richEditor"]',
        'div[datatestid="richEditor"][contenteditable="true"]',
        'div.se-rte-editor__rich[contenteditable="true"]',
        'div[contenteditable="true"][aria-label="Description"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[data-placeholder*="Write a detailed description"]',
        'div[datatestid="richEditor"]',
        'div.se-rte-editor__rich.placeholder',
        // Additional fallback selectors
        'textarea[aria-label*="description" i]',
        'textarea[name*="description"]',
        'textarea[id*="description"]',
        '#description',
        '[contenteditable="true"]', // Generic contenteditable
        'textarea' // Any textarea as last resort
      ];

      // Use direct DOM manipulation with enhanced event dispatching (same as console script)
      console.log('🚀 Using enhanced description filling approach...');
      
      let filled = false;

      // Method 1: Fill the visible description editor/box that users can see
      console.log('🔍 Looking for visible description editor...');
      
      // First, try to find the visible contenteditable description editor
      const visibleEditors = [
        'div[contenteditable="true"][aria-label*="Description"]',
        'div[contenteditable="true"][data-testid*="description"]',
        'div[contenteditable="true"][data-testid*="richEditor"]',
        'div.se-rte-editor__rich[contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
        '[contenteditable="true"]' // Generic fallback
      ];
      
      let visibleEditor = null;
      for (const selector of visibleEditors) {
        const editor = document.querySelector(selector);
        if (editor && editor.offsetParent !== null) { // Check if visible
          visibleEditor = editor;
          console.log(`✅ Found visible editor with selector: ${selector}`, editor);
          break;
        }
      }
      
      if (visibleEditor) {
        try {
          // Clear and fill the visible editor
          visibleEditor.innerHTML = '';
          visibleEditor.innerText = cleanDescription;
          
          // Focus the editor to make sure it's active
          visibleEditor.focus();
          
          // Trigger comprehensive events
          visibleEditor.dispatchEvent(new Event('focus', { bubbles: true }));
          visibleEditor.dispatchEvent(new Event('input', { bubbles: true }));
          visibleEditor.dispatchEvent(new Event('change', { bubbles: true }));
          visibleEditor.dispatchEvent(new Event('blur', { bubbles: true }));
          
          console.log('✅ Successfully filled visible description editor');
          filled = true;
    } catch (error) {
          console.log('❌ Error filling visible editor:', error);
        }
      }

      // Method 2: Fill hidden textarea (backend form submission)
      const hiddenTextarea = document.querySelector('textarea[name="description"]');
      if (hiddenTextarea) {
        try {
          console.log('✅ Found hidden textarea:', hiddenTextarea);
          hiddenTextarea.value = cleanDescription;
          hiddenTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          hiddenTextarea.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('✅ Successfully filled hidden textarea');
          filled = true;
        } catch (error) {
          console.log('❌ Error filling hidden textarea:', error);
    }
  } else {
        console.log('❌ Hidden textarea not found');
      }

      // Method 3: Fill iframe content (rich text editor)
      const iframe = document.querySelector('iframe[title="Description"], iframe[aria-label="Description"]');
      if (iframe) {
        try {
          console.log('✅ Found description iframe:', iframe);
          
          // Wait for iframe to be ready
          await new Promise(resolve => {
            if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
              resolve();
            } else {
              iframe.onload = resolve;
              setTimeout(resolve, 1000); // Fallback timeout
            }
          });
          
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const body = iframeDoc.body;
          
          if (body) {
            // Target the actual contenteditable div inside iframe body
            const richEditor = iframeDoc.querySelector('.se-rte-editor__rich');
            if (richEditor) {
              richEditor.innerHTML = '';
              richEditor.focus();
              try {
                iframeDoc.execCommand('insertText', false, cleanDescription);
              } catch (err) {
                // Fallback for browsers where execCommand is deprecated
                richEditor.innerHTML = cleanDescription;
              }
              
              // Trigger events on the rich editor
              ['input','change','keyup'].forEach(ev =>
                richEditor.dispatchEvent(new Event(ev, { bubbles: true, cancelable: true }))
              );
            } else {
              // Fallback to body if rich editor not found
              body.innerHTML = cleanDescription;
              ['input','change','keyup'].forEach(ev =>
                body.dispatchEvent(new Event(ev, { bubbles: true, cancelable: true }))
              );
            }
            // Also trigger change on iframe element
            iframe.dispatchEvent(new Event('change', { bubbles: true }));

            // Sync hidden textarea
            if (hiddenTextarea) {
              hiddenTextarea.value = cleanDescription;
              hiddenTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            }

            console.log('✅ Successfully filled iframe rich editor via execCommand');
            filled = true;
          } else {
            console.log('❌ Iframe body not accessible');
          }
        } catch (error) {
          console.log('❌ Error filling iframe:', error);
        }
      } else {
        console.log('❌ Description iframe not found');
      }

      // Fallback: try other selectors
      if (!filled) {
        for (const selector of workingDescriptionSelectors) {
          const el = document.querySelector(selector);
          if (el && !filled) {
            try {
              const isDescriptionField = el.getAttribute('aria-label')?.toLowerCase().includes('description') ||
                el.getAttribute('placeholder')?.toLowerCase().includes('description') ||
                el.getAttribute('data-placeholder')?.toLowerCase().includes('description') ||
                el.id?.toLowerCase().includes('description') ||
                el.name?.toLowerCase().includes('description') ||
                selector.includes('description') ||
                selector.includes('richEditor') ||
                el.getAttribute('role') === 'textbox' ||
                el.classList.contains('se-rte-editor__rich');

              if (isDescriptionField || selector === 'textarea') {
                if (el.contentEditable === "true") {
                  el.innerHTML = '';
                  el.innerText = cleanDescription;
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (el.tagName.toLowerCase() === 'textarea') {
                  el.value = cleanDescription;
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                console.log(`✅ Description filled using fallback selector: ${selector}`);
                filled = true;
                break;
              }
            } catch (error) {
              console.warn(`❌ Error with fallback selector ${selector}:`, error);
            }
          }
        }
      }

      if (!filled) {
        console.warn("❌ Could not find the description field.");
        // Enhanced debug information
        const allTextareas = document.querySelectorAll('textarea');
        const allContentEditables = document.querySelectorAll('[contenteditable="true"]');
        console.log(`🔍 Debug: Found ${allTextareas.length} textarea elements and ${allContentEditables.length} contenteditable elements`);
        
        // Show details of available fields
        if (allTextareas.length > 0) {
          console.log('📝 Available textareas:', Array.from(allTextareas).map(t => ({
            id: t.id,
            name: t.name,
            'aria-label': t.getAttribute('aria-label'),
            placeholder: t.placeholder,
            className: t.className
          })));
        }
        
        if (allContentEditables.length > 0) {
          console.log('📝 Available contenteditable:', Array.from(allContentEditables).map(t => ({
            id: t.id,
            'aria-label': t.getAttribute('aria-label'),
            'data-placeholder': t.getAttribute('data-placeholder'),
            className: t.className,
            role: t.getAttribute('role')
          })));
        }
      } else {
        console.log('✅ Description filled successfully');
        
        // Verify description was actually filled and retry if needed
        setTimeout(async () => {
          console.log('🔍 Verifying description fill...');
          
          const hiddenTextarea = document.querySelector('textarea[name="description"]');
          const iframe = document.querySelector('iframe[title="Description"], iframe[aria-label="Description"]');
          
          let isActuallyFilled = false;
          
          // Check if hidden textarea has our content
          if (hiddenTextarea && hiddenTextarea.value && hiddenTextarea.value.length > 50) {
            console.log('✅ Hidden textarea verification: FILLED');
            console.log('📝 Actual textarea content:', hiddenTextarea.value.substring(0, 100) + '...');
            isActuallyFilled = true;
          } else if (hiddenTextarea) {
            console.log('❌ Hidden textarea found but EMPTY or too short');
            console.log('📝 Current textarea value:', hiddenTextarea.value);
            console.log('📏 Value length:', hiddenTextarea.value.length);
          }
          
          // Check if iframe has our content
          if (!isActuallyFilled && iframe) {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
              if (iframeDoc && iframeDoc.body && iframeDoc.body.innerHTML.length > 50) {
                console.log('✅ Iframe verification: FILLED');
                isActuallyFilled = true;
              }
            } catch (error) {
              console.log('⚠️ Could not verify iframe content');
            }
          }
          
          if (!isActuallyFilled) {
            console.log('❌ Description verification FAILED - attempting retry...');
            
            // Retry with more aggressive approach
            if (hiddenTextarea) {
              hiddenTextarea.value = cleanDescription;
              hiddenTextarea.focus();
              hiddenTextarea.dispatchEvent(new Event('input', { bubbles: true }));
              hiddenTextarea.dispatchEvent(new Event('change', { bubbles: true }));
              hiddenTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            
            if (iframe) {
              try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc) {
                  iframeDoc.body.innerHTML = cleanDescription;
                  iframeDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
                  iframeDoc.body.dispatchEvent(new Event('change', { bubbles: true }));
                }
              } catch (error) {
                console.log('❌ Retry iframe fill failed:', error);
              }
            }
            
            console.log('🔄 Description retry completed');
          } else {
            console.log('🎉 Description verification: SUCCESS');
          }
        }, 2000); // Wait 2 seconds before verification
      }
  }
  
  // 3. Fill Price - Multiple selector strategies
  const priceSelectors = [
    'input[name="price"]',
    'input[data-testid="price"]',
    '#price',
    'input[placeholder*="price" i]',
    'input[aria-label*="price" i]',
    'input[type="number"]',
    'input[type="text"][name*="price"]'
  ];
  
  const priceInput = safeQuerySelector(priceSelectors);
  if (priceInput && price) {
    setInputValue(priceInput, price);
  } else {
    console.log('⚠️ Price input not found');
  }
  
    // 4. Fill Item Specifics - Updated for checkbox-based suggestions
  if (attributes && typeof attributes === 'object') {
    console.log('🚀 Filling item specifics:', attributes);
    
      // First, try to find and check suggested item specifics (checkboxes)
      // Look for extracted attribute checkboxes first
      let suggestedSection = null;

      // Check if there are any extracted attribute checkboxes
      const extractedCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="extracted-attribute-"]');
      if (extractedCheckboxes.length > 0) {
        // Find the common parent container
        suggestedSection = extractedCheckboxes[0].closest('form') ||
          extractedCheckboxes[0].closest('div') ||
          document.body;
        console.log(`✅ Found ${extractedCheckboxes.length} extracted attribute checkboxes`);
      } else {
        // Fallback to traditional selectors
        const suggestedSectionSelectors = [
          '.suggested-item-specifics',
          '[class*="suggested"]',
          '[class*="item-specific"]',
          '[class*="specifics"]',
          '[id*="specific"]',
          '[id*="suggested"]',
          // Look in common eBay section structures
          '.item-specifics',
          '#item-specifics',
          '[data-testid*="specific"]',
          '[data-testid*="suggested"]',
          // Look for checkbox containers
          '.checkbox-group',
          '.form-checkboxes',
          // General form sections that might contain checkboxes
          'form section:has(input[type="checkbox"])',
          'div:has(input[type="checkbox"][id*="specific"])',
          'div:has(input[type="checkbox"][name*="specific"])'
        ];

        for (const selector of suggestedSectionSelectors) {
          try {
            suggestedSection = document.querySelector(selector);
            if (suggestedSection && suggestedSection.querySelectorAll('input[type="checkbox"]').length > 0) {
              console.log(`✅ Found suggested section with selector: ${selector}`);
              break;
            }
          } catch (error) {
            console.warn(`Invalid selector: ${selector}`);
          }
        }
      }

      if (suggestedSection) {
        console.log('✅ Found suggested item specifics section');

        // Debug: Show all available checkboxes
        const allCheckboxesInSection = suggestedSection.querySelectorAll('input[type="checkbox"]');
        console.log(`🔍 Found ${allCheckboxesInSection.length} checkboxes in suggested section:`);
        allCheckboxesInSection.forEach((cb, index) => {
          console.log(`  ${index + 1}. ID: "${cb.id}", Name: "${cb.name}", Checked: ${cb.checked}`);
        });

        // FIRST: Check ALL extracted-attribute checkboxes aggressively (outside attribute loop)
        const allExtractedCheckboxes = suggestedSection.querySelectorAll('input[type="checkbox"][id^="extracted-attribute-"]');
        console.log(`🎯 Found ${allExtractedCheckboxes.length} extracted attribute checkboxes, checking ALL of them...`);

        for (const checkbox of allExtractedCheckboxes) {
          if (!checkbox.checked) {
            const attributeName = checkbox.id.replace('extracted-attribute-', '').replace('-', ' ');
            console.log(`✅ Checking extracted attribute: "${attributeName}"`);
            
            // Try multiple approaches to check the checkbox
            try {
              // Method 1: Direct click (most reliable for eBay)
              checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await sleep(0.2);
              
              // Ensure checkbox is visible and clickable
              if (checkbox.offsetParent !== null && !checkbox.disabled) {
                checkbox.click();
                await sleep(0.3);
                
                // Verify it was checked
                if (checkbox.checked) {
                  console.log(`✅ Successfully checked ${attributeName} via click`);
                } else {
                  // Method 2: Programmatic setting with events
                  checkbox.checked = true;
                  checkbox.setAttribute('checked', 'checked');
                  
                  // Dispatch events
                  checkbox.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                  checkbox.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                  
                  // Method 3: Mouse events as fallback
                  const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
                  const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
                  const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
                  
                  checkbox.dispatchEvent(mouseDown);
                  checkbox.dispatchEvent(mouseUp);
                  checkbox.dispatchEvent(clickEvent);
                  
                  console.log(`✅ Fallback check for ${attributeName}`);
                }
              } else {
                console.log(`⚠️ Checkbox for ${attributeName} is not clickable`);
              }
            } catch (error) {
              console.error(`❌ Error checking ${attributeName}:`, error);
            }

            await sleep(0.5); // Increased delay for eBay to process
          }
        }

        // SECOND: Try to match regular item specifics by field names/values
    for (const [fieldName, values] of Object.entries(attributes)) {
      if (!fieldName || !values) continue;
      
      const value = Array.isArray(values) ? values[0] : values;
      if (!value) continue;
      
          console.log(`🎯 Trying to match field: "${fieldName}" with value: "${value}"`);

          // Look for non-extracted-attribute checkboxes with matching text
          const checkboxes = suggestedSection.querySelectorAll('input[type="checkbox"]:not([id^="extracted-attribute-"])');

          for (const checkbox of checkboxes) {

            // Fallback: Try label text matching
            const labelSources = [
              checkbox.closest('label'),
              checkbox.parentElement?.querySelector('label'),
              checkbox.nextElementSibling,
              checkbox.parentElement,
              // Check siblings for text content
              checkbox.parentElement?.querySelector('span'),
              checkbox.parentElement?.querySelector('div')
            ];

            let labelText = '';
            for (const source of labelSources) {
              if (source && source.textContent?.trim()) {
                labelText = source.textContent.trim();
                break;
              }
            }

            if (labelText) {
              const labelLower = labelText.toLowerCase();
              const fieldLower = fieldName.toLowerCase();
              const valueLower = value.toLowerCase();

              // Enhanced matching for eBay's format (e.g., "Genre: Simulation")
              const matchesFieldValue = labelLower.includes(`${fieldLower}:`) &&
                labelLower.includes(valueLower);

              const matchesField = labelLower.includes(fieldLower) ||
                fieldLower.includes(labelLower);

              const matchesValue = labelLower.includes(valueLower) ||
                valueLower.includes(labelLower);

              // Also check for exact formats like "Genre: Simulation"
              const exactMatch = labelLower === `${fieldLower}: ${valueLower}` ||
                labelLower === `${fieldLower}:${valueLower}` ||
                labelLower === `${fieldLower} ${valueLower}`;

              if (exactMatch || matchesFieldValue || (matchesField && matchesValue)) {
                if (!checkbox.checked) {
                  console.log(`✅ Checking suggested item specific: "${labelText}" for ${fieldName}: ${value}`);
                  checkbox.checked = true;
                  checkbox.click();
                  checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                  console.log(`ℹ️ Already checked: "${labelText}"`);
                }
              }
            }
          }
        }

        // Summary using previously declared variables
        const totalAttributes = Object.keys(attributes).length;

        console.log(`📊 Item Specifics Summary:`);
        console.log(`   - Total extracted attribute checkboxes found: ${allExtractedCheckboxes.length}`);
        console.log(`   - Total attributes we have: ${totalAttributes}`);

        const currentCheckedBoxes = suggestedSection.querySelectorAll('input[type="checkbox"][id^="extracted-attribute-"]:checked');
        console.log(`   - Extracted attribute checkboxes now checked: ${currentCheckedBoxes.length}`);

        if (currentCheckedBoxes.length > 0) {
          console.log('✅ Checked extracted attribute checkboxes:');
          currentCheckedBoxes.forEach((cb, index) => {
            const attrName = cb.id.replace('extracted-attribute-', '').replace('-', ' ');
            console.log(`  ${index + 1}. "${attrName}" (ID: ${cb.id})`);
          });
        }

        // Final summary - count what we checked
        const finalExtractedCheckboxes = suggestedSection.querySelectorAll('input[type="checkbox"][id^="extracted-attribute-"]');
        const finalCheckedBoxes = suggestedSection.querySelectorAll('input[type="checkbox"][id^="extracted-attribute-"]:checked');
        console.log(`📈 Final result: ${finalCheckedBoxes.length}/${finalExtractedCheckboxes.length} extracted attribute checkboxes are now checked`);

        if (finalCheckedBoxes.length === finalExtractedCheckboxes.length) {
          console.log('🎉 All available extracted attribute checkboxes are now checked!');
        } else {
          console.log(`⚠️ Warning: Still ${finalExtractedCheckboxes.length - finalCheckedBoxes.length} checkboxes unchecked. eBay may still require more.`);
        }

      } else {
        console.log('⚠️ No suggested item specifics section found, trying direct checkbox matching...');

        // Look for extracted attribute checkboxes directly
        for (const [fieldName, values] of Object.entries(attributes)) {
          if (!fieldName || !values) continue;

          const value = Array.isArray(values) ? values[0] : values;
          if (!value) continue;

          // Look for eBay's extracted attribute checkboxes
          const extractedCheckboxId = `extracted-attribute-${fieldName.replace(' ', '-')}`;
          let extractedCheckbox = document.getElementById(extractedCheckboxId);

          // Try variations of the field name
          if (!extractedCheckbox) {
            const variations = [
              fieldName.toLowerCase().replace(' ', '-'),
              fieldName.toLowerCase().replace(' ', ''),
              fieldName.replace(' ', '-'),
              fieldName.replace(' ', '')
            ];

            for (const variation of variations) {
              extractedCheckbox = document.getElementById(`extracted-attribute-${variation}`);
              if (extractedCheckbox) break;
            }
          }

          if (extractedCheckbox && !extractedCheckbox.checked) {
            console.log(`✅ Found and checking extracted attribute checkbox: ${extractedCheckboxId}`);
            extractedCheckbox.checked = true;
            extractedCheckbox.click();
            extractedCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (extractedCheckbox) {
            console.log(`ℹ️ Extracted attribute already checked: ${extractedCheckboxId}`);
          } else {
            console.log(`❌ Could not find extracted attribute checkbox for: ${fieldName}`);
          }
        }

        // Debug: Look for any checkbox sections
        const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
        console.log(`🔍 Debug: Found ${allCheckboxes.length} checkboxes on page`);

        if (allCheckboxes.length > 0) {
          console.log('☑️ Available checkboxes:', Array.from(allCheckboxes).slice(0, 10).map(cb => {
            const label = cb.closest('label') || cb.parentElement?.querySelector('label') || cb.nextElementSibling;
            return {
              id: cb.id,
              name: cb.name,
              checked: cb.checked,
              labelText: label ? (label.textContent || label.innerText || '').trim().substring(0, 100) : 'No label',
              parentClass: cb.parentElement?.className || 'No parent class'
            };
          }));
        }
      }

      // Fallback: Try traditional input/select field approach
      const fieldNames = Object.keys(reqData.attributes || {});
      console.log(`🔍 Available attributes for dropdown processing:`, fieldNames);
      
      // Wait for eBay dropdowns to fully render
      console.log('⏳ Waiting for eBay dropdown buttons to render...');
      await sleep(3);
      
      for (let i = 0; i < fieldNames.length; i++) {
        const fieldName = fieldNames[i];
        if (!fieldName) continue;

        // Get value from attributes if it exists, otherwise try to get from other sources
        let value = reqData.attributes[fieldName]?.[0] || reqData.attributes[fieldName];
        
        // Generic value simplification for better dropdown matching
        if (value && typeof value === 'string') {
          // Remove common noise words and long descriptions
          value = value
            .replace(/\s*-\s*(new|used|brand new|sealed|mint|standard|deluxe|collector|limited|edition).*$/gi, '')
            .replace(/\s*\(.*\)$/gi, '')
            .trim();
          
          // If value is still too long, try to extract first meaningful part
          if (value.length > 50) {
            const parts = value.split(/[-,\/]/).map(p => p.trim()).filter(p => p.length > 2);
            if (parts.length > 0) {
              value = parts[0].trim();
            }
          }
        }
        
        // Generic fallback: extract value from title if not available
        if (!value) {
          let extractedValue = (reqData.title || '')
            .replace(/\s*-\s*(new|used|brand new|sealed|mint|standard|deluxe|collector|limited|edition).*$/gi, '')
            .replace(/\s*\(.*\)$/gi, '')
            .trim();
          
          if (extractedValue.length > 5) {
            value = extractedValue;
          }
        }
        
        if (!value) continue;

        console.log(`🔍 Processing field: ${fieldName} with value: ${value}`);

        // Try to find input fields
      let fieldInput = null;
      
        // Look for inputs with matching names/ids
        fieldInput = document.querySelector(`input[name*="${fieldName.toLowerCase()}"]`) ||
          document.querySelector(`select[name*="${fieldName.toLowerCase()}"]`) ||
          document.querySelector(`input[id*="${fieldName.toLowerCase()}"]`) ||
          document.querySelector(`select[id*="${fieldName.toLowerCase()}"]`);

        // If the found element is hidden/invisible, treat as not found so dropdown handler runs
        if (fieldInput && (fieldInput.offsetParent === null || fieldInput.type === 'hidden')) {
          console.log(`ℹ️ Ignoring hidden input for ${fieldName}`);
          fieldInput = null;
        }

        // Handle eBay dropdown menus (like Game Name)
        if (!fieldInput) {
          console.log(`🔍 No input field found for ${fieldName}, checking for dropdown...`);
          
          // Wait for dropdown button to appear (timing issue fix)
          let dropdownButton = null;
          let retries = 0;
          const maxRetries = 10;
          
          while (!dropdownButton && retries < maxRetries) {
             dropdownButton = document.querySelector(`button[name="attributes.${fieldName}"]`);
             if (!dropdownButton) {
               console.log(`🔍 Dropdown button attempt ${retries + 1}/${maxRetries} for "${fieldName}"...`);
               await sleep(0.5); // Wait 0.5 seconds before retry
               retries++;
             }
           }
          
          console.log(`🔍 Dropdown button search for "attributes.${fieldName}":`, dropdownButton ? '✅ Found' : '❌ Not found');
          
          // Debug: Show available dropdown buttons if not found
          if (!dropdownButton && retries >= maxRetries) {
            const allDropdownButtons = document.querySelectorAll('button[name^="attributes."]');
            console.log(`🔍 Debug: Found ${allDropdownButtons.length} dropdown buttons on page:`, 
              Array.from(allDropdownButtons).map(btn => btn.name).slice(0, 5));
          }
          
          if (dropdownButton) {
            console.log(`✅ Found dropdown for ${fieldName}, opening menu...`);
            try {
              // Open the dropdown menu
              dropdownButton.click();
              await sleep(0.5);
              
              // First try to find exact match in suggested section
              let matchFound = false;
              const menuItems = document.querySelectorAll('.menu__item[role="menuitemradio"]');
              
              for (const item of menuItems) {
                const span = item.querySelector('span');
                if (span && span.textContent.trim().toLowerCase() === value.toLowerCase()) {
                  console.log(`✅ Found exact match in dropdown: "${span.textContent.trim()}"`);
                  item.click();
                  matchFound = true;
                  break;
                }
              }
              
              // If no exact match, try partial match
              if (!matchFound) {
                for (const item of menuItems) {
                  const span = item.querySelector('span');
                  if (span && span.textContent.trim().toLowerCase().includes(value.toLowerCase())) {
                    console.log(`✅ Found partial match in dropdown: "${span.textContent.trim()}"`);
                    item.click();
                    matchFound = true;
                    break;
                  }
                }
              }
              
                             // If still no match, use search box
               if (!matchFound) {
                 const searchFieldName = fieldName.replace(/\s+/g, '');
                 const searchInput = document.querySelector(`input[name="search-box-attributes${searchFieldName}"]`);
                 if (searchInput) {
                   console.log(`✅ Using search box for ${fieldName}: ${value}`);
                   
                   // Clear search first and focus
                   searchInput.value = '';
                   searchInput.focus();
                   
                   // Type the search term with proper events
                   searchInput.value = value;
                   searchInput.dispatchEvent(new Event('focus', { bubbles: true }));
                   searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                   searchInput.dispatchEvent(new Event('keyup', { bubbles: true }));
                   searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                   
                   console.log(`⏳ Waiting for search results to update for ${fieldName}...`);
                   await sleep(2); // Longer delay for search results to load
                   
                   // Press Enter to select the search result
                   const enterEvent = new KeyboardEvent('keydown', {
                     key: 'Enter',
                     code: 'Enter',
                     keyCode: 13,
                     which: 13,
                     bubbles: true,
                     cancelable: true
                   });
                   searchInput.dispatchEvent(enterEvent);
                   
                   // Also try keyup event for Enter
                   const enterUpEvent = new KeyboardEvent('keyup', {
                     key: 'Enter',
                     code: 'Enter',
                     keyCode: 13,
                     which: 13,
                     bubbles: true,
                     cancelable: true
                   });
                   searchInput.dispatchEvent(enterUpEvent);
                   
                   console.log(`✅ Pressed Enter to save search result for ${fieldName}`);
                   await sleep(1); // Wait for selection to register
                   
                   // Check if Enter actually worked by seeing if dropdown closed or value was selected
                   const dropdownStillOpen = document.querySelectorAll('.menu__item[role="menuitemradio"]').length > 0;
                   
                   if (dropdownStillOpen) {
                     console.log(`⚠️ Enter didn't work, trying manual selection for ${fieldName}...`);
                     matchFound = false;
                     
                     // Look for matching results after search (fallback if Enter didn't work)
                     const updatedMenuItems = document.querySelectorAll('.menu__item[role="menuitemradio"]');
                     console.log(`📋 After search: Found ${updatedMenuItems.length} items for ${fieldName}`);
                     
                     for (const item of updatedMenuItems) {
                       const span = item.querySelector('span');
                       const itemText = span ? span.textContent.trim() : '';
                       if (itemText.toLowerCase().includes(value.toLowerCase())) {
                         console.log(`✅ Found search match for ${fieldName}: "${itemText}"`);
                         item.click();
                         matchFound = true;
                         break;
                       }
                     }
                     
                     if (!matchFound) {
                       console.log(`❌ Search did not return matching results for ${fieldName}: ${value}`);
                     }
                   } else {
                     console.log(`✅ Enter key successfully selected value for ${fieldName}`);
                     matchFound = true;
                   }
                 }
               }
              
              if (!matchFound) {
                console.log(`❌ Could not find or select ${fieldName}: ${value} in dropdown`);
                // Close dropdown by clicking outside or pressing escape
                document.body.click();
              }
              
              await sleep(0.3);
              
            } catch (error) {
              console.error(`❌ Error handling dropdown for ${fieldName}:`, error);
              // Close dropdown on error
              document.body.click();
            }
            continue; // Skip to next field
          }
      }
      
      if (fieldInput) {
          console.log(`✅ Found input field for ${fieldName}, filling with: ${value}`);

          if (fieldInput.tagName.toLowerCase() === 'select') {
            await setDropdownValue(fieldInput, value);
          } else {
        setInputValue(fieldInput, value);
          }
      }
    }
  }
  
  // 5. Final validation and fill any remaining empty required fields
  console.log('🚀 FINAL VALIDATION: Checking for unfilled required fields...');
  
  // Find all required fields that might still be empty
  const allRequiredFields = document.querySelectorAll('input[required], select[required], textarea[required], [aria-required="true"]');
  const emptyRequiredFields = [];
  
  allRequiredFields.forEach(field => {
    const value = field.value || field.textContent || '';
    if (!value.trim()) {
      // Try to identify field by label or placeholder
      const fieldLabel = field.getAttribute('aria-label') || 
                        field.getAttribute('placeholder') || 
                        field.getAttribute('name') || 
                        field.getAttribute('id') || 
                        field.closest('div')?.querySelector('label, span')?.textContent ||
                        'Unknown field';
      
      emptyRequiredFields.push({ element: field, label: fieldLabel });
      console.log(`⚠️ Found empty required field: ${fieldLabel}`);
    }
  });
  
  // Try to fill empty required fields with fallback values
  for (const { element, label } of emptyRequiredFields) {
    try {
      let fallbackValue = '';
      
      // Provide appropriate fallback values based on field type/label
      if (label.toLowerCase().includes('title') || label.toLowerCase().includes('name')) {
        fallbackValue = title || 'Product Title';
      } else if (label.toLowerCase().includes('description')) {
        fallbackValue = description ? extractTextFromHTML(description) : 'Product description';
      } else if (label.toLowerCase().includes('condition')) {
        fallbackValue = 'New';
      } else if (label.toLowerCase().includes('brand') || label.toLowerCase().includes('manufacturer')) {
        fallbackValue = 'Generic';
      } else if (label.toLowerCase().includes('mpn') || label.toLowerCase().includes('model')) {
        fallbackValue = 'N/A';
      } else if (label.toLowerCase().includes('quantity') || label.toLowerCase().includes('unit')) {
        fallbackValue = '1';
      } else if (label.toLowerCase().includes('weight')) {
        fallbackValue = '1';
      } else if (label.toLowerCase().includes('dimension') || label.toLowerCase().includes('size')) {
        fallbackValue = '1';
      } else {
        fallbackValue = 'N/A';
      }
      
      if (fallbackValue) {
        const success = setInputValue(element, fallbackValue);
        if (success) {
          console.log(`✅ FINAL FILL: ${label} = ${fallbackValue}`);
        }
      }
    } catch (error) {
      console.error(`Error filling required field ${label}:`, error);
    }
  }
  
    // Wait longer for all changes to register and eBay validation to process
    console.log('⏳ Waiting for eBay validation to process changes...');
    await sleep(5); // Increased wait time for all checkbox interactions

    // Final verification check
    console.log('🔍 FINAL VERIFICATION: Checking if fields were actually filled...');

    // Check description using the same selectors as filling
    const workingDescriptionSelectors = [
      'div.se-rte-editor__rich.placeholder[datatestid="richEditor"]',
      'div[datatestid="richEditor"][contenteditable="true"]',
      'div.se-rte-editor__rich[contenteditable="true"]',
      'div[contenteditable="true"][aria-label="Description"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[data-placeholder*="Write a detailed description"]',
      'div[datatestid="richEditor"]',
      'div.se-rte-editor__rich.placeholder',
      'textarea[aria-label*="description" i]',
      'textarea[name*="description"]',
      'textarea[id*="description"]',
      '#description',
      '[contenteditable="true"]',
      'textarea'
    ];

    let descVerified = false;
    
    // First check the hidden textarea (main form field)
    const hiddenTextarea = document.querySelector('textarea[name="description"]') || 
                           document.querySelector('textarea[data-testid="richEditor"]') ||
                           document.querySelector('textarea.se-rte__button-group-editor__html');
    
    if (hiddenTextarea && hiddenTextarea.value && hiddenTextarea.value.trim().length > 10) {
      console.log('✅ Description verification: FILLED (using hidden textarea)');
      console.log(`📝 Description content: "${hiddenTextarea.value.substring(0, 100)}..."`);
      descVerified = true;
    }
    
    // If not found, check iframe
    if (!descVerified) {
      const descriptionIframe = document.querySelector('iframe#se-rte-frame__summary') ||
                               document.querySelector('iframe[title="Description"]') ||
                               document.querySelector('iframe[aria-label="Description"]');
      
      if (descriptionIframe) {
        try {
          const iframeDoc = descriptionIframe.contentDocument || descriptionIframe.contentWindow?.document;
          if (iframeDoc && iframeDoc.body) {
            const bodyContent = iframeDoc.body.innerHTML || iframeDoc.body.textContent || '';
            if (bodyContent.trim().length > 10) {
              console.log('✅ Description verification: FILLED (using iframe body)');
              console.log(`📝 Description content: "${bodyContent.substring(0, 100)}..."`);
              descVerified = true;
            }
          }
        } catch (error) {
          console.warn('❌ Error checking iframe content:', error);
        }
      }
    }
    
    // Fallback: check other selectors
    if (!descVerified) {
      for (const selector of workingDescriptionSelectors) {
        const field = document.querySelector(selector);
        if (field && !descVerified) {
          const isDescriptionField = field.getAttribute('aria-label')?.toLowerCase().includes('description') ||
            field.getAttribute('placeholder')?.toLowerCase().includes('description') ||
            field.getAttribute('data-placeholder')?.toLowerCase().includes('description') ||
            field.id?.toLowerCase().includes('description') ||
            field.name?.toLowerCase().includes('description') ||
            selector.includes('description') ||
            selector.includes('richEditor') ||
            field.getAttribute('role') === 'textbox' ||
            field.classList.contains('se-rte-editor__rich');

          if (isDescriptionField || selector === 'textarea' || selector === '[contenteditable="true"]') {
            let descContent = '';
            if (field.tagName.toLowerCase() === 'textarea') {
              descContent = field.value || '';
            } else if (field.contentEditable === "true") {
              descContent = field.innerText || field.textContent || '';
            }

            if (descContent.trim().length > 10 &&
              !descContent.includes('Write a detailed description') &&
              !descContent.includes('save time and let AI draft') &&
              !descContent.includes('You can add up to 24 photos')) {
              console.log(`✅ Description verification: FILLED (using ${selector})`);
              console.log(`📝 Description content: "${descContent.substring(0, 100)}..."`);
              descVerified = true;
              break;
            }
          }
        }
      }
    }

    if (!descVerified) {
      console.log('❌ Description verification: NOT PROPERLY FILLED');
      console.log('🔍 Debug: Checking all description fields again...');
      for (const selector of descriptionSelectors) {
        const field = document.querySelector(selector);
        if (field) {
          const content = field.value || field.innerText || field.textContent || '';
          console.log(`  ${selector}: "${content.substring(0, 50)}..."`);
        }
      }
      
      // Try to re-fill description one more time
      const fallbackDescription = description ? 
        (description.includes('<') ? description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : description) :
        title;
      
      for (const selector of workingDescriptionSelectors) {
        const field = document.querySelector(selector);
        if (field && fallbackDescription) {
          try {
            // Use the same simple approach that works in console
            field.innerText = fallbackDescription;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`✅ Re-filled description using: ${selector}`);
            break;
          } catch (error) {
            console.warn(`❌ Re-fill failed for ${selector}:`, error);
          }
        }
      }
    }

    // Check item specifics filled count
    const filledSpecifics = document.querySelectorAll('input[value]:not([value=""]), select option:checked:not([value=""])');
    console.log(`📊 Item specifics verification: ${filledSpecifics.length} fields appear to have values`);
  
  console.log('✅ Form filling completed');

  } catch (error) {
    console.error('❌ Error in form filling:', error);
  }
};

const updateListingData = async (draftId, reqData, domain) => {
  console.log('🚀 ~ file: list-product.js:45 ~ reqData:', reqData);
  const srtHeader = await getLocal('srt-header');
  const myHeaders = new Headers();
  myHeaders.append('content-type', 'application/json; charset=UTF-8');
  myHeaders.append('srt', srtHeader);

  const requestOptions = {
    method: 'PUT',
    headers: myHeaders,
    body: JSON.stringify(reqData),
    redirect: 'follow'
  };

  let ebayLink = `https://www.ebay.com/lstng/api/listing_draft/${draftId}?mode=AddItem`;
  if (domain === 'UK') {
    ebayLink = `https://www.ebay.co.uk/lstng/api/listing_draft/${draftId}?mode=AddItem`;
    // ebayLink = `https://www.ebay.co.uk/sl/list/v2?draft_id=${draftId}&mode=AddItem`;
  }

  let response = await fetch(ebayLink, requestOptions);
  if (response.status === 200) {
    response = await response.json();
    return response;
  }

  throw new Error('something went wrong with ebay api');
};

const getRequiredValues = async ({
  description,
  keys
}) => {
  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a product attributes maker, you will provide me key value JSON object of required attributes list from a product description'
      },
      {
        role: 'user',
        content: `${description} \n Here is the product description, i need values for ${keys}, Length, Width, Height, DimensionsUnit, Weight, WeightUnit. Size and Colour selected in the html \n lengthy features of product as array with key name features \n lengthy benefits of product as array with key name benefits \n lengthy why choose our product as array with key name whyChoose as a JSON Object`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'response',
        schema: {
          type: 'object',
          properties: {},
          additionalProperties: {
            anyOf: [
              {
                type: 'string'
              },
              {
                type: 'number'
              },
              {
                type: 'boolean'
              }
            ]
          }
        }
      }
    }
  };
  const response = await chrome.runtime.sendMessage({
    payload,
    callback: 'chat-gpt'
  });
  if (response?.success === false) {
    notification.error({
      message: 'Open AI API Error',
      description: response.error
    });
    throw new Error(response.error);
  }
  const parsedResponse = JSON.parse(response.content);
  return parsedResponse;
};

const getMissingValueFromAmazonUrl = async (fieldName, amazonUrl, productData = {}) => {
  try {
    const { title = '', description = '', features = '' } = productData;
    const productInfo = [title, description, features].filter(Boolean).join('. ');
    
    const response = await chrome.runtime.sendMessage({
      payload: {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a product information extractor. Given product information and a specific question, provide only the direct answer with no additional words or explanation.'
          },
          {
            role: 'user',
            content: `Product: ${productInfo || `Amazon URL: ${amazonUrl}`}\n\nWhat is the ${fieldName}? Just say the answer with no other words.`
          }
        ]
      },
      callback: 'chat-gpt'
    });

    if (response?.success === false) {
      throw new Error(response.error);
    }

    const answer = response.content.trim();
    console.log(`🚀 ChatGPT answered for ${fieldName}:`, answer);
    return answer;
  } catch (error) {
    console.error(`Error getting ${fieldName} from ChatGPT:`, error);
    return null;
  }
};

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

const extractUrl = (text) => {
  const regex = /url\("([^"]+)"\)/;
  const match = text.match(regex);
  if (match && match[1]) {
    const url = match[1];
    return url;
  } else {
    return false;
  }
};

const toFirstCharUppercase = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const asinToSku = (asin) => {
  // Convert the ASIN to Base64 (browser-compatible)
  return btoa(asin).replace(/=+$/, ''); // Remove padding "="
};

const skuToAsin = (sku) => {
  try {
    return atob(sku);
  } catch (error) {
    console.error('Error decoding SKU:', error);
    return null; // Return null if decoding fails
  }
};

const listProduct = async () => {
  console.log('Ebay List Product fully loaded!');
  console.log('🚀 CRITICAL DEBUG: Starting listProduct function');
  try {
    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);
    const sellSimilarStatus = await getLocal('sell-similar-status');
    if (!userId) {
      console.log("USER ID NOT FOUND")
      throw new Error("USER ID NOT FOUND");
    }

    const urlParams = new URLSearchParams(window.location.search);
    const draftId = urlParams.get('draftId');
    const mode = urlParams.get('mode');
    console.log('🚀 ~ mode:', mode);

    // get listing data from storage
    const listingData = await getLocal(`ebay-listing-data-${userId}`);
    console.log('🚀 ~ file: list-product.js:29 ~ listingData:', listingData);
    
    if ("a" == "a") {
      try {
        const {
          asin,
          title,
          price,
          images,
          rawProductDetail
        } = listingData;

        let finalTitle = title;
        let finalDescription = rawProductDetail;

        // Wait for eBay page to be fully loaded
        let retries = 0;
        const maxRetries = 10;

        while (retries < maxRetries) {
          const pageElements = document.querySelectorAll('input, textarea, select').length;
          if (pageElements > 10) break;
          await sleep(1);
          retries++;
        }

        // check if auto select button available - with safe querySelector
        const autoSelectDiv = document.querySelector('div[class="summary__extracted-aspects"]');
        if (autoSelectDiv) {
          const selectAllButton = autoSelectDiv?.querySelector('button[class="fake-link"]');
          if (selectAllButton) await selectAllButton.click();
        }
        await sleep(1);

        // Set title
        await sleep(2);

        try {
          const titleInput = document.querySelector('input[name="title"]') ||
            document.querySelector('input[data-testid="title"]') ||
            document.querySelector('#title') ||
            document.querySelector('input[placeholder*="title"]');

          // Check if title is valid
          if (!title || title.length < 10 || title.length > 80) {
            try {
              let amazonUrl = `https://www.amazon.com/dp/${asin}`;
              if (domain === 'UK') {
                amazonUrl = `https://www.amazon.co.uk/dp/${asin}`;
              }
              const chatGptTitle = await getMissingValueFromAmazonUrl('product title (80 characters max, eBay optimized)', amazonUrl, { title, description, features: JSON.stringify(attributes) });
              if (chatGptTitle && chatGptTitle.length <= 80 && chatGptTitle.length >= 10) {
                finalTitle = chatGptTitle;
              }
            } catch (error) {
              console.error('❌ ChatGPT title error:', error.message);
            }
          }

          if (titleInput) {
            await setInput(titleInput, finalTitle);
          }

        } catch (error) {
          console.error('❌ Title/description error:', error.message);
        }

        await sleep(1);

        // find file input and set all images
        const fileInput = document.querySelector('input[type="file"]');
        for (let i = 0; i < images.length; i++) {
          const imageUrl = images[i];
          try {
            const imageRes = await fetch(imageUrl);
            const imageBlob = await imageRes.blob();

            // Process image to ensure it meets eBay requirements
            const processedBlob = await processImageForEbay(imageBlob, 500, 500);

            const file = new File([processedBlob], `my-image${i}.jpg`, { type: 'image/jpeg' });
            await uploadFile(fileInput, file);
            await sleep(2);
          } catch (error) {
            console.error(`❌ Image ${i} error:`, error.message);
            // Continue with next image
          }
        }
        const newImageUrls = [];
        const newImageDivs = document.querySelectorAll('button[id*="uploader-thumbnails"]');
        for (let i = 0; i < newImageDivs.length; i++) {
          const element = newImageDivs[i];
          const rawUrl = element.style.getPropertyValue('background-image');
          const newUrl = extractUrl(rawUrl);
          newImageUrls.push(newUrl);
        }

        // find required fields - improved detection
        const rFieldLabels = document.querySelectorAll('.summary__attributes--label');
        
        // field names for getting value from AI
        const rFieldNames = [];
        rFieldLabels.forEach(item => {
          if (item) {
            // Safe lookup – guard against unexpected missing elements
            const button = item?.querySelector('button[id*="item-specific-dropdown-label"]');
          if (button) rFieldNames.push(button.innerText);
          }
        });
        
        // Ensure Game Name is included if it's a video game listing
        if (!rFieldNames.includes('Game Name') && (title.toLowerCase().includes('game') || title.toLowerCase().includes('xbox') || title.toLowerCase().includes('playstation') || title.toLowerCase().includes('nintendo'))) {
          rFieldNames.unshift('Game Name'); // Add to beginning as it's usually required
        }
        
        console.log('✅ Found', rFieldNames.length, 'required fields');

        // after getting values, fill values
        const requiredValues = await getRequiredValues({
          description: rawProductDetail,
          keys: rFieldNames.join(', ')
        });
        // const requiredValues = {};
        const newRequiredValues = {};
        const keys = Object.keys(requiredValues);
        for (let i = 0; i < keys.length; i++) {
          const changedKey = toFirstCharUppercase(keys[i]);
          extend(newRequiredValues, {
            [changedKey]: requiredValues[keys[i]]
          });
        }
        // Process required values for attributes

        const attributes = {};
        // Use the actual Amazon URL from the listing data instead of current page URL
        let amazonUrl = `https://www.amazon.com/dp/${asin}`;
        if (domain === 'UK') {
          amazonUrl = `https://www.amazon.co.uk/dp/${asin}`;
        }
        console.log('🚀 Using Amazon URL for ChatGPT:', amazonUrl);

        for (let i = 0; i < rFieldNames.length; i++) {
          const name = rFieldNames[i];
          let value = null;

          // Special handling for Game Name field
          if (name === 'Game Name' || name.toLowerCase().includes('game name')) {
            // Extract game name from title by removing platform and condition info
            let extractedName = finalTitle
              .replace(/for (xbox|playstation|nintendo|ps[0-9]|xbox series [xs])[^-]*/gi, '')
              .replace(/\s*-\s*(new|used|brand new|sealed|mint).*$/gi, '')
              .replace(/\s*\(.*\)$/gi, '')
              .trim();
            
            if (extractedName.length > 5) {
              value = extractedName;
            }
          }

          if (!value && newRequiredValues[name]) {
            if (typeof newRequiredValues[name] === 'string') {
              value = newRequiredValues[name];
            } else if (typeof newRequiredValues[name] === 'boolean') {
              value = newRequiredValues[name] ? 'Yes' : 'No';
            } else if (newRequiredValues[name]?.length) {
              const sorted = newRequiredValues[name].sort((a, b) => a.length - b.length);
              const splitted = sorted[0].split(' ');
              const spliced = splitted.splice(0, 3);
              value = spliced.join(' ');
            }
          }

          // If no value found, use ChatGPT fallback with Amazon URL
          if (!value || value === 'N/A' || value === '' || value === 'undefined') {
            console.log(`Missing value for ${name}, asking ChatGPT with Amazon URL...`);
            try {
              const chatGptValue = await getMissingValueFromAmazonUrl(name, amazonUrl, { title, description, features: JSON.stringify(attributes) });
              if (chatGptValue && chatGptValue !== 'N/A' && chatGptValue !== 'Unknown' && chatGptValue !== 'Not specified.' && chatGptValue !== 'Not specified') {
                value = chatGptValue;
                console.log(`✅ ChatGPT provided ${name}: ${value}`);
              } else {
                // Provide sensible defaults for common video game fields
                if (name.toLowerCase().includes('region')) {
                  value = 'PAL';
                } else if (name.toLowerCase().includes('release') || name.toLowerCase().includes('year')) {
                  value = new Date().getFullYear().toString();
                } else if (name.toLowerCase().includes('mpn') || name.toLowerCase().includes('model')) {
                  value = asin || 'Does Not Apply';
                } else if (name.toLowerCase().includes('quantity') || name.toLowerCase().includes('unit')) {
                  value = '1';
                } else {
                  value = 'Does Not Apply';
                }
                console.log(`❌ ChatGPT could not provide ${name}, using fallback: ${value}`);
              }
            } catch (error) {
              console.error(`Error getting ${name} from ChatGPT:`, error);
              value = 'N/A';
            }
          }

          // Only add valid values to attributes (skip N/A and empty values)
          if (value && value !== '' && value !== 'N/A' && value !== 'Not specified' && value !== 'Not specified.') {
            extend(attributes, {
              [name]: [value]
            });
          }
        }
        console.log('🚀 ~ file: list-product.js:201 ~ attributes:', attributes);

        // Fill item specifics form fields
        try {
          for (let i = 0; i < rFieldNames.length; i++) {
            const fieldName = rFieldNames[i];
            const value = attributes[fieldName]?.[0];

            if (value) {
              // Find the corresponding form field
              const fieldContainer = Array.from(rFieldLabels).find(label => {
                if (!label) return false;
                // Guard against unexpected non-element nodes
                const button = label?.querySelector('button[id*="item-specific-dropdown-label"]');
                if (!button && !label) {
                  console.warn('⚠️ Unexpected rFieldLabel node – not an element:', label);
                }
                return button && button.innerText === fieldName;
              });

              if (fieldContainer) {
                // Look for input field
                // Guard against a missing parentElement
                const input = fieldContainer.parentElement?.querySelector('input, select, textarea') ||
                             fieldContainer.querySelector('input, select, textarea');

                if (input) {
                  try {
                    await setInput(input, value);
                    
                    // Special handling for critical fields like Game Name
                    if ((fieldName === 'Game Name' || fieldName.toLowerCase().includes('game name')) && 
                        (!input.value || input.value.length === 0)) {
                      
                      if (input.tagName === 'SELECT') {
                        // Find matching option
                        const options = input.querySelectorAll('option');
                        for (const option of options) {
                          if (option.textContent.toLowerCase().includes(value.toLowerCase()) || 
                              option.value.toLowerCase().includes(value.toLowerCase())) {
                            option.selected = true;
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                          }
                        }
                      } else {
                        // Force set the value
                        input.value = value;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }
                  } catch (error) {
                    console.error(`❌ Error setting ${fieldName}:`, error.message);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Item specifics error:', error.message);
        }

        const dimensions = {};
        const {
          Length,
          Width,
          Height,
          Weight,
          Weightunit,
          Description,
          Benefits = [],
          Features = [],
          Whychoose = []
        } = newRequiredValues || {};

        // Helper function to extract numeric value from string
        const extractNumber = (value) => {
          if (!value) return null;
          const numMatch = String(value).match(/(\d+(?:\.\d+)?)/);
          return numMatch ? Number(numMatch[1]) : null;
        };

        if (Length) {
          const length = extractNumber(Length);
          if (length) extend(dimensions, { packageLength: ceil(length) });
        }
        if (Width) {
          const width = extractNumber(Width);
          if (width) extend(dimensions, { packageWidth: ceil(width) });
        }
        if (Height) {
          const height = extractNumber(Height);
          if (height) extend(dimensions, { packageDepth: ceil(height) });
        }
        if (Weight) {
          const weight = extractNumber(Weight);
          if (weight) {
            if (Weightunit && ['pound', 'pounds', 'lb', 'lbs'].includes(Weightunit.toLowerCase())) {
              extend(dimensions, { majorWeight: ceil(weight) });
            } else if (Weightunit && ['ounce', 'ounces', 'oz'].includes(Weightunit.toLowerCase())) {
              extend(dimensions, { minorWeight: ceil(weight) });
            } else if (Weightunit && ['g', 'gram', 'grams'].includes(Weightunit.toLowerCase())) {
              // Convert grams to ounces for eBay
              const ounces = weight / 28.35;
              extend(dimensions, { minorWeight: ceil(ounces) });
            }
          }
        }

        // Set package dimensions if available

        // Call eBay API to update all fields
        const sku = asinToSku(asin);
        
        // Ensure description is properly cleaned for eBay API
        let apiDescription = finalDescription || finalTitle;
        if (!apiDescription || apiDescription.length < 50) {
          // Use title as fallback if description is too short
          apiDescription = finalTitle;
        }
        
        const listingReqData = {
          title: finalTitle,
          customLabel: sku,
          attributes,
          description: apiDescription,
          format: 'FixedPrice',
          price: String(price),
          quantity: 1,
          immediatePay: true,  // need to do something
          offlinePaymentSelection: false,  // need to do something
          paymentMethods: {  // need to do something // for uk it is {}
            PersonalCheck: false,
            MOCC: false,
            PayOnPickup: false
          },
          // paymentPolicyId: '', // need to do something
          autoAccept: false,
          autoDecline: false,
          bestOfferEnabled: false,
          // shippingPolicyId: '', // need to do something
          domesticShippingType: 'FLAT_RATE', // need to do something // FLAT_RATE_ONLY for UK
          domesticShippingService1: 'UPSGround', // need to do something // UK_OtherCourier for UK
          domesticShippingExtraPrice1: 0, // need to do something
          domesticShippingPrice1: 0, // need to do something
          freeShipping: true, // need to do something
          ...dimensions,
          requestMeta: {
            lastDeltaTimestamp: new Date().getTime()
          },
          removedFields: []
        };

        if (Benefits || Features || Whychoose) {
          extend(listingReqData, {
            description: getDescription({
              title,
              images: newImageUrls,
              benefits: Benefits,
              features: Features,
              whyChoose: Whychoose,
              domain
            })
          });
        }

        if (domain === 'UK') {
          extend(listingReqData, {
            paymentMethods: {},
            domesticShippingType: 'FLAT_RATE_ONLY',
            domesticShippingService1: 'UK_OtherCourier'
          });
        }

        const scheduleListingTime = await getLocal('schedule-listing-time');
        if (scheduleListingTime) {
          const currentDate = new Date();

          const day = currentDate.getDate(); // Day of the month (1-31)
          const month = currentDate.getMonth() + 1; // Month (0-11, so +1 to make it 1-12)
          const year = currentDate.getFullYear(); // Full year (e.g., 2025)

          console.log(`Day: ${day}, Month: ${month}, Year: ${year}`);
          const scheduleHour = scheduleListingTime - 1;
          extend(listingReqData, {
            scheduleDay: day,
            scheduleHour,
            scheduleListingSelection: true,
            scheduleMinute: 0,
            scheduleMonth: month,
            scheduleSecond: 0,
            scheduleYear: year
          });
        }
        await updateListingData(draftId, listingReqData, domain);
        // Fill form fields after API call
        try {
          await fillEbayFormFields(listingReqData);
        } catch (error) {
          console.error('❌ Form field error:', error.message);
        }

        // // set price format: Buy It Now
        const priceFormatDropdown = document.querySelector('.summary__price-fields');
        if (priceFormatDropdown) {
          const selectedValue = priceFormatDropdown.querySelector('button[class*="listbox-button__control"]')?.innerText || '';
          if (selectedValue !== 'Buy It Now') {
            const dropdownOptions = priceFormatDropdown.querySelectorAll('.listbox__option');
            await dropdownOptions[1].click();

            // wait for some seconds there
            let isPriceInput = null;
            while (!isPriceInput) {
              await sleep(1);
              isPriceInput = document.querySelector('input[name="price"]');
            }
            // Set the price
            await setInput(isPriceInput, price);
          } else {
            // Format is already "Buy It Now", just set the price
            const priceInput = document.querySelector('input[name="price"]');
            if (priceInput) {
              await setInput(priceInput, price);
            }
          }
        }

        // // allow offer switch
        await sleep(1);
        const offerSwitch = document.querySelector('input[name="bestOfferEnabled"]');
        if (offerSwitch && offerSwitch?.checked) {
          offerSwitch.checked = false;
          await sleep(1);
        }

        const lStatus = await getLocal('listing-status');
        if (lStatus === 'paused' || lStatus === 'terminated') {
          await chrome.runtime.sendMessage({
            callback: 'closeTab'
          });
          window.close();
          return;
        }

        const listItButton = document.querySelector('button[aria-label*="List"]');

        // Validate form fields before listing
        const titleInput = document.querySelector('input[name="title"]');
        const titleValue = titleInput?.value || '';

        // Check description field
        const descriptionField = document.querySelector('div[contenteditable="true"][placeholder*="Write a detailed description"]') ||
                                document.querySelector('div[contenteditable="true"][role="textbox"]') ||
                                document.querySelector('textarea[name="description"]');
        
        let descriptionValue = '';
        if (descriptionField) {
          if (descriptionField.hasAttribute('contenteditable')) {
            descriptionValue = descriptionField.textContent || descriptionField.innerText || '';
            // Remove placeholder text if present
            if (descriptionValue.includes('Write a detailed description') || descriptionValue.includes('draft it for you')) {
              descriptionValue = '';
            }
          } else {
            descriptionValue = descriptionField.value || '';
          }
        }
        
        // Check for eBay description error
        const hasDescriptionError = document.body.textContent.includes('A description is required');

        const priceInput = document.querySelector('input[name="price"]');
        const priceValue = priceInput?.value || '';

        // Check critical fields
        if (!titleValue || titleValue.length < 10) {
          console.log('❌ Title validation failed');
          await setLocal('listing-status', 'error');
          await setLocal('listing-error', 'Title field is empty or too short');
          return;
        }

        if (!descriptionValue || descriptionValue.trim().length < 10 || hasDescriptionError) {
          console.log('❌ Description validation failed, attempting re-fill...');
          
          // Try to fill description field again
          let refillSuccess = false;
          
          // Use the same comprehensive selectors
          const workingSelectors = [
            'div.se-rte-editor__rich.placeholder[datatestid="richEditor"]',
            'div[datatestid="richEditor"][contenteditable="true"]',
            'div.se-rte-editor__rich[contenteditable="true"]',
            'div[contenteditable="true"][aria-label="Description"]',
            'div[contenteditable="true"][role="textbox"]',
            'div[data-placeholder*="Write a detailed description"]',
            'div[datatestid="richEditor"]',
            'div.se-rte-editor__rich.placeholder',
            'textarea[aria-label*="description" i]',
            'textarea[name*="description"]',
            'textarea[id*="description"]',
            '#description',
            '[contenteditable="true"]',
            'textarea'
          ];
          
              const simpleDescription = apiDescription ? 
                (typeof apiDescription === 'string' && apiDescription.includes('<') ? 
                  apiDescription.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 
                  apiDescription) : 
                finalTitle;
              
          // First try the hidden textarea
          const hiddenTextarea = document.querySelector('textarea[name="description"]') || 
                                 document.querySelector('textarea[data-testid="richEditor"]') ||
                                 document.querySelector('textarea.se-rte__button-group-editor__html');
          
          if (hiddenTextarea && !refillSuccess) {
            try {
              hiddenTextarea.value = simpleDescription;
              hiddenTextarea.dispatchEvent(new Event('input', { bubbles: true }));
              hiddenTextarea.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('✅ Description re-filled successfully using hidden textarea');
              refillSuccess = true;
            } catch (error) {
              console.warn('❌ Re-fill failed for hidden textarea:', error);
            }
          }

          // If that didn't work, try iframe
          if (!refillSuccess) {
            const descriptionIframe = document.querySelector('iframe#se-rte-frame__summary') ||
                                     document.querySelector('iframe[title="Description"]') ||
                                     document.querySelector('iframe[aria-label="Description"]');
            
            if (descriptionIframe) {
              try {
                const iframeDoc = descriptionIframe.contentDocument || descriptionIframe.contentWindow?.document;
                if (iframeDoc && iframeDoc.body) {
                  iframeDoc.body.innerHTML = simpleDescription;
                  
                  // Also update the hidden textarea
                  if (hiddenTextarea) {
                    hiddenTextarea.value = simpleDescription;
                    hiddenTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                    hiddenTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                  
                  console.log('✅ Description re-filled successfully using iframe');
                  refillSuccess = true;
              }
            } catch (error) {
                console.warn('❌ Re-fill failed for iframe:', error);
              }
            }
          }

          // Fallback to other selectors
          if (!refillSuccess) {
            for (const selector of workingSelectors) {
              const field = document.querySelector(selector);
              if (field && !refillSuccess) {
                try {
                  const isDescriptionField = field.getAttribute('aria-label')?.toLowerCase().includes('description') ||
                    field.getAttribute('placeholder')?.toLowerCase().includes('description') ||
                    field.getAttribute('data-placeholder')?.toLowerCase().includes('description') ||
                    field.id?.toLowerCase().includes('description') ||
                    field.name?.toLowerCase().includes('description') ||
                    selector.includes('description') ||
                    selector.includes('richEditor') ||
                    field.getAttribute('role') === 'textbox' ||
                    field.classList.contains('se-rte-editor__rich');

                  if (isDescriptionField || selector === 'textarea' || selector === '[contenteditable="true"]') {
                    if (field.contentEditable === "true") {
                      field.innerHTML = '';
                      field.innerText = simpleDescription;
                      field.dispatchEvent(new Event('input', { bubbles: true }));
                    } else if (field.tagName.toLowerCase() === 'textarea') {
                      field.value = simpleDescription;
                      field.dispatchEvent(new Event('input', { bubbles: true }));
                      field.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    
                    await sleep(1);

                    const newValue = field.value || field.innerText || field.textContent || '';
                    if (newValue && newValue.trim().length > 10) {
                      console.log(`✅ Description re-filled successfully using fallback: ${selector}`);
                      refillSuccess = true;
                      break;
                    }
                  }
                } catch (error) {
                  console.warn(`❌ Re-fill failed for ${selector}:`, error);
                }
              }
            }
          }

          if (!refillSuccess) {
            console.log('⚠️ Description re-fill failed, but continuing with listing...');
            // Don't stop the listing process, just log the warning
          }
        }

        if (!priceValue || priceValue === '0') {
          console.log('❌ Price validation failed');
          await setLocal('listing-status', 'error');
          await setLocal('listing-error', 'Price field is empty or zero');
          return;
        }

        // Final check for Game Name field
        const gameNameField = document.querySelector('input[name*="gamename" i], select[name*="gamename" i]') ||
                              Array.from(document.querySelectorAll('input, select')).find(el => 
                                el.closest('.summary__attributes--label')?.textContent?.toLowerCase().includes('game name'));
        
        if (gameNameField && (!gameNameField.value || gameNameField.value.length === 0)) {
          try {
            const gameNameValue = finalTitle.replace(/for (xbox|playstation|nintendo|ps[0-9]|xbox series [xs])[^-]*/gi, '')
                                          .replace(/\s*-\s*(new|used|brand new|sealed|mint).*$/gi, '')
                                          .replace(/\s*\(.*\)$/gi, '')
                                          .trim();
            
            gameNameField.focus();
            gameNameField.value = gameNameValue;
            gameNameField.dispatchEvent(new Event('input', { bubbles: true }));
            gameNameField.dispatchEvent(new Event('change', { bubbles: true }));
            gameNameField.blur();
          } catch (error) {
            console.error('❌ Game Name fill error:', error.message);
          }
        }

        console.log('✅ Validation passed, proceeding with listing...');

        // Wait for form validations to complete
        await sleep(3);

        if (listItButton) await listItButton.click();

        let listingStatus = 'pending';
        while (listingStatus === 'pending') {
          const isListed = document.querySelector('.success__header')?.innerText || '';
          if (isListed && isListed.toLowerCase().includes('is now live')) {
            listingStatus = 'success';
            await setLocal('listing-status', 'success');
            let listingId = document.querySelector('.success__body-item-id')?.innerText || '';
            listingId = listingId?.split('-')?.[1] || '';

            // Save listing to database
            console.log('🔄 Attempting to save listing to database:', { listingId, draftId, asin, sku });
            try {
              const dbResponse = await chrome.runtime.sendMessage({
                payload: {
                  listingId,
                  draftId,
                  asin,
                  sku
                },
                callback: 'addListing'
              });
              
              if (dbResponse?.success) {
                console.log('✅ Listing successfully saved to database');
                await setLocal('listing-saved-to-db', true);
              } else {
                console.error('❌ Failed to save listing to database:', dbResponse?.error);
                await setLocal('listing-saved-to-db', false);
                await setLocal('listing-db-error', dbResponse?.error || 'Unknown database error');
              }
            } catch (error) {
              console.error('❌ Database save error:', error);
              await setLocal('listing-saved-to-db', false);
              await setLocal('listing-db-error', error.message);
            }
            // close tab once everything is done
            await chrome.runtime.sendMessage({
              callback: 'closeTab'
            });
            window.close();
          }

          const isError = document.querySelector('.global-message__wrapper')?.innerText || '';
          if (isError) {
            listingStatus = 'error';
            await setLocal('listing-error', isError);
            await setLocal('listing-status', 'error');

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

          await sleep(1);
        }
      } catch (error) {
        console.error('🚨 ERROR in form field population:', error);
        console.error('🚨 Stack trace:', error.stack);
        // Continue with listing even if form population fails
        await setLocal('listing-status', 'error');
        await setLocal('listing-error', `Form population failed: ${error.message}`);
      }
    } else if (mode === 'SellSimilarItem' && sellSimilarStatus === 'true') {
      const sku = document.querySelector('input[name="customLabel"]')?.value || '';
      if (!sku) return;
      console.log('🚀 ~ sku:', sku);
      const asin = skuToAsin(sku);
      console.log('🚀 ~ asin:', asin);
      const listItButton = document.querySelector('button[aria-label*="List"]');
      console.log('🚀 ~ listItButton:', listItButton);
      if (listItButton) await listItButton.click();

      let listingStatus = 'pending';
      while (listingStatus === 'pending') {
        console.log('🚀 ~ listingStatus:', listingStatus);
        const isListed = document.querySelector('.success__header')?.innerText || '';
        if (isListed && isListed.toLowerCase().includes('is now live')) {
          listingStatus = 'success';
          await setLocal('listing-status', 'success');
          // await setLocal('sell-similar-status', 'false');
          let listingId = document.querySelector('.success__body-item-id')?.innerText || '';
          listingId = listingId?.split('-')?.[1] || '';

          // Extract draftId from URL if available
          const urlParams = new URLSearchParams(window.location.search);
          const sellSimilarDraftId = urlParams.get('draftId');
          
          // Save sell-similar listing to database
          console.log('🔄 Attempting to save sell-similar listing to database:', { listingId, draftId: sellSimilarDraftId, asin, sku });
          try {
            const dbResponse = await chrome.runtime.sendMessage({
              payload: {
                listingId,
                draftId: sellSimilarDraftId,
                asin,
                sku
              },
              callback: 'addListing'
            });
            
            if (dbResponse?.success) {
              console.log('✅ Sell-similar listing successfully saved to database');
              await setLocal('listing-saved-to-db', true);
            } else {
              console.error('❌ Failed to save sell-similar listing to database:', dbResponse?.error);
              await setLocal('listing-saved-to-db', false);
              await setLocal('listing-db-error', dbResponse?.error || 'Unknown database error');
            }
          } catch (error) {
            console.error('❌ Sell-similar database save error:', error);
            await setLocal('listing-saved-to-db', false);
            await setLocal('listing-db-error', error.message);
          }

          // close tab once everything is done
          await chrome.runtime.sendMessage({
            callback: 'closeTab'
          });
          window.close();
        }

        const isError = document.querySelector('.global-message__wrapper')?.innerText || '';
        if (isError) {
          listingStatus = 'error';
          await setLocal('listing-error', isError);
          await setLocal('listing-status', 'error');
          await setLocal('sell-similar-status', 'false');

          await chrome.runtime.sendMessage({
            callback: 'closeTab'
          });
          window.close();
        }

        await sleep(1);
      }
    }

  } catch (error) {
    await setLocal('listing-error', error.message);
    await setLocal('listing-status', 'error');

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
