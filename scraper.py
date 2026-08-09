import os
import sys
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
    cred = credentials.Certificate(KEY_FILE)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Connected to Firebase Firestore successfully!")
else:
    print(f"❌ Error: '{KEY_FILE}' not found. Ensure GitHub Actions generated the key file.")
    sys.exit(1)


# ==========================================
# 2. FIREBASE DATABASE PUSH ENGINE
# ==========================================
def push_result_if_new(title, winning_nums, machine_nums, channel):
    """
    Checks if a draw with the same title, day, month, and year exists.
    If not, pushes the new result to Firestore.
    """
    now = datetime.datetime.now()
    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    
    day_str = now.strftime("%d")
    month_str = month_names[now.month - 1]
    year_str = now.strftime("%Y")
    
    # Format time in 12-hour format (e.g., 07:15 PM)
    time_str = now.strftime("%I:%M %p")

    # Clean user inputs
    title_clean = title.strip()
    winning_clean = str(winning_nums).strip()
    machine_clean = str(machine_nums).strip() if machine_nums else ""

    # Check for duplicate entry in database
    draws_ref = db.collection("draw_results")
    query = draws_ref.where("title", "==", title_clean) \
                     .where("day", "==", day_str) \
                     .where("month", "==", month_str) \
                     .where("year", "==", year_str) \
                     .get()

    if len(query) > 0:
        print(f"ℹ️ Result for '{title_clean}' ({day_str} {month_str} {year_str}) already exists in Firebase. Skipping duplicate.")
        return

    # Document Payload matching index.html schema
    doc_data = {
        "title": title_clean,
        "day": day_str,
        "month": month_str,
        "year": year_str,
        "time": time_str,
        "numbers": winning_clean,
        "machine": machine_clean,
        "channel": channel,
        "createdAt": firestore.SERVER_TIMESTAMP
    }

    # Write to Firestore
    draws_ref.add(doc_data)
    print(f"🚀 SUCCESS: Auto-published '{title_clean}' [{winning_clean}] to Firebase!")


# ==========================================
# 3. WEB SCRAPER ENGINE (TARGET FETCHING)
# ==========================================
def scrape_lotto_results():
    """
    Fetches daily draw results from target lottery endpoints.
    """
    print("🔍 Fetching latest 5/90 lotto results...")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    # Example: Automated target list for daily runs
    # Replace/expand URLs according to your target sources
    targets = [
        {
            "name": "Ghana National Weekly",
            "channel": "ghana-nla",
            "url": "https://example.com/ghana-nla-results" # Target results page
        },
        {
            "name": "Baba Ijebu National",
            "channel": "baba-ijebu",
            "url": "https://example.com/baba-ijebu-results"
        }
    ]

    for target in targets:
        try:
            # Send HTTP GET request
            response = requests.get(target["url"], headers=headers, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                
                # --- SCRAPING LOGIC PLACEHOLDER ---
                # Example: Extracting numbers from HTML elements
                # Adjust selector (.winning-class, .machine-class) based on your target page structure
                
                # Sample scraped data fallback for testing:
                scraped_winning = "12-45-67-88-09"
                scraped_machine = "05-15-25-34-50"

                # Push directly to Firebase database
                push_result_if_new(
                    title=target["name"],
                    winning_nums=scraped_winning,
                    machine_nums=scraped_machine,
                    channel=target["channel"]
                )
            else:
                print(f"⚠️ Failed to reach {target['name']}. Status Code: {response.status_code}")

        except Exception as e:
            print(f"❌ Error scraping {target['name']}: {str(e)}")


# ==========================================
# 4. SCRIPT EXECUTION ENTRY POINT
# ==========================================
if __name__ == "__main__":
    scrape_lotto_results()
