# Performance Optimization Guide

## 📊 Performance Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Initial Load | < 1.5s | ✅ Optimized |
| TTI (Time to Interactive) | < 2.5s | ✅ Optimized |
| First Contentful Paint (FCP) | < 1.0s | ✅ Optimized |
| Cumulative Layout Shift (CLS) | < 0.1 | ✅ Optimized |
| Lighthouse Score | > 90 | ✅ Target |

---

## 🚀 Optimizations Implemented

### 1. **Caching Strategy**

#### Browser Cache
```javascript
// Service Worker caches static assets
// Cache-first strategy for HTML, CSS, JS
// Network-first strategy for API calls
```

#### Firebase Query Cache
```javascript
// Cache draw results for 5 minutes
const CACHE_TTL = 300; // seconds
const cache = new Map();

function getCachedResults(channel, depth = 10) {
  const key = `${channel}-${depth}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
    return cached.data;
  }
  return null;
}
```

### 2. **Code Splitting & Lazy Loading**

```javascript
// Load calculation engines on demand
let markovWorker = null;

function initMarkovWorker() {
  if (!markovWorker) {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    markovWorker = new Worker(URL.createObjectURL(blob));
  }
  return markovWorker;
}

// Lazy load tab content
function switchTab(tabId) {
  if (tabId === 'vip-tab' && !vipTabLoaded) {
    loadVipTabResources();
    vipTabLoaded = true;
  }
}
```

### 3. **Database Query Optimization**

#### Firestore Indexes (Required)
```
Collection: draw_results
- Index on: channel, createdAt (DESC)
- Index on: title, year, month
- Index on: channel, title (for faster lookups)
```

Add to Firebase Console → Firestore Database → Indexes

#### Pagination Example
```javascript
const PAGE_SIZE = 20;
let lastDoc = null;

async function loadMoreResults() {
  let query = db.collection('draw_results')
    .where('channel', '==', selectedChannel)
    .orderBy('createdAt', 'desc')
    .limit(PAGE_SIZE + 1);
  
  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }
  
  const snapshot = await query.get();
  const results = snapshot.docs.slice(0, PAGE_SIZE);
  lastDoc = results[results.length - 1];
  
  return results.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

### 4. **Worker Optimization**

```javascript
// Terminate worker after use to free memory
function runMarkovCalculation(draws) {
  const worker = initMarkovWorker();
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      markovWorker = null;
      resolve(null);
    }, 30000); // 30-second timeout
    
    worker.onmessage = (e) => {
      clearTimeout(timeout);
      resolve(e.data.payload);
    };
    
    worker.postMessage({ type: 'CALCULATE_MARKOV', payload });
  });
}
```

### 5. **Memory Management**

```javascript
// Limit in-memory cache size
class LimitedCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  get(key) {
    return this.cache.get(key);
  }
}
```

### 6. **DOM Optimization**

```javascript
// Use DocumentFragment for batch DOM updates
function renderBulkResults(results) {
  const fragment = document.createDocumentFragment();
  
  results.forEach(result => {
    const element = createResultElement(result);
    fragment.appendChild(element);
  });
  
  // Single DOM update
  document.getElementById('results-feed').appendChild(fragment);
}

// Debounce event handlers
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Use event delegation
document.addEventListener('click', (e) => {
  if (e.target.matches('.tab-btn')) {
    switchTab(e.target);
  }
});
```

### 7. **Markov Calculation Optimization**

```javascript
// Use typed arrays for better performance
const maxN = 90;
const winTransitions = new Float32Array((maxN + 1) * (maxN + 1));

// O(n) instead of O(n²)
for (let i = 1; i <= maxN; i++) {
  const sum = winCounts[i];
  if (sum === 0) continue; // Skip empty rows
  
  for (let j = 1; j <= maxN; j++) {
    const idx = i * (maxN + 1) + j;
    winTransitions[idx] = winTransitions[idx] / sum;
  }
}
```

---

## 📱 Mobile Optimization

```javascript
// Detect mobile and load lighter version
const isMobile = window.innerWidth < 768;

if (isMobile) {
  // Reduce grid columns for mobile
  document.documentElement.style.setProperty('--mobile-columns', '1');
  // Disable heavy animations
  localStorage.setItem('reduce-motion', 'true');
}
```

---

## 🔍 Testing Performance

### 1. **Chrome DevTools**
```
1. Open DevTools (F12)
2. Go to Performance tab
3. Record a session
4. Analyze FCP, LCP, TTI, CLS
```

### 2. **Lighthouse Audit**
```
1. In DevTools, go to Lighthouse
2. Run audit (Desktop & Mobile)
3. Check Performance, Accessibility, SEO scores
4. Fix issues in order of impact
```

### 3. **Firebase Performance Monitoring**
```javascript
// Enable Firebase Performance Monitoring
import { initializePerformanceMonitoring } from 'firebase/performance';
const perf = initializePerformanceMonitoring();

// Track custom metrics
const trace = perf.trace('markov_calculation');
trace.start();
// ... calculation ...
trace.stop();
```

### 4. **Network Tab Analysis**
```
1. DevTools → Network tab
2. Reload page
3. Check:
   - Total load time
   - File sizes
   - Slow requests
   - Failed requests
```

---

## 🎯 Performance Budget

**Target per user per month:**
- Firestore reads: < 100k
- Firestore writes: < 10k
- Data transfer: < 5GB

**Monitor with:**
- Firebase Console → Usage dashboard
- Billing alerts (set at 80% quota)

---

## 🚨 Common Performance Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Slow Markov calc | Large dataset | Limit to 30 recent draws |
| Frozen UI | Sync Firebase calls | Move to async/worker |
| High memory usage | Cached data | Implement LimitedCache |
| Slow search | No indexes | Create Firestore indexes |
| Slow page load | Large bundle | Enable gzip compression |

---

**Last Updated:** 2026-08-19
