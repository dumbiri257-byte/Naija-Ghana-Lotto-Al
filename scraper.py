import os
import sys
import json
import datetime
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
import firebase_admin
from firebase_admin import credentials, firestore

# ==========================================
# LOGGING CONFIGURATION
# ==========================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==========================================
# 1. FIREBASE ADMIN SDK INITIALIZATION
# ==========================================
KEY_FILE = os.getenv("FIREBASE_KEY_PATH", "firebase_key.json")
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

def initialize_firebase():
    """Initialize Firebase with error handling and retry logic."""
    if not os.path.exists(KEY_FILE):
        logger.error(f"❌ Firebase key file not found: {KEY_FILE}")
        logger.info("ℹ️ Set FIREBASE_KEY_PATH environment variable")
        return None
    
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(KEY_FILE)
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        logger.info("✅ Firebase Firestore connected successfully!")
        return db
    except Exception as e:
        logger.error(f"❌ Firebase initialization failed: {str(e)}")
        return None

db = initialize_firebase()

# ==========================================
# 2. HTTP SESSION WITH RETRY STRATEGY
# ==========================================
def create_session():
    """Create HTTP session with automatic retry and backoff."""
    session = requests.Session()
    retry_strategy = Retry(
        total=MAX_RETRIES,
        backoff_factor=RETRY_DELAY,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

# ==========================================
# 3. DUPLICATE CHECK & FIREBASE PUSH ENGINE
# ==========================================
def sanitize_input(value):
    """Sanitize and validate input data."""
    if value is None:
        return ""
    sanitized = str(value).strip()
    # Remove potentially dangerous characters
    sanitized = ''.join(c for c in sanitized if ord(c) >= 32 or c in '\n\t')
    return sanitized[:500]  # Max 500 chars

def validate_numbers(numbers_str, max_num):
    """Validate lottery numbers format and range."""
    try:
        numbers = [int(n) for n in numbers_str.replace('-', ' ').replace(',', ' ').split()]
        valid = [n for n in numbers if 1 <= n <= max_num]
        return '-'.join(map(str, valid)) if valid else ""
    except (ValueError, AttributeError):
        logger.warning(f"⚠️ Invalid numbers format: {numbers_str}")
        return ""

def push_to_firebase_if_new(title, day, month, year, numbers, machine="", channel="baba-ijebu", max_num=90):
    """Push draw to Firebase only if it doesn't already exist (with validation)."""
    if not db:
        logger.error("❌ Firebase not initialized")
        return False
    
    # Sanitize inputs
    title_clean = sanitize_input(title)
    day_clean = str(day).zfill(2)[:2]
    month_clean = sanitize_input(month)
    year_clean = sanitize_input(year)
    numbers_clean = validate_numbers(numbers, max_num)
    machine_clean = validate_numbers(machine, max_num) if machine else ""
    
    if not title_clean or not numbers_clean:
        logger.warning(f"⚠️ Skipped: Missing required fields (title: {title_clean}, numbers: {numbers_clean})")
        return False
    
    try:
        draws_ref = db.collection("draw_results")
        
        # Check for duplicates with proper error handling
        query = draws_ref.where("title", "==", title_clean) \
                         .where("day", "==", day_clean) \
                         .where("month", "==", month_clean) \
                         .where("year", "==", year_clean) \
                         .where("numbers", "==", numbers_clean) \
                         .limit(1) \
                         .stream()
        
        existing = list(query)
        if existing:
            logger.info(f"ℹ️ Duplicate skipped: {title_clean} ({day_clean}-{month_clean}-{year_clean})")
            return False
        
        # Valid entry - push to Firebase
        doc_payload = {
            "title": title_clean,
            "day": day_clean,
            "month": month_clean,
            "year": year_clean,
            "numbers": numbers_clean,
            "machine": machine_clean,
            "channel": sanitize_input(channel),
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        
        draws_ref.add(doc_payload)
        logger.info(f"🚀 Published: {title_clean} [{numbers_clean}] on {day_clean}-{month_clean}-{year_clean}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error pushing to Firebase: {str(e)}")
        return False

# ==========================================
# 4. SYNC LOCAL results.json TO FIREBASE
# ==========================================
def sync_local_results_json():
    """Sync local JSON results to Firebase with error handling."""
    json_path = "results.json"
    
    if not os.path.exists(json_path):
        logger.warning(f"⚠️ '{json_path}' not found, skipping local sync.")
        return
    
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            logger.error("❌ results.json must be a JSON array")
            return
        
        logger.info(f"📂 Syncing {len(data)} local entries...")
        synced_count = 0
        
        for idx, item in enumerate(data):
            try:
                success = push_to_firebase_if_new(
                    title=item.get("title", item.get("game", "Lotto Draw")),
                    day=item.get("day", "01"),
                    month=item.get("month", "January"),
                    year=item.get("year", "2026"),
                    numbers=item.get("numbers", item.get("winning", "")),
                    machine=item.get("machine", ""),
                    channel=item.get("channel", "baba-ijebu"),
                    max_num=90
                )
                if success:
                    synced_count += 1
            except Exception as e:
                logger.error(f"❌ Error syncing item {idx}: {str(e)}")
        
        logger.info(f"✅ Successfully synced {synced_count}/{len(data)} records")
        
    except json.JSONDecodeError as e:
        logger.error(f"❌ Invalid JSON in {json_path}: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error reading {json_path}: {str(e)}")

# ==========================================
# 5. LIVE WEB SCRAPER ENGINE (ENHANCED)
# ==========================================
def scrape_lotto_results():
    """Scrape lottery results with enhanced error handling."""
    logger.info("🔍 Starting live lottery web scraper...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    # Configuration: Replace with real URLs
    targets = [
        {
            "name": "Ghana National Weekly",
            "channel": "ghana-nla-590",
            "url": os.getenv("GHANA_NLA_URL", "https://example.com/ghana-nla-results"),
            "parser": "ghana_nla",
            "max_num": 90
        },
        {
            "name": "Baba Ijebu National",
            "channel": "baba-ijebu",
            "url": os.getenv("BABA_IJEBU_URL", "https://example.com/baba-ijebu-results"),
            "parser": "baba_ijebu",
            "max_num": 90
        }
    ]
    
    now = datetime.datetime.now()
    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    
    session = create_session()
    scraped_count = 0
    
    for target in targets:
        try:
            # Skip placeholder URLs
            if "example.com" in target["url"]:
                logger.warning(f"⚠️ Skipping {target['name']}: URL not configured (set {target['url'].split('/')[2].upper()}_URL environment variable)")
                continue
            
            logger.info(f"🌐 Requesting: {target['url']}")
            response = session.get(target["url"], headers=headers, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                
                # TODO: Implement actual scraping logic based on target['parser']
                # For now, placeholder
                scraped_winning = None
                scraped_machine = None
                
                # Example parser stub
                if target["parser"] == "ghana_nla":
                    # scraped_winning = parse_ghana_nla(soup)
                    pass
                elif target["parser"] == "baba_ijebu":
                    # scraped_winning = parse_baba_ijebu(soup)
                    pass
                
                if scraped_winning:
                    success = push_to_firebase_if_new(
                        title=target["name"],
                        day=now.strftime("%d"),
                        month=month_names[now.month - 1],
                        year=now.strftime("%Y"),
                        numbers=scraped_winning,
                        machine=scraped_machine or "",
                        channel=target["channel"],
                        max_num=target["max_num"]
                    )
                    if success:
                        scraped_count += 1
                else:
                    logger.warning(f"⚠️ No data extracted from {target['name']}")
            else:
                logger.warning(f"⚠️ HTTP {response.status_code} from {target['name']}")
        
        except requests.Timeout:
            logger.error(f"❌ Timeout scraping {target['name']} (15s exceeded)")
        except requests.ConnectionError as e:
            logger.error(f"❌ Connection error for {target['name']}: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Error scraping {target['name']}: {str(e)}")
    
    session.close()
    logger.info(f"✅ Scraper complete. {scraped_count} new records added.")

# ==========================================
# 6. EXECUTION ENTRY POINT
# ==========================================
if __name__ == "__main__":
    try:
        logger.info("="*50)
        logger.info("🚀 LOTTO AI AFRICA - DATA SYNC ENGINE")
        logger.info("="*50)
        
        sync_local_results_json()
        scrape_lotto_results()
        
        logger.info("="*50)
        logger.info("✅ EXECUTION COMPLETE")
        logger.info("="*50)
    except KeyboardInterrupt:
        logger.info("\n⚠️ Script interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.critical(f"❌ CRITICAL ERROR: {str(e)}")
        sys.exit(1)
