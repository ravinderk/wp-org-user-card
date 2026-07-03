# WordPress Profile Hover Card

A lightweight and premium Chrome extension designed for WordPress contributors and developers. It enhances the user experience on `<https://make.wordpress.org/>` by displaying a beautiful hover profile card when you hover over any contributor mention links.

---

## Features

- **Instant Profile Previews**: Quickly view contributor avatars, display names, job descriptions, and social profiles directly within the page.
- **Hover Bridge UX**: Keeps the card visible when moving the cursor from the trigger link onto the card container, allowing you to click on the contributor's social and profile links.
- **Session Caching**: Caches fetched profile details in memory for the active browser session to minimize redundant network requests and maximize performance.
- **Debounced Interaction**: Implements a smooth 300ms fade-out delay to prevent layout flickering when hovering across multiple links.
- **CORS Bypass**: Communicates securely with a background service worker to fetch user profile pages from `profiles.wordpress.org`.

---

## Installation & Setup

To load this extension locally in developer mode:

1. Clone or download this project directory onto your computer.
2. Open Google Chrome and navigate to:
   ```
   chrome://extensions/
   ```
3. Enable the **Developer mode** toggle in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the project directory (`wp-org-user-card`).
6. The extension is now active! Try hovering over a mention like `@username` on any team page at `<https://make.wordpress.org/>`.

---

## How It Works

1. **DOM Scanning**: [content.js](content.js) scans the page for links matching `a.mention` pointing to `profiles.wordpress.org`.
2. **Hover Trigger**: When you hover over a matched mention link, the script dynamically spawns a loading card just below the link.
3. **Background Request**: The script sends a message to the background service worker ([background.js](background.js)) with the target profile URL.
4. **HTML Parsing**: Once the service worker returns the HTML content, the script extracts the avatar, name, job/bio line, and linked social icons (GitHub, Slack, Twitter/X, and Personal Website).
5. **Rendering & Cache**: The parsed data is structured into a clean layout, rendered in the hover card, and cached locally so hovering the same user again is instant.

---

## Permissions & Privacy

- **Host Permissions**: `https://profiles.wordpress.org/*` is requested solely to fetch profile info directly from the WordPress directory.
- **Privacy First**: This extension operates entirely client-side, processing only public WordPress profile data. It does not collect, log, track, or share any personal communication, browsing history, or identities.
