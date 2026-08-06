import json
import random
from datetime import datetime

today_str = datetime.now().strftime("%Y-%m-%d")

def generate_lotto_numbers():
    numbers = set()
    while len(numbers) < 5:
        num = random.randint(1, 90)
        numbers.add(f"{num:02d}")
    return " - ".join(sorted(list(numbers)))

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

with open("results.json", "w") as f:
    json.dump(lotto_data, f, indent=4)

print(f"[{today_str}] Successfully updated results.json!")
