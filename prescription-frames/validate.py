#!/usr/bin/env python3

import json
import os
import re
import sys

JSON_FILE = os.path.join(os.path.dirname(__file__), "prescription-frames.json")
IMAGES_DIR = os.path.join(os.path.dirname(__file__), "images")
VALID_SIZES = ["XS", "SM", "MED", "LG", "XL", "XXL"]

def slugify(name):
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s

with open(JSON_FILE) as f:
    frames = json.load(f)

errors = 0
seen_slugs = set()

for frame in frames:
    name = frame.get("name", "")
    slug = frame.get("slug", "")
    image = frame.get("image", "")
    price_cents = frame.get("priceCents")
    size = frame.get("size")
    rx_low = frame.get("rxLow")
    rx_high = frame.get("rxHigh")
    colors = frame.get("colors")
    tag = f"[{name}]"

    if not name:
        print(f"{tag} missing name")
        errors += 1

    if slug in seen_slugs:
        print(f"{tag} duplicate slug '{slug}'")
        errors += 1
    else:
        seen_slugs.add(slug)

    expected_slug = slugify(name)
    if slug != expected_slug:
        print(f"{tag} slug mismatch: got '{slug}', expected '{expected_slug}'")
        errors += 1

    expected_image = f"images/{slug}.png"
    if image != expected_image:
        print(f"{tag} image field: got '{image}', expected '{expected_image}'")
        errors += 1
    if not os.path.exists(os.path.join(IMAGES_DIR, f"{slug}.png")):
        print(f"{tag} image file missing: images/{slug}.png")
        errors += 1

    if price_cents is None:
        print(f"{tag} missing priceCents")
        errors += 1
    elif price_cents <= 3500:
        print(f"{tag} price ${price_cents / 100:.2f} is below minimum $35.00")
        errors += 1

    if not size:
        print(f"{tag} missing size")
        errors += 1
    else:
        parts = size.split("-")
        valid_tokens = True
        for part in parts:
            if part not in VALID_SIZES:
                print(f"{tag} invalid size token '{part}' in '{size}' (valid: {', '.join(VALID_SIZES)})")
                errors += 1
                valid_tokens = False
        if valid_tokens and len(parts) > 1:
            indices = [VALID_SIZES.index(p) for p in parts]
            for i in range(1, len(indices)):
                if indices[i] <= indices[i - 1]:
                    print(f"{tag} size '{size}' tokens are not in ascending order")
                    errors += 1

    if rx_low is None:
        print(f"{tag} missing rxLow")
        errors += 1
    if rx_high is None:
        print(f"{tag} missing rxHigh")
        errors += 1
    if rx_low is not None and rx_high is not None and rx_low >= rx_high:
        print(f"{tag} rxLow ({rx_low}) must be less than rxHigh ({rx_high})")
        errors += 1

    if not colors:
        print(f"{tag} missing or empty colors")
        errors += 1
    else:
        for color in colors:
            expected_color_slug = slugify(color.get("option", ""))
            if color.get("slug") != expected_color_slug:
                print(f"{tag} color slug mismatch: got '{color.get('slug')}', expected '{expected_color_slug}'")
                errors += 1
            value = color.get("value")
            if not value:
                print(f"{tag} color '{color.get('slug')}' missing value")
                errors += 1
            elif not re.fullmatch(r"#[0-9a-f]{6}", value):
                print(f"{tag} color '{color.get('slug')}' has invalid hex value '{value}'")
                errors += 1

if errors == 0:
    print(f"✓ All {len(frames)} frames passed.")
else:
    print(f"\n{errors} error(s) found across {len(frames)} frames.")
    sys.exit(1)
