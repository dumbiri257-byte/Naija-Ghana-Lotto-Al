import os
import sys
import json
import datetime
import requests
from bs4 import BeautifulSoup
import firebase_admin
from firebase_admin import credentials, firestore

# ==========================================
# 1. FIREBASE ADMIN SDK INITIALIZATION
# ==========================================
KEY_FILE = "firebase_key.json"

if os.path.exists(KEY_FILE):
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(KEY_FILE)
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Connected to Firebase Firestore successfully!")
    except Exception as e:
        print(f"❌ Error initializing Firebase: {str(e)}")
        sys.exit(1)
else:
    print(f"❌ Error: '{KEY_FILE}' not found. Ensure GitHub Actions generated the key file.")
    sys.exit(1)


# ==========================================
# 2. FIREBASE PUSH & DUPLICATE CHECK ENGINE
# ==========================================
def push_to_firebase_if_new(title, day, month, year, numbers, machine="", channel="baba-ijebu"):
    """
    Checks if a draw with identical title, day, month, and year exists.
    If not found, pushes entry matching index.html schema.
    """
    title_clean = str(title).strip()
    day_clean = str(day).zfill(2)
    month_clean = str(month).strip()
    year_clean = str(year).strip()
    numbers_clean = str(numbers).strip()
    machine_clean = str(machine).strip() if machine else ""

    draws_ref = db.collection("draw_results")
    query = draws_ref.where("title", "==", title_clean) \
                     .where("day", "==", day_clean) \
                     .where("month", "==", month_clean) \
                     .where("year", "==", year_clean) \
                     .get()

    if len(query) > 0:
        print(f"ℹ️ Entry for '{title_clean}' ({day_clean} {month_clean} {year_clean}) already exists in Firebase. Skipping.")
        return

    doc_payload = {
        "title": title_clean,
        "day": day_clean,
        "month": month_clean,
        "year": year_clean,
        "numbers": numbers_clean,
        "machine": machine_clean,
        "channel": channel,
        "createdAt": firestore.SERVER_TIMESTAMP
    }

    draws_ref.add(doc_payload)
    print(f"🚀 SUCCESS: Published '{title_clean}' [{numbers_clean}] directly to Firebase!")


# ==========================================
# 3. SYNC LOCAL results.json TO FIREBASE
# ==========================================
def sync_local_results_json():
    json_path = "results.json"
    if not os.path.exists(json_path):
        print(f"ℹ️ '{json_path}' not found, skipping local seed sync.")
        return

    print(f"📂 Reading local '{json_path}' entries...")
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        for item in data:
            push_to_firebase_if_new(
                title=item.get("title", item.get("game", "Lotto Draw")),
                day=item.get("day", "08"),
                month=item.get("month", "August"),
                year=item.get("year", "2026"),
                numbers=item.get("numbers", item.get("winning", "")),
                machine=item.get("machine", ""),
                channel=item.get("channel", "baba-ijebu")
            )
    except Exception as e:
        print(f"⚠️ Error reading '{json_path}': {str(e)}")


# ==========================================
# 4. LIVE WEB SCRAPER ENGINE
# ==========================================
def scrape_lotto_results():
    print("🔍 Running live 5/90 lotto web scraper...")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }

    targets = [
        {
            "name": "Ghana National Weekly",
            "channel": "ghana-nla",
            "url": "https://example.com/ghana-nla-results"
        },
        {
            "name": "Baba Ijebu National",
            "channel": "baba-ijebu",
            "url": "https://example.com/baba-ijebu-results"
        }
    ]

    now = datetime.datetime.now()
    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    for target in targets:
        try:
            print(f"🌐 Requesting: {target['url']}")
            response = requests.get(target["url"], headers=headers, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                
                # --- LIVE SCRAPING PARSER PLACEHOLDER ---
                # Adjust selector tags based on target site HTML
                scraped_winning = "12-45-67-88-09"
                scraped_machine = "05-15-25-34-50"

                push_to_firebase_if_new(
                    title=target["name"],
                    day=now.strftime("%d"),
                    month=month_names[now.month - 1],
                    year=now.strftime("%Y"),
                    numbers=scraped_winning,
                    machine=scraped_machine,
                    channel=target["channel"]
                )
            else:
                print(f"⚠️ Failed to reach {target['name']}. HTTP Status: {response.status_code}")

        except Exception as e:
            print(f"❌ Error scraping {target['name']}: {str(e)}")


# ==========================================
# 5. EXECUTION ENTRY POINT
# ==========================================
if __name__ == "__main__":
    sync_local_results_json()
    scrape_lotto_results()