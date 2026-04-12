---
name: nemlig
version: 0.0.1
description: Query nemlig.com (Danish online grocery store) via the nemlig_cli tool. Search for products, view and manage shopping basket, check order history, and get product details. Use when the user asks about finding groceries, checking prices, basket management, or order history on nemlig.com.
user-invocable: true
---

# /nemlig — nemlig.com CLI

Command-line interface for nemlig.com (Danish online grocery delivery service). Single-file Python client using `requests` for HTTP and `argparse` for CLI parsing.

## Prerequisites

- Python >= 3.11
- `uv` package manager installed
- nemlig.com account credentials (username/email and password)
- Set credentials via (prioriteret rækkefølge):
  1. CLI flags: `-u USERNAME -p PASSWORD`
  2. `~/.config/nemlig/login.json` (persistent config)
  3. `.env` file i arbejdsmappen (se opsætning nedenfor)
  4. Environment variables: `NEMLIG_USER` og `NEMLIG_PASS`

## Workflow

When the user asks about nemlig.com products or basket, follow this workflow:

1. **Credentials already configured** (they should set up `.env` or `~/.config/nemlig/login.json` first)

2. **Search for products** using the search command. Always include a search term:
   ```bash
   uv run python nemlig_cli.py search "milk"
   ```
   
   The CLI will automatically load credentials from `.env`, config file, or environment variables.
   Results include product ID, name, price, and brand. Use the product ID for subsequent commands.

3. **Get product details** to see full information (description, ingredients, allergens, etc.):
   ```bash
   uv run python nemlig_cli.py details <product_id>
   ```

4. **View current basket**:
   ```bash
   uv run python nemlig_cli.py basket
   ```
   
   Shows items already in basket with quantities and prices.

5. **Add items to basket**. Quantity is optional (defaults to 1):
   ```bash
   uv run python nemlig_cli.py add <product_id> [--quantity N]
   ```
   
   Example: `add 701025 --quantity 2` adds 2 units of product 701025 to basket.

6. **View order history**:
   ```bash
   uv run python nemlig_cli.py history
   ```
   
   Lists past orders with order IDs, dates, and totals.

7. **Get details of a specific past order**:
   ```bash
   uv run python nemlig_cli.py history <order_id>
   ```
   
   Shows items, quantities, prices, and total for that order.

## API Architecture

### Authentication Flow

The CLI implements a 3-step authentication process:

1. **Get XSRF token** from initial request
2. **Get Bearer token** using XSRF token
3. **Login** with username/password to get `AuthTokens` 

`AuthTokens` dataclass is passed to all subsequent API functions.

### Dual API Endpoints

- **Main site API** (`nemlig.com/webapi/*`) — used for:
  - Authentication
  - Basket operations (view, add items)
  - Order history
  
- **Search gateway** (`webapi.prod.knl.nemlig.it`) — used for:
  - Product search
  - Product details

This separation is intentional; the search endpoint is a separate service.

## Product ID Lookup

Product IDs are numeric. You'll see them in search results. Examples:
- Use search results to find the product ID
- Then execute details/add commands with that ID
- IDs persist across sessions

## Common Use Cases

**Find a specific product:**
```bash
uv run python nemlig_cli.py search "cocio"
```

**Add something to basket after finding it:**
```bash
# First search for "milk"
uv run python nemlig_cli.py search "milk"
# Note the product ID, then add it
uv run python nemlig_cli.py add 701025 --quantity 1
```

**Show current basket before checkout:**
```bash
uv run python nemlig_cli.py basket
```

**Check what you ordered last time:**
```bash
uv run python nemlig_cli.py history
```

## Error Handling

- **Auth failures:** Check that credentials are set in one of these places:
  - `.env` file (with `NEMLIG_USER` and `NEMLIG_PASS`)
  - `~/.config/nemlig/login.json` (JSON format)
  - Environment variables (export `NEMLIG_USER` and `NEMLIG_PASS`)
  - CLI flags (`-u` and `-p`)
- **Product not found:** Search uses free-text matching; try different keywords or parts of product name
- **Network errors:** nemlig.com may be unreachable; retry after a moment
- **Empty results:** Some search terms return no products; try broader or alternative terms

## Anti-Patterns

- Don't run commands without setting `NEMLIG_USER` and `NEMLIG_PASS` environment variables first
- Don't reuse product IDs between sessions without verifying they still exist (though IDs are stable)
- Don't assume search results are exhaustive — some products may not appear with certain keywords

## Gemte indkøbslister

Skillen understøtter gemte standardindkøbslister via `.local/standardindkoeb.json`:

**.local/ mappe**
- Indeholder brugerens lokale data
- Gitignored (deles ikke via git)
- Oprettes automatisk ved første brug

**`.local/standardindkoeb.json` format**
```json
{
  "standardindkoeb": [
    {
      "product_id": "701025",
      "name": "Mælk",
      "quantity": 1,
      "frequency": "weekly"
    },
    {
      "product_id": "12345",
      "name": "Brød",
      "quantity": 2,
      "frequency": "every3days"
    }
  ]
}
```

**Felter:**
- `product_id`: Nemlig produkt-ID
- `name`: Produktnavn (til reference)
- `quantity`: Standard antal
- `frequency`: Hvor ofte (daily, every3days, weekly, monthly)

**Brug**
- Gem favoritter fra tidligere ordrer
- Hurtigt fyld kurven med standardvarer
- Genbrug indkøbslister udover tid

## Filer

- `.claude/skills/nemlig/SKILL.md` — Claude instruktioner og workflow
- `nemlig_cli.py` — Python CLI klient
- `pyproject.toml` — Dependencies 
- `README.md` — Setup guide
- `.env.example` — Template for miljøvariabler
- `.local/` — Brugerens lokale data (gitignored)
