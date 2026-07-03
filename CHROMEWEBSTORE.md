# Chrome Web Store Listing — WordPress Profile Hover Card

> Last Updated: 2026-07-03

## Store Listing

**Extension Name**  
WordPress Profile Hover Card

**Short Description**  
Previews WordPress profile headers on make.wordpress.org when hovering over profile links.

**Detailed Description**  
WordPress Profile Hover Card is a developer utility that enhances your collaboration experience on the WordPress make site. When you hover over a profile mention link on make.wordpress.org, it asynchronously previews their profiles.org header hero component.

Key Features:

- Instantly previews user avatars, display names, and usernames inside a clean hover popover.
- Leverages a background service worker to fetch user profiles asynchronously.
- Retains popover visibility when cursor moves from the link to the card, allowing interaction with profile links.
- Highly performant with an event-driven lifecycle and optimized debounce handlers to prevent layout flashing.

How to Use:

1. Install the extension.
2. Navigate to any team site on <https://make.wordpress.org/>.
3. Hover your cursor over user mentions (e.g. "@username").
4. A beautiful popover card will slide in showing their active profile banner details.
5. Move the cursor away to dismiss the card.

Privacy & Security:
This extension respects your privacy. It processes all profile loading client-side and does not log, track, or share any personal communication, browsing history, or user identity. All network calls are strictly restricted to profiles.wordpress.org.

Support:
For issues, contributions, or general feedback, please visit our repository issue tracker.

**Category**  
Developer Tools

**Single Purpose**  
Previews WordPress user profile details on hovering over mention links on make.wordpress.org.

**Primary Language**  
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ⬜ Not created | Omitted in manifest |
| Screenshot 1 [REQUIRED] | 1280×800 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 | ⬜ Not created | |

### Screenshot Notes

- **Screenshot 1**: Demonstrates a user mention hover card showing loaded user details (avatar, display name, handle) inside a make.wordpress.org team page context.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `https://profiles.wordpress.org/*` | host_permissions | Allows the background service worker to fetch raw HTML pages from WordPress profiles to bypass Cross-Origin Resource Sharing (CORS) limits. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**  
No personal data is collected or transmitted off-device.

## Distribution

**Visibility**: Public  
**Regions**: All regions  
**Pricing**: Free  

## Developer Info

**Publisher Name**  
Ravinder Kumar

**Contact Email**  
<ravinder.kumar@example.com>

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-07-03 | Initial release with Manifest V3 support, async background fetch, and hover bridge UX. | Draft |
