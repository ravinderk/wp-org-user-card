/**
 * Background Service Worker for WordPress Profile Hover Card Chrome Extension.
 * Handles fetching remote profile HTML content to bypass CORS restrictions.
 */

// Global cache configuration
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Listener for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchProfile') {
    // Run the fetch operation asynchronously and reply via sendResponse
    (async () => {
      try {
        const urlString = message.url;

        // Security check: ensure the URL is pointing to profiles.wordpress.org
        const parsedUrl = new URL(urlString);
        if (parsedUrl.hostname !== 'profiles.wordpress.org') {
          throw new Error('Unauthorized host. Fetching is restricted to profiles.wordpress.org.');
        }

        const cacheKey = `profile_cache_${urlString}`;

        // Try checking local storage cache first
        try {
          const cached = await chrome.storage.local.get(cacheKey);
          if (cached && cached[cacheKey]) {
            const { html, timestamp } = cached[cacheKey];
            if (Date.now() - timestamp < CACHE_TTL) {
              console.log('Serving from local storage cache:', urlString);
              sendResponse({ success: true, html: html });
              return;
            }
            console.log('Cache expired for:', urlString);
          }
        } catch (storageError) {
          console.warn('Error reading from chrome.storage.local:', storageError);
        }

        // Perform the remote fetch request
        const response = await fetch(urlString, {
          method: 'GET',
          headers: {
            'Accept': 'text/html'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch profile page: HTTP error! status: ${response.status}`);
        }

        const htmlText = await response.text();

        // Save response to local storage cache
        try {
          await chrome.storage.local.set({
            [cacheKey]: {
              html: htmlText,
              timestamp: Date.now()
            }
          });
          console.log('Saved to local storage cache:', urlString);
        } catch (storageError) {
          console.warn('Error writing to chrome.storage.local:', storageError);
        }

        sendResponse({ success: true, html: htmlText });
      } catch (error) {
        console.error('Error fetching profile in service worker:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    // Return true to indicate we wish to send a response asynchronously
    return true;
  }
});
