import json
import random
from datetime import datetime

# Current ISO date
today_str = datetime.now().strftime("%Y-%m-%d")

def generate_lotto_numbers():
    """Generates 5 unique lotto numbers between 1 and 90."""
    numbers = set()
    while len(numbers) < 5:
        num = random.randint(1, 90)
        numbers.add(f"{num:02d}")
    return " - ".join(sorted(list(numbers)))

# Update data payload
lotto_data = [
    {
        "game": "Baba Ijebu - National",
        "region": "🇳🇬 Nigeria",
        "winning": generate_lotto_numbers(),
        "machine": generate_lotto_numbers(),
        "updated": today_str
    },
    {
        "game": "NLA - Midweek 5/90",
        "region": "🇬🇭 Ghana",
        "winning": generate_lotto_numbers(),
        "machine": generate_lotto_numbers(),
        "updated": today_str
    },
    {
        "game": "Golden Chance - Star",
        "region": "🇳🇬 Nigeria",
        "winning": generate_lotto_numbers(),
        "machine": generate_lotto_numbers(),
        "updated": today_str
    }
]

# Write to results.json
with open("results.json", "w") as f:
    json.dump(lotto_data, f, indent=4)

print(f"[{today_str}] Successfully generated and updated results.json!")