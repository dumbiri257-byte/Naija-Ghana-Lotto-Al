# AdSense Onboarding & Implementation Guide

This document explains how Ads are loaded on the Lotto AI Africa site and how to complete onboarding with Google AdSense and privacy considerations.

1) Publisher ID
- The code in this branch uses the publisher ID: `ca-pub-8887428211757730`.
- To change it, update `ads-init.js` or the `lottoAds.init({ publisherId })` call in `index.html`.

2) Domain verification & ad unit creation
- Sign in to Google AdSense and add your site domain (lottoai.africa).
- Verify domain ownership via the recommended method (HTML meta tag or DNS).
- Create ad units in AdSense and copy the `data-ad-slot` values into the ad <ins> tags in `index.html`.

3) Ads loading behavior (consent-first)
- Ads are loaded only after the user accepts cookies. `ads-init.js` will not load the AdSense script until `localStorage.cookie_consent_accepted === 'true'`.
- The `Accept Cookies` button on the site calls `acceptCookies()` which now triggers `lottoAds.init({ publisherId })`.

4) Service Worker & caching
- The service worker has been updated to bypass caching for ad network hosts so ad scripts and ad responses are never served from the cache. This helps ensure ad freshness and avoids caching policy violations.

5) ads.txt & ad partners
- The repo already contains `ads.txt` at the site root. Ensure it includes all authorized sellers/partners for `ca-pub-8887428211757730`.
- Example line format:
  google.com, pub-XXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0

6) Privacy & GDPR
- Ads are shown only after explicit cookie consent; implement a consent dialog for EU visitors if needed.
- Add a documented privacy policy (there is `privacy-policy.html`) detailing the third-party ad services and how users can opt out.

7) Testing locally
- Google AdSense typically blocks ads on localhost. Use the AdSense sandbox or use test ad units provided by Google.

8) CSP & SRI
- Consider adding the following Content-Security-Policy as a response header from your host:

  Content-Security-Policy: default-src 'self'; script-src 'self' https://pagead2.googlesyndication.com https://www.gstatic.com; connect-src 'self' https://firestore.googleapis.com; frame-src https://googleads.g.doubleclick.net; img-src 'self' data: https://pagead2.googlesyndication.com; style-src 'self' 'unsafe-inline';

- Use Subresource Integrity (SRI) only for static third-party scripts that are versioned and hosted with stable integrity hashes (AdSense script updates often — SRI may be impractical for AdSense).

---

If you want, I can also:
- Rotate the AdSense publisher ID across the repo on request.
- Add server-side headers for CSP via _headers or Netlify configuration.
