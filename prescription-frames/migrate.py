#!/usr/bin/env python3

import json
import os
import sys
from pathlib import Path
from supabase import create_client

ENV_FILE = Path(__file__).parent.parent / ".env.local"
JSON_FILE = Path(__file__).parent / "prescription-frames.json"
IMAGES_DIR = Path(__file__).parent / "images"

BRAND_SLUG = "bikershades"
STORAGE_BUCKET = "bikershades"
STORAGE_FOLDER = "prescriptions"

def load_env():
    env = {}
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()
    return env

env = load_env()
supabase = create_client(env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])

with open(JSON_FILE) as f:
    frames = json.load(f)

print(f"Migrating {len(frames)} frames...\n")

errors = 0

for frame in frames:
    slug = frame["slug"]
    image_path = IMAGES_DIR / f"{slug}.png"

    if not image_path.exists():
        print(f"[{slug}] ERROR: image file missing")
        errors += 1
        continue

    storage_path = f"{STORAGE_FOLDER}/{slug}.png"

    try:
        with open(image_path, "rb") as img:
            supabase.storage.from_(STORAGE_BUCKET).upload(
                storage_path,
                img.read(),
                {"content-type": "image/png", "upsert": "true"},
            )

        image_src = f"{env['SUPABASE_URL']}/storage/v1/object/public/{STORAGE_BUCKET}/{storage_path}"

        supabase.table("prescription_frames").upsert({
            "brand_slug": BRAND_SLUG,
            "name": frame["name"],
            "slug": slug,
            "image_src": image_src,
            "price_cents": frame["priceCents"],
            "size": frame["size"],
            "rx_low": frame["rxLow"],
            "rx_high": frame["rxHigh"],
            "colors": frame["colors"],
        }, on_conflict="slug").execute()

        print(f"[{slug}] ✓")
    except Exception as e:
        print(f"[{slug}] ERROR: {e}")
        errors += 1

print(f"\n{'Done.' if errors == 0 else f'{errors} error(s).'} {len(frames) - errors}/{len(frames)} migrated.")
if errors:
    sys.exit(1)
