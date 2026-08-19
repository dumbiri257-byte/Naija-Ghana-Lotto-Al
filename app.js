// app.js - main application logic (deferred)
// Note: this is the extracted inline script from index.html with worker moved to external file.
// It uses dynamic import for Firebase modular SDK when needed.

const fallbackSeedDatabase = [
  { id: 'seed-1', channel: 'ghana-nla-590', title: 'Ghana Midweek', day: '12', month: 'August', year: '2026', numbers: '11-34-56-78-89', machine: '04-12-23-45-67' },
  { id: 'seed-2', channel: 'ghana-nla-590', title: 'Ghana Midweek', day: '05', month: 'August', year: '2026', numbers: '03-18-29-41-62', machine: '10-15-27-39-80' },
  { id: 'seed-3', channel: 'ghana-nla-590', title: 'Monday Special', day: '17', month: 'August', year: '2026', numbers: '05-10-16-17-59', machine: '77-88-51-13-02' },
  { id: 'seed-4', channel: 'baba-ijebu', title: 'MSP', day: '17', month: 'August', year: '2026', numbers: '18-31-52-70-84', machine: '' },
  { id: 'seed-5', channel: 'golden-chance', title: 'Golden Star', day: '18', month: 'August', year: '2026', numbers: '12-25-37-64-88', machine: '01-19-22-54-76' }
];

let cloudResultsDatabase = [];
const cachedDraws = localStorage.getItem("lotto_draws_cache");
if (cachedDraws) {
  try { cloudResultsDatabase = JSON.parse(cachedDraws); } catch(e) { cloudResultsDatabase = [...fallbackSeedDatabase]; }
} else {
  cloudResultsDatabase = [...fallbackSeedDatabase];
}

let cloudForumPosts = [];
let dbInstance = null;
let firestoreHelpers = null; // will hold imported firestore helpers (collection, onSnapshot, addDoc, serverTimestamp)

const dom = {
  statusDot: document.getElementById("status-dot"),
  statusText: document.getElementById("status-text"),
  feedFilterChannel: document.getElementById("feed-filter-channel"),
  feedSearchTitle: document.getElementById("feed-search-title"),
  feedSearchNumber: document.getElementById("feed-search-number"),
  feedSearchYear: document.getElementById("feed-search-year"),
  feedSearchMonth: document.getElementById("feed-search-month"),
  resultsFeed: document.getElementById("results-feed"),
  forumUsername: document.getElementById("forum-username"),
  forumGame: document.getElementById("forum-game"),
  forumBankers: document.getElementById("forum-bankers"),
  forumComment: document.getElementById("forum-comment"),
  forumPostsContainer: document.getElementById("forum-posts-container"),
  markovChannel: document.getElementById("markov-channel"),
  markovTitle: document.getElementById("markov-title"),
  markovMode: document.getElementById("markov-mode"),
  markovDepth: document.getElementById("markov-depth"),
  markovOutput: document.getElementById("markov-output"),
  manualWinning: document.getElementById("manual-winning"),
  manualMachine: document.getElementById("manual-machine"),
  calcQueryText: document.getElementById("calc-query-text"),
  calcOutputWindow: document.getElementById("calc-output-window"),
  statsOutput: document.getElementById("stats-output")
};

function debounce(func, wait = 200) {
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function matchesChannel(itemChannel, targetChannel) {
  if (!targetChannel || targetChannel === "all") return true;
  if (!itemChannel) return false;
  if (itemChannel === targetChannel) return true;

  const normItem = itemChannel.toLowerCase();
  const normTarget = targetChannel.toLowerCase();

  if ((normTarget.includes("ghana-nla") || normTarget.includes("ghana")) && (normItem.includes("ghana-nla") || normItem.includes("ghana"))) return true;
  if (normTarget.includes("baba") && normItem.includes("baba")) return true;
  if (normTarget.includes("golden") && normItem.includes("golden")) return true;

  return false;
}

function parseItemDate(item) {
  if (!item) return null;
  if (item.createdAt && item.createdAt.seconds) return new Date(item.createdAt.seconds * 1000);
  if (item.createdAt instanceof Date) return item.createdAt;
  if (item.year && item.month && item.day) {
    const d = new Date(`${item.month} ${item.day}, ${item.year}`);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function getDrawWeekday(item) {
  const d = parseItemDate(item);
  if (d && !isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }
  const title = (item.title || item.game || '').toLowerCase();
  if (title.includes('monday')) return 'Monday';
  if (title.includes('tuesday') || title.includes('lucky')) return 'Tuesday';
  if (title.includes('wednesday') || title.includes('midweek') || title.includes('mid-week')) return 'Wednesday';
  if (title.includes('thursday') || title.includes('fortune')) return 'Thursday';
  if (title.includes('friday') || title.includes('bonanza')) return 'Friday';
  if (title.includes('saturday') || title.includes('national')) return 'Saturday';
  if (title.includes('sunday') || title.includes('aseda')) return 'Sunday';
  return null;
}

function checkCookieConsent() {
  if (localStorage.getItem("cookie_consent_accepted") === "true") {
    const banner = document.getElementById("cookie-banner");
    if (banner) banner.style.display = "none";
    // load Ads immediately if consent already present
    loadAdsIfAllowed();
  }
}

function loadAdsIfAllowed() {
  if (localStorage.getItem("cookie_consent_accepted") === "true" && !window.adsLoaded) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8887428211757730';
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
    s.onload = () => { try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e){} };
    window.adsLoaded = true;
  }
}

function acceptCookies() {
  localStorage.setItem("cookie_consent_accepted", "true");
  const banner = document.getElementById("cookie-banner");
  if (banner) banner.style.display = "none";
  loadAdsIfAllowed();
}

// Firebase modular loader - only load when required (forum, live feed, auto markov)
async function ensureFirebase() {
  if (dbInstance) return dbInstance;
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const firestore = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const firebaseConfig = {
      apiKey: "AIzaSyCMq0GFY-i9e4T8C_wTJWWyHHtX9fPl7hs",
      authDomain: "naijalotto-7803a.firebaseapp.com",
      projectId: "naijalotto-7803a",
      storageBucket: "naijalotto-7803a.firebasestorage.app",
      messagingSenderId: "291608123874",
      appId: "1:291608123874:web:0b5684330f019ac95ac1bb",
      measurementId: "G-V56QK59GN8"
    };
    const app = initializeApp(firebaseConfig);
    dbInstance = firestore.getFirestore(app);
    firestoreHelpers = firestore;
    // Attach onSnapshot listeners similar to original behavior
    const drawCol = firestore.collection(dbInstance, "draw_results");
    firestore.onSnapshot(drawCol, (snapshot) => {
      if (!snapshot.empty) {
        cloudResultsDatabase = [];
        snapshot.forEach((doc) => { cloudResultsDatabase.push({ id: doc.id, ...doc.data() }); });
        try { localStorage.setItem("lotto_draws_cache", JSON.stringify(cloudResultsDatabase)); } catch(e){}
      }
      if (dom.statusDot) dom.statusDot.classList.add("online");
      if (dom.statusText) dom.statusText.innerText = `Database Connected (${cloudResultsDatabase.length} records active)`;
      renderFeed();
      renderStats();
    });

    const forumCol = firestore.collection(dbInstance, "forum_posts");
    firestore.onSnapshot(forumCol, (snapshot) => {
      cloudForumPosts = [];
      if (!snapshot.empty) {
        snapshot.forEach((doc) => { cloudForumPosts.push({ id: doc.id, ...doc.data() }); });
      }
      renderForumFeed();
    });
  } catch (e) {
    console.error("Firebase dynamic import failed:", e);
  }
}

// Worker instance management
let markovWorker = null;
function getMarkovWorker() {
  if (!markovWorker) {
    markovWorker = new Worker('/markov-worker.js');
  }
  return markovWorker;
}

function switchTab(evt, tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');

  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add('active');
  } else {
    const btn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
    if (btn) btn.classList.add('active');
  }

  if (tabId === 'results-tab') renderFeed();
  if (tabId === 'forum-tab') { renderForumFeed(); ensureFirebase(); }
  if (tabId === 'markov-tab') updateMatrixPreset();
  if (tabId === 'vip-tab') { populateTargetGameOptions(); generateVipHeatmap(); }
  if (tabId === 'stats-tab') renderStats();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getGameMatrixConfig(channelOrTitle) {
  const text = (channelOrTitle || "").toLowerCase();
  if (text.includes("539") || text.includes("daywa")) return { maxNum: 39, winCount: 5, macCount: 5, format: "5/39" };
  if (text.includes("628") || text.includes("super 6")) return { maxNum: 28, winCount: 6, macCount: 6, format: "6/28" };
  return { maxNum: 90, winCount: 5, macCount: 5, format: "5/90" };
}

function updateMatrixPreset() {
  if (!dom.markovChannel) return;
  const opt = dom.markovChannel.options[dom.markovChannel.selectedIndex];
  const pool = opt.getAttribute("data-pool") || "90";
  const draw = opt.getAttribute("data-draw") || "5";

  document.getElementById("markov-pool").value = `1 - ${pool}`;
  document.getElementById("markov-draw").value = `${parseInt(draw, 10)*2} Numbers (Primary + Machine)`;
  document.getElementById("badge-matrix-mode").innerText = `Matrix: ${draw}/${pool}`;
}

function toggleMarkovEntryMode() {
  const mode = dom.markovMode.value;
  document.getElementById("manual-entry-box").style.display = (mode === "manual") ? "block" : "none";
}

function syncCalcSystemFromChannel() {
  const ch = document.getElementById("calc-channel").value;
  const sysSel = document.getElementById("calc-system");
  if (ch === "ghana-nla-539") sysSel.value = "39";
  else if (ch === "ghana-nla-628") sysSel.value = "28";
  else sysSel.value = "90";
}

function populateTargetGameOptions() {
  const channel = document.getElementById("vip-seasonality-channel").value;
  const gameSel = document.getElementById("vip-seasonality-game");
  if (!gameSel) return;

  let vendorName = "Ghana NLA";
  if (channel.includes("baba")) vendorName = "Baba Ijebu";
  if (channel.includes("golden")) vendorName = "Golden Chance";
  if (channel.includes("539")) vendorName = "Daywa";
  if (channel.includes("628")) vendorName = "Super 6";

  let html = `<option value="all_vendor">All ${vendorName} Target Games</option>`;

  if (channel === "ghana-nla-539") {
    html += `<optgroup label="Daywa (5/39)"><option value="Daywa" selected>Daywa</option></optgroup>`;
  } else if (channel === "ghana-nla-628") {
    html += `<optgroup label="Super 6 (6/28)"><option value="Super 6" selected>Super 6</option></optgroup>`;
  } else if (channel.includes("ghana")) {
    html += `<optgroup label="Ghana NLA (5/90)">
      <option value="Noonrush">Noonrush</option>
      <option value="VAG">VAG</option>
      <option value="Monday Special">Monday Special</option>
      <option value="Lucky Tuesday">Lucky Tuesday</option>
      <option value="Midweek" selected>Midweek</option>
      <option value="Fortune Thursday">Fortune Thursday</option>
      <option value="Friday Bonanza">Friday Bonanza</option>
      <option value="National">National</option>
      <option value="Sunday Aseda">Sunday Aseda</option>
    </optgroup>`;
  } else if (channel.includes("baba")) {
    html += `<optgroup label="Baba Ijebu (5/90)">
      <option value="Diamond">Diamond</option>
      <option value="Peoples">Peoples</option>
      <option value="Bingo">Bingo</option>
      <option value="MSP" selected>MSP</option>
      <option value="Metro">Metro</option>
      <option value="Club Master">Club Master</option>
      <option value="National">National</option>
    </optgroup>`;
  } else if (channel.includes("golden")) {
    html += `<optgroup label="Golden Chance (5/90)">
      <option value="Vogue">Vogue</option>
      <option value="Golden Star" selected>Golden Star</option>
      <option value="National">National</option>
    </optgroup>`;
  }

  html += `<optgroup label="Day of Week Target Filter">
    <option value="day_Monday">All Monday Draws</option>
    <option value="day_Tuesday">All Tuesday Draws</option>
    <option value="day_Wednesday">All Wednesday Draws</option>
    <option value="day_Thursday">All Thursday Draws</option>
    <option value="day_Friday">All Friday Draws</option>
    <option value="day_Saturday">All Saturday Draws</option>
    <option value="day_Sunday">All Sunday Draws</option>
  </optgroup>`;

  gameSel.innerHTML = html;
}

function loadArchiveDataIntoCalc() {
  const channel = document.getElementById("calc-channel").value;
  const titleFilter = document.getElementById("calc-title-filter").value.trim().toLowerCase();
  const depthVal = document.getElementById("calc-depth").value;

  if (!titleFilter) {
    alert("⚠️ Game Title / Name is required for high-accuracy positional calculations.");
    document.getElementById("calc-title-filter").focus();
    return false;
  }

  const sortedDb = cloudResultsDatabase.slice().sort((a, b) => (parseItemDate(b) || 0) - (parseItemDate(a) || 0));

  let matching = sortedDb.filter(item => {
    const chMatch = matchesChannel(item.channel, channel);
    const itemTitle = (item.title || item.game || '').toLowerCase();
    return chMatch && itemTitle.includes(titleFilter);
  });

  if (depthVal !== "all") {
    const d = parseInt(depthVal, 10);
    if (!isNaN(d)) matching = matching.slice(0, d);
  }

  if (matching.length === 0) {
    alert(`⚠️ No historical draw records found matching game title "${document.getElementById("calc-title-filter").value.trim()}" under the selected matrix channel.`);
    return false;
  }

  const lines = matching.map(item => {
    const win = (item.numbers || item.winning || '').trim();
    const mac = (item.machine || '').trim();
    return mac ? `${win}-${mac}` : win;
  }).filter(Boolean);

  dom.calcQueryText.value = lines.join('\n');
  dom.calcOutputWindow.innerHTML = `<div class="alert alert-info">Loaded <strong>${lines.length} historical draw sequence(s)</strong> matching "${escapeHtml(document.getElementById("calc-title-filter").value.trim())}" into the Sequence Window.</div>`;
  return true;
}

function run3WindowCalculator() {
  const titleInput = document.getElementById("calc-title-filter").value.trim();

  if (!titleInput) {
    alert("⚠️ Game Title / Name is required for high-accuracy positional calculations.");
    document.getElementById("calc-title-filter").focus();
    dom.calcOutputWindow.innerHTML = `<div class="alert alert-danger">Please enter a valid Game Title / Name.</div>`;
    return;
  }

  let rawInput = dom.calcQueryText.value.trim();
  if (!rawInput) {
    const loaded = loadArchiveDataIntoCalc();
    if (!loaded) return;
    rawInput = dom.calcQueryText.value.trim();
  }

  const system = document.getElementById("calc-system").value;
  const enforceUnique = document.getElementById("calc-enforce-unique").checked;

  const lines = rawInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const draws = lines.map(line => (line.match(/\d+/g) || []).map(Number)).filter(d => d.length > 0);

  if (draws.length === 0) {
    dom.calcOutputWindow.innerHTML = `<div class="alert alert-danger">No valid numerical sequences detected in input text window.</div>`;
    return;
  }

  let maxRange = 90;
  if (system === '39') maxRange = 39;
  if (system === '28') maxRange = 28;
  if (system === 'manual') maxRange = 99;

  const posCount = Math.max(...draws.map(d => d.length));
  const posFreq = {};
  const posTotal = {};
  const overallFreq = {};
  let overallTotal = 0;

  for (let p = 0; p < posCount; p++) {
    posFreq[p] = {};
    posTotal[p] = 0;
  }

  draws.forEach(draw => {
    draw.forEach((num, p) => {
      if (num < 1 || num > maxRange) return;
      posFreq[p][num] = (posFreq[p][num] || 0) + 1;
      posTotal[p] = (posTotal[p] || 0) + 1;
      overallFreq[num] = (overallFreq[num] || 0) + 1;
      overallTotal++;
    });
  });

  const results = [];
  const usedNumbers = new Set();

  for (let p = 0; p < posCount; p++) {
    const scores = [];
    for (let n = 1; n <= maxRange; n++) {
      const Pp = posTotal[p] > 0 ? ((posFreq[p][n] || 0) / posTotal[p]) : 0;
      const Fn = overallTotal > 0 ? ((overallFreq[n] || 0) / overallTotal) : 0;
      const Sp = (0.70 * Pp) + (0.30 * Fn);
      scores.push({ number: n, score: Sp, Pp, Fn });
    }

    scores.sort((a, b) => b.score - a.score);
    let selected = enforceUnique ? (scores.find(item => !usedNumbers.has(item.number)) || scores[0]) : scores[0];

    if (selected) {
      usedNumbers.add(selected.number);
      const alternatives = scores.filter(s => s.number !== selected.number).slice(0, 3).map(s => String(s.number).padStart(2, '0')).join(', ');
      results.push({ position: p + 1, ...selected, alternatives });
    }
  }

  let html = `<div class="alert alert-success"><strong>Positional Vector Set Generated!</strong> Filtered by Game Title <code>"${escapeHtml(titleInput)}"</code> across ${draws.length} sequence(s).</div>`;
  html += `<h4 style="margin:15px 0 8px; color:var(--cyan-accent);">Recommended High-Probability Positional Vector Set:</h4><div class="ball-container">`;
  results.forEach(res => {
    const isMachineSlot = res.position > 5;
    html += `<div class="ball ${isMachineSlot ? 'machine' : 'vip-gold'}" title="Position ${res.position}: Score ${(res.score*100).toFixed(1)}%">${String(res.number).padStart(2, '0')}</div>`;
  });
  html += `</div><table class="calc-table"><tr><th>Slot</th><th>Type</th><th>Ball</th><th>P_p (Pos Prob)</th><th>F_n (Overall)</th><th>S_p Score</th><th>Next Alternatives</th></tr>`;
  results.forEach(res => {
    const isMachineSlot = res.position > 5;
    html += `<tr>
      <td>P${res.position}</td>
      <td>${isMachineSlot ? 'Machine' : 'Primary'}</td>
      <td style="font-weight:bold;