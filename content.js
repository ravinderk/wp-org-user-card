/**
 * Content Script for WordPress Profile Hover Card Chrome Extension.
 * Handles DOM detection of profile links on make.wordpress.org,
 * manages mouseenter/mouseleave hover states, controls the debounce timeout,
 * communicates with the background service worker, and renders the hover popover card.
 */

(function () {
  'use strict';

  // Debug configuration flag
  const DEBUG = false;

  // Global variables to track extension state
  let activeCard = null;       // Reference to the active card DOM container
  let activeAnchor = null;     // Reference to the anchor element currently hovered
  let hideTimeoutId = null;    // Timeout ID for debounce card removal
  let currentFetchUrl = null;   // Tracker to prevent async fetch race conditions
  const profileCache = new Map(); // Session cache to store already fetched profile hero HTML strings

  /**
   * Conditional logging helpers
   */
  function log(...args) {
    if (DEBUG) {
      console.log('[WP-Profile-Hover-Card]', ...args);
    }
  }

  function logError(...args) {
    if (DEBUG) {
      console.error('[WP-Profile-Hover-Card-Error]', ...args);
    }
  }

  function logWarn(...args) {
    if (DEBUG) {
      console.warn('[WP-Profile-Hover-Card-Warning]', ...args);
    }
  }

  /**
   * Helper to normalize and check if a URL matches the target WordPress profile URL.
   * Target: "https://profiles.wordpress.org/krupajnanda/" (cleanly handling trailing slashes)
   * @param {string} urlStr - The URL to inspect.
   * @returns {boolean} True if matching.
   */
  function isTargetProfile(urlStr) {
    try {
      if (!urlStr) return false;
      const url = new URL(urlStr);
      return url.origin === 'https://profiles.wordpress.org';
    } catch (e) {
      return false; // Invalid URL format
    }
  }



  /**
   * Schedules card destruction after 300ms debounce period.
   * Runs when mouse leaves the anchor link or the card container itself.
   */
  function startHideTimeout() {
    log('startHideTimeout called');
    clearHideTimeout();
    hideTimeoutId = setTimeout(() => {
      log('hideTimeout triggered, calling destroyActiveCard');
      destroyActiveCard();
    }, 300);
  }

  /**
   * Clears any scheduled card removal.
   * Runs when mouse enters the anchor link or the card container.
   */
  function clearHideTimeout() {
    if (hideTimeoutId) {
      log('clearHideTimeout called');
      clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
  }

  /**
   * Closes and removes the active hover card, resets coordinates and fetch trackers.
   */
  function destroyActiveCard() {
    log('destroyActiveCard executing');
    if (activeCard) {
      // Fade out transition before removing
      const card = activeCard;
      card.classList.remove('wp-profile-card-visible');
      card.classList.add('wp-profile-card-hidden');
      setTimeout(() => {
        if (card && card.parentNode) {
          card.remove();
          log('activeCard element removed from DOM');
        }
      }, 200);
      activeCard = null;
    }
    activeAnchor = null;
    currentFetchUrl = null;
    clearHideTimeout();
  }

  /**
   * Positions the card exactly 8px below the trigger anchor link.
   * Ensures the card remains inside viewport boundaries.
   * @param {HTMLAnchorElement} anchor - The hovered link element.
   * @param {HTMLDivElement} card - The card wrapper element.
   */
  function positionCard(anchor, card) {
    const rect = anchor.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Position exactly 8px below the anchor
    let top = rect.bottom + scrollY + 8;
    let left = rect.left + scrollX;

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;

    // Wait for the card to be injected so we can check its rendered size
    requestAnimationFrame(() => {
      if (!card) return;
      const cardWidth = card.offsetWidth;
      const viewportWidth = window.innerWidth;

      // Check for horizontal overflow (right edge of screen)
      if (rect.left + cardWidth > viewportWidth - 16) {
        // Shift left to fit the screen
        left = Math.max(16, viewportWidth - cardWidth - 16) + scrollX;
        card.style.left = `${left}px`;
      }
    });
  }

  /**
   * Injects the HTML content into the card and hides the loading spinner.
   * @param {string} contentHtml - The extracted HTML string.
   */
  function updateCardContent(contentHtml) {
    if (!activeCard) return;

    const bodyContainer = activeCard.querySelector('.wp-profile-card-body');
    if (!bodyContainer) return;

    // Build the success container
    const successWrapper = document.createElement('div');
    successWrapper.className = 'wp-profile-card-success wp-profile-card-fade-in';
    successWrapper.innerHTML = contentHtml;

    // Hide loader and replace with the profile content
    bodyContainer.innerHTML = '';
    bodyContainer.appendChild(successWrapper);
  }

  /**
   * Shows a styled error layout inside the card.
   * @param {string} message - The error message.
   */
  function showCardError(message) {
    if (!activeCard) return;

    const bodyContainer = activeCard.querySelector('.wp-profile-card-body');
    if (!bodyContainer) return;

    bodyContainer.innerHTML = `
      <div class="wp-profile-card-error wp-profile-card-fade-in">
        <span class="wp-profile-card-error-icon">⚠️</span>
        <span class="wp-profile-card-error-message">${escapeHtml(message)}</span>
      </div>
    `;
  }

  /**
   * Escapes special characters to prevent HTML/XSS injection.
   */
  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (match) {
      const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return escapeMap[match];
    });
  }

  /**
   * Identifies and returns the SVG icon and title details for a profile link.
   * @param {string} href - Link target URL.
   * @param {string} text - Link display text.
   * @returns {{title: string, svg: string}} Icon metadata.
   */
  function getLinkIcon(href, text) {
    const url = href.toLowerCase();
    const label = text.toLowerCase();

    if (url.includes('github.com')) {
      return {
        title: `GitHub: ${text}`,
        svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="wp-user-card__icon"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>`
      };
    }

    if (url.includes('slack') || label.includes('slack') || url.includes('make.wordpress.org/chat')) {
      return {
        title: `Slack: ${text}`,
        svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="wp-user-card__icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`
      };
    }

    if (url.includes('twitter.com') || url.includes('x.com')) {
      return {
        title: `Twitter/X: ${text}`,
        svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="wp-user-card__icon"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>`
      };
    }

    if (url.includes('website-redirect') || url.includes('profiles.wordpress.org/website-redirect')) {
      return {
        title: `Website: ${text}`,
        svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="wp-user-card__icon"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
      };
    }

    // Generic link fallback
    return {
      title: text,
      svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="wp-user-card__icon"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`
    };
  }

  /**
   * Triggers fetching and processing of the profile URL.
   * Checks the profileCache first to bypass redundant network requests.
   * @param {string} targetUrl - Profile URL to fetch.
   */
  async function fetchProfileData(targetUrl) {
    currentFetchUrl = targetUrl;

    // Check if the HTML is already cached in this session
    if (profileCache.has(targetUrl)) {
      log('Bypassing network. Loading profile from session cache:', targetUrl);
      updateCardContent(profileCache.get(targetUrl));
      return;
    }

    log('Sending message to Background SW for URL:', targetUrl);

    chrome.runtime.sendMessage({ action: 'fetchProfile', url: targetUrl }, (response) => {
      log('Received response from Background SW. Response:', response);
      // Safety check: ensure the response matches the current hover target and active card exists
      if (currentFetchUrl !== targetUrl || !activeCard) {
        logWarn('Fetch callback bypassed: currentFetchUrl matches =', currentFetchUrl === targetUrl, 'activeCard exists =', !!activeCard);
        return;
      }

      if (response && response.success) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(response.html, 'text/html');

          // 1. Get user image from '.item-header-avatar img' or fallback '.profile-gravatar img'
          const avatarImg = doc.querySelector('.wp-p2-hero-avatar img');
          const avatarUrl = avatarImg ? avatarImg.getAttribute('src') : '';

          // 2. Get user fullname from '.wp-p2-hero-identity .wp-p2-hero-name' or fallback '.profile-names h1.fn'
          const nameEl = doc.querySelector('.wp-p2-hero-identity .wp-p2-hero-name, .profile-names h1.fn');
          const fullname = nameEl ? nameEl.textContent.trim() : '';

          // 3. Get user job line from '.wp-p2-hero-identity .wp-p2-jobline'
          const jobEl = doc.querySelector('.wp-p2-hero-identity .wp-p2-jobline');
          const jobline = jobEl ? jobEl.textContent.trim() : '';

          // 4. Get user link from '.wp-p2-links > a'
          const linkElements = doc.querySelectorAll('.wp-p2-links > a');
          const links = [];
          linkElements.forEach(a => {
            const href = a.getAttribute('href');
            const text = a.textContent.trim();
            if (href) {
              // Normalize relative links to profiles.wordpress.org
              let absoluteHref = href;
              if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('//') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                absoluteHref = new URL(href, 'https://profiles.wordpress.org/').href;
              }
              links.push({ href: absoluteHref, text: text || absoluteHref });
            }
          });

          // Normalize avatar URL if relative
          let absoluteAvatarUrl = avatarUrl;
          if (avatarUrl && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://') && !avatarUrl.startsWith('//') && !avatarUrl.startsWith('data:')) {
            absoluteAvatarUrl = new URL(avatarUrl, 'https://profiles.wordpress.org/').href;
          }

          // Build clean BEM card layout with horizontal social icons row
          let socialsHtml = '';
          if (links.length > 0) {
            socialsHtml = `
              <div class="wp-user-card__socials">
                ${links.map(link => {
                  const iconData = getLinkIcon(link.href, link.text);
                  return `
                    <a href="${escapeHtml(link.href)}" class="wp-user-card__social-btn" title="${escapeHtml(iconData.title)}" target="_blank" rel="noopener noreferrer">
                      ${iconData.svg}
                    </a>
                  `;
                }).join('')}
              </div>
            `;
          }

          const cardHtml = `
            <div class="wp-user-card__content">
              ${absoluteAvatarUrl ? `
                <div class="wp-user-card__avatar-container">
                  <img src="${escapeHtml(absoluteAvatarUrl)}" class="wp-user-card__avatar" alt="${escapeHtml(fullname)}">
                </div>
              ` : ''}
              <div class="wp-user-card__details">
                ${fullname ? `<h2 class="wp-user-card__name">${escapeHtml(fullname)}</h2>` : ''}
                ${jobline ? `<p class="wp-user-card__jobline">${escapeHtml(jobline)}</p>` : ''}
                ${socialsHtml}
              </div>
            </div>
          `;

          // Cache the processed HTML content for future hover events
          profileCache.set(targetUrl, cardHtml);

          updateCardContent(cardHtml);
        } catch (e) {
          logError('Error parsing profile HTML:', e);
          showCardError('Error parsing profile data.');
        }
      } else {
        const errorMsg = (response && response.error) ? response.error : 'Failed to retrieve profile details.';
        logError('Response failed. Error:', errorMsg);
        showCardError(errorMsg);
      }
    });
  }

  /**
   * Initializes and displays the hover card.
   * @param {HTMLAnchorElement} anchor - The anchor element that was hovered.
   */
  function createHoverCard(anchor) {
    log('createHoverCard called for anchor:', anchor.href);
    // If we're already viewing this exact anchor, do nothing
    if (activeAnchor === anchor) {
      log('Same anchor hovered, clearing hide timeout');
      clearHideTimeout();
      return;
    }

    // Destroy existing card if moving directly between distinct targets
    if (activeCard) {
      log('Active card exists. Destroying it before creating new one.');
      destroyActiveCard();
    }

    activeAnchor = anchor;
    const targetUrl = anchor.href;

    // Create the container element
    const card = document.createElement('div');
    card.className = 'wp-profile-card wp-profile-card-hidden';
    card.id = 'wp-profile-card-container';

    // Build inner skeleton (body)
    card.innerHTML = `
      <div class="wp-profile-card-body">
        <div class="wp-profile-card-loading">
          <div class="wp-profile-card-spinner"></div>
          <span>Loading profile data...</span>
        </div>
      </div>
    `;

    // Append to page body
    document.body.appendChild(card);
    activeCard = card;

    // Transition card to visible
    requestAnimationFrame(() => {
      card.classList.remove('wp-profile-card-hidden');
      card.classList.add('wp-profile-card-visible');
    });

    // Position card
    positionCard(anchor, card);

    // Event listeners on the card to handle the hover bridge
    card.addEventListener('mouseenter', () => {
      log('mouseenter on card container');
      clearHideTimeout();
    });
    card.addEventListener('mouseleave', () => {
      log('mouseleave on card container');
      startHideTimeout();
    });

    // Request remote profile data from service worker
    fetchProfileData(targetUrl);
  }

  /**
   * Sets up individual event listeners on matched anchor elements.
   * @param {HTMLAnchorElement} anchor 
   */
  function setupAnchorListeners(anchor) {
    if (anchor.dataset.wpUserCardRegistered) return;
    anchor.dataset.wpUserCardRegistered = 'true';

    anchor.addEventListener('mouseenter', () => {
      log('mouseenter on anchor element:', anchor.href);
      clearHideTimeout();
      createHoverCard(anchor);
    });

    anchor.addEventListener('mouseleave', () => {
      log('mouseleave on anchor element:', anchor.href);
      startHideTimeout();
    });
  }

  /**
   * Scans the document for matching mention anchors and attaches event listeners.
   */
  function scanForAnchors() {
    const anchors = document.querySelectorAll('a.mention');
    anchors.forEach(anchor => {
      if (isTargetProfile(anchor.href)) {
        setupAnchorListeners(anchor);
      }
    });
  }

  /**
   * Init function to start scanning the DOM and monitor for dynamic mutations.
   */
  function init() {
    // Initial page scan
    scanForAnchors();

    // Observe future dynamic DOM shifts (e.g. comments/replies loaded via AJAX)
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan) {
        scanForAnchors();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Run the script on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  log('WordPress Profile Card Chrome Extension Loaded...');

})();
