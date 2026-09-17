#!/usr/bin/env python3
"""Fetch top 40 products by purchase frequency and their images, write to src/products.json."""
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
# nemlig_cli is installed as a dependency of the repo's pyproject.toml; run with
# `uv run python apps/tiles/fetch_products.py` from the repo root.
from nemlig_cli import load_env_file, load_config_credentials, login, get_order_history, get_order_details, search_products

os.chdir(ROOT)
load_env_file()
config = load_config_credentials()
username = config.get("username") or os.environ.get("NEMLIG_USER")
password = config.get("password") or os.environ.get("NEMLIG_PASS")

print("Logging in...", file=sys.stderr)
auth = login(username, password)

ORDER_COUNT = 100
TOP_N = 40

print(f"Fetching {ORDER_COUNT} orders...", file=sys.stderr)
history = get_order_history(auth, skip=0, take=ORDER_COUNT)
orders = history.get("Orders", [])
print(f"Got {len(orders)} orders", file=sys.stderr)

counts = defaultdict(lambda: {"name": "", "orders": 0, "units": 0.0})

for i, o in enumerate(orders, 1):
    oid = o.get("Id")
    print(f"  [{i}/{len(orders)}] order {oid}", file=sys.stderr, end="\r")
    details = get_order_details(auth, oid)
    seen = set()
    for line in details.get("Lines", []):
        pid = str(line.get("ProductNumber", ""))
        if not pid:
            continue
        qty = float(line.get("Quantity", 0) or 0)
        if pid not in seen:
            counts[pid]["orders"] += 1
            seen.add(pid)
        counts[pid]["units"] += qty
        if not counts[pid]["name"]:
            counts[pid]["name"] = line.get("ProductName", "")

print(f"\n{len(counts)} unique products", file=sys.stderr)

top = sorted(counts.items(), key=lambda kv: (-kv[1]["orders"], -kv[1]["units"]))[:TOP_N]

qty_map = {
    "5062511": 3,
    "5001388": 6,
    "5043541": 2,
}

products = []
for pid, info in top:
    products.append({
        "id": pid,
        "name": info["name"],
        "freq": info["orders"],
        "qty": qty_map.get(pid, 1),
    })

print(f"\nFetching images for {len(products)} products...", file=sys.stderr)
for i, p in enumerate(products, 1):
    pid = p["id"]
    print(f"  [{i}/{len(products)}] {p['name']}", file=sys.stderr, end="\r")
    try:
        results = search_products(auth, pid, limit=5)
        for r in results:
            if r.get("Id") == pid:
                p["image"] = r.get("PrimaryImage", "")
                break
        else:
            if results:
                p["image"] = results[0].get("PrimaryImage", "")
    except Exception as e:
        print(f"\n  error for {pid}: {e}", file=sys.stderr)

out = Path(__file__).resolve().parent / "src" / "products.json"
out.write_text(json.dumps(products, indent=2, ensure_ascii=False))
print(f"\nWrote {len(products)} products to {out}", file=sys.stderr)
