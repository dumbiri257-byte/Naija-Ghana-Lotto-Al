---
name: Defer AdSense until consent; add ads-init + onboarding; improve scraper init & requirements
---

This pull request prepares the site and scraper for safer, privacy-first AdSense usage and improves the scraper reliability and repo maintainability.

Summary of changes:

- Add consent-first AdSense loader (ads-init.js) and onboarding documentation (ADSENSE_ONBOARDING.md)
- Defer loading of AdSense script until explicit user consent; remove inline push calls and initialize ads after acceptCookies()
- Update service worker to bypass ad network hosts and avoid caching ad responses
- Add requirements.txt and a minimal README.md
- Harden scraper firebase initialization and duplicate checks
- Update GitHub Actions workflow to install pinned requirements

Security notes:
- Ads are only loaded after cookie consent (localStorage cookie_consent_accepted)
- Service worker will not cache ad network responses, ensuring ad freshness
- Do NOT commit service account JSON — use GitHub Secrets for FIREBASE_SERVICE_ACCOUNT

How to test:
- See ADSENSE_ONBOARDING.md for AdSense onboarding and testing steps
- Run scraper locally with FIREBASE_KEY_PATH and run `python scraper.py` after installing requirements

If approved, merge to main and update your hosting headers (CSP) per the onboarding doc.
