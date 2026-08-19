// Ads initialization helper. Ensures ads only load after consent and provides safe no-op.
(function (global) {
  'use strict';

  function isAdsEnabled() {
    return typeof window !== 'undefined' && localStorage && localStorage.getItem('cookie_consent_accepted') === 'true';
  }

  function loadAdsScript(publisherId) {
    if (!publisherId) return Promise.reject(new Error('Missing publisher id'));
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[data-adsbygoogle]')) return resolve();

      const s = document.createElement('script');
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
      s.crossOrigin = 'anonymous';
      s.setAttribute('data-adsbygoogle', publisherId);
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
  }

  function pushAdsIntoSlots() {
    try {
      if (!(window.adsbygoogle && Array.isArray(window.adsbygoogle))) window.adsbygoogle = window.adsbygoogle || [];
      document.querySelectorAll('ins.adsbygoogle').forEach((ins) => {
        try { window.adsbygoogle.push({}); } catch (e) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }
  }

  function initAds(options) {
    options = options || {};
    const publisherId = options.publisherId || 'ca-pub-8887428211757730';

    if (!isAdsEnabled()) return Promise.resolve('consent-not-given');

    return loadAdsScript(publisherId)
      .then(() => {
        pushAdsIntoSlots();
        return 'ads-initialized';
      })
      .catch((err) => {
        console.warn('Ads failed to load', err);
        return 'ads-failed';
      });
  }

  // Expose to global scope
  global.lottoAds = {
    init: initAds,
    enabled: isAdsEnabled
  };
})(window);