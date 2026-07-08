/**
 * Background Service Worker for WordPress Profile Hover Card Chrome Extension.
 * Handles fetching remote profile HTML content to bypass CORS restrictions.
 */

// Global cache configuration
// Setup storage access levels and clear old caches on install/update
chrome.runtime.onInstalled.addListener(() => {
  // Allow content scripts to read/write chrome.storage.session directly
  if (chrome.storage.session && typeof chrome.storage.session.setAccessLevel === 'function') {
    chrome.storage.session.setAccessLevel({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
    }).catch(err => {
      console.error('Failed to set session storage access level:', err);
    });
  }

  // Clear legacy chrome.storage.local cache data
  chrome.storage.local.clear(() => {
    console.log('Legacy chrome.storage.local cleared on installation/update.');
  });
});

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
