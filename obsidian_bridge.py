import requests
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta

load_dotenv()

THEIA_MEMORY_DIR = Path.home() / "theia" / "memory" / "users"
THEIA_URL = "http://127.0.0.1:8000"

PASSIVE_DAYS = 30
ARCHIVED_DAYS = 90

def send_to_soul(key, value, entry_type="memory", energy_level=None):
    body = {"value": value, "entry_type": entry_type}
    if energy_level is not None:
        body["energy_level"] = energy_level
    r = requests.put(
        f"{THEIA_URL}/api/memory/{key}",
        json=body,
        headers={"Content-Type": "application/json"}
    )
    return r.status_code

def update_status(key, new_status):
    r = requests.patch(
        f"{THEIA_URL}/api/scout/status/{key}",
        json={"status": new_status},
        headers={"Content-Type": "application/json"}
    )
    return r.status_code

def check_and_update_status(key, updated_at_str):
    try:
        updated_at = datetime.fromisoformat(updated_at_str).replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta = now - updated_at

        if delta > timedelta(days=ARCHIVED_DAYS):
            update_status(key, "archived")
            print(f"⚫ {key} → archived ({delta.days} gün sessiz)")
        elif delta > timedelta(days=PASSIVE_DAYS):
            update_status(key, "passive")
            print(f"🔵 {key} → passive ({delta.days} gün sessiz)")
    except Exception as e:
        print(f"✗ Status kontrol hatası ({key}): {e}")

def get_memory_status(key):
    try:
        r = requests.get(f"{THEIA_URL}/api/scout/report?status=active")
        entries = r.json()
        for e in entries:
            if e["key"] == key:
                return e.get("updated_at")
    except:
        pass
    return None

if not THEIA_MEMORY_DIR.exists():
    print(f"✗ Dizin bulunamadı: {THEIA_MEMORY_DIR}")
    exit(1)

for md_file in THEIA_MEMORY_DIR.glob("*.md"):
    key = md_file.stem
    value = md_file.read_text(encoding="utf-8").strip()
    if not value:
        print(f"○ {md_file.name} → boş, atlandı")
        continue
    status = send_to_soul(key, value)
    print(f"✓ {md_file.name} → key:{key} ({status})")

# Status çıkarımı
try:
    r = requests.get(f"{THEIA_URL}/api/scout/report")
    entries = r.json()
    for e in entries:
        if e.get("updated_at"):
            check_and_update_status(e["key"], e["updated_at"])
except Exception as ex:
    print(f"✗ Scout kontrol hatası: {ex}")
