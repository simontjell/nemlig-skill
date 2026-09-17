---
name: nemlig
version: 0.0.1
description: Query nemlig.com (Danish online grocery store) via the nemlig_cli tool. Search for products, view and manage shopping basket, check order history, and get product details. Use when the user asks about finding groceries, checking prices, basket management, or order history on nemlig.com.
user-invocable: true
---

# /nemlig — nemlig.com CLI

Claude skill for nemlig.com (Danish online grocery delivery service). It drives the
[nemlig-cli](https://github.com/simontjell/nemlig-cli) command-line client, which is pulled in
as a dependency via `pyproject.toml`. Always run it as `uv run nemlig ...` from the repo root so
`uv` resolves the dependency and the `.env` file is picked up.

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
   uv run nemlig search "milk"
   ```
   
   The CLI will automatically load credentials from `.env`, config file, or environment variables.
   Results include product ID, name, price, and brand. Use the product ID for subsequent commands.

   **VIGTIGT — Præference-baseret produktvalg:** Før du vælger et produkt fra søgeresultater,
   skal du altid konsultere brugerens købshistorik og eventuelle gemte præferencer (se sektionen
   "Produktpræferencer fra historik" nedenfor). Hvis brugeren tidligere har købt en bestemt
   variant (økologisk, parfumefri, laktosefri, specifik brand, fuldkorn, usaltet osv.), så skal
   den samme variant foretrækkes — også selvom den ikke er det billigste eller mest åbenlyse
   match. Nævn kort begrundelsen når du vælger ("vælger økologisk — det plejer du at købe").

3. **Get product details** to see full information (description, ingredients, allergens, etc.):
   ```bash
   uv run nemlig details <product_id>
   ```

4. **View current basket**:
   ```bash
   uv run nemlig basket
   ```
   
   Shows items already in basket with quantities and prices.

5. **Add items to basket**. Quantity is optional (defaults to 1):
   ```bash
   uv run nemlig add <product_id> [--quantity N]
   ```
   
   Example: `add 701025 --quantity 2` adds 2 units of product 701025 to basket.

6. **View order history**:
   ```bash
   uv run nemlig history
   ```
   
   Lists past orders with order IDs, dates, and totals.

7. **Get details of a specific past order**:
   ```bash
   uv run nemlig history <order_id>
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
uv run nemlig search "cocio"
```

**Add something to basket after finding it:**
```bash
# First search for "milk"
uv run nemlig search "milk"
# Note the product ID, then add it
uv run nemlig add 701025 --quantity 1
```

**Show current basket before checkout:**
```bash
uv run nemlig basket
```

**Check what you ordered last time:**
```bash
uv run nemlig history
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

## Produktpræferencer fra historik

Skillen skal altid foretrække produktvarianter baseret på brugerens tidligere køb. Dette er
en kernefunktion — brugeren forventer at genkøbe de samme varianter uden at skulle gentage sig.

### Arbejdsgang ved produktvalg

Når du skal vælge et konkret produkt (fx til basket-tilføjelse eller når flere søgeresultater
matcher en generisk forespørgsel som "mælk" eller "shampoo"):

1. **Tjek gemte præferencer** i `.local/praeferencer.json` hvis filen findes (se format nedenfor).
2. **Læs den lokale historik-cache** i `~/.config/nemlig/historik_cache.json`. Filen indeholder
   en kompakt kopi af brugerens seneste ordrer med alle varelinjer (se "Historik-cache" nedenfor).
   Brug den som primær kilde i stedet for at kalde `history` live — det er dramatisk hurtigere.
   Hvis filen mangler, eller `refreshed_at` er ældre end ~7 dage, så kør først:
   ```bash
   uv run nemlig refresh-history
   ```
   Kør også `refresh-history` hvis brugeren lige har lagt en ordre ind udenom skillen.
3. **Udled attributter** fra tidligere køb, fx:
   - Økologisk vs. konventionel
   - Parfumefri / hudvenlig / allergivenlig
   - Laktosefri / glutenfri / vegansk / vegetarisk
   - Fuldkorn vs. hvidt
   - Usaltet / saltreduceret
   - Specifik brand (Änglamark, Levevis, Urtekram, Thise, osv.)
   - Pakningsstørrelse (fx altid 1L mælk, ikke 0.5L)
4. **Match søgeresultat** mod de udledte attributter. Produktnavnet indeholder normalt
   disse nøgleord ("Øko", "Økologisk", "Parfumefri", "Laktosefri", brandnavn, osv.).
5. **Forklar kort valget** til brugeren ("Vælger Änglamark økologisk havremælk — det er det,
   du plejer at købe"). Hvis ingen historik findes, så spørg brugeren om præference før tilføjelse.

### Historik-cache

Filen `~/.config/nemlig/historik_cache.json` indeholder en kompakt, rå kopi af ordrehistorikken
med varelinjer. Format:

```json
{
  "refreshed_at": "2026-04-13T10:30:00+00:00",
  "orders": [
    {
      "id": 12345678,
      "date": "2026-04-10T00:00:00",
      "items": [
        {"pid": "701025", "name": "Thise Økologisk Minimælk 1L", "qty": 2},
        {"pid": "12345",  "name": "Neutral Shampoo Parfumefri",  "qty": 1}
      ]
    }
  ]
}
```

**Bevidste designvalg:**
- Ingen aggregering — modellen udleder mønstre direkte fra de rå linjer ved opslag
- Korte nøgler (`pid`, `qty`) for mindre fil og hurtigere læsning
- Ingen priser — irrelevant for præference-matching
- Én fil, ingen TTL-logik i koden — brugeren/skillen beslutter hvornår der skal refreshes

**Refresh:**
```bash
uv run nemlig refresh-history           # default: seneste 20 ordrer
uv run nemlig refresh-history -l 50     # flere ordrer
```

Kommandoen henter ordrerne og slår hver enkelt op for varelinjer, så første refresh kan tage
tid afhængigt af `--limit`. Resultatet skrives kompakt (uden indentering) for lille filstørrelse.

### `.local/praeferencer.json` format

Gemte, eksplicitte præferencer som overskriver heuristik fra historik. Oprettes/opdateres
når brugeren eksplicit siger "jeg vil altid have X" eller bekræfter et mønster.

```json
{
  "globale": {
    "oekologisk": true,
    "parfumefri": true,
    "laktosefri": false,
    "foretrukne_brands": ["Änglamark", "Thise", "Urtekram"]
  },
  "kategorier": {
    "maelk": {
      "variant": "økologisk minimælk",
      "brand": "Thise",
      "storrelse": "1L"
    },
    "shampoo": {
      "variant": "parfumefri",
      "brand": "Neutral"
    }
  }
}
```

**Felter:**
- `globale`: Generelle præferencer der gælder på tværs af kategorier
- `kategorier`: Kategori-specifikke overskrivninger (nøgle = fri kategori, fx "maelk", "kaffe")
- Alle felter er valgfri — udfyld kun det du har bekræftet med brugeren

### Opdatering af præferencer

- Når brugeren siger "husk at jeg altid vil have X" → skriv til `.local/praeferencer.json`
- Når brugeren retter et valg ("nej, jeg vil hellere have den økologiske") → opdatér filen
- Opret `.local/` mappen hvis den ikke findes (den er gitignored)
- Bekræft kort at præferencen er gemt

### Anti-patterns

- Vælg **ikke** bare det første/billigste søgeresultat uden at tjekke historik
- Antag **ikke** at et generisk match er godt nok hvis brugeren har et etableret mønster
- Skriv **ikke** præferencer til filen uden brugerens bekræftelse — undtagen når de eksplicit beder om det

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
- `pyproject.toml` — Dependencies (trækker `nemlig-cli` fra GitHub)
- `README.md` — Setup guide
- `.env.example` — Template for miljøvariabler
- `.local/` — Brugerens lokale data (gitignored)

Selve CLI-koden bor i [simontjell/nemlig-cli](https://github.com/simontjell/nemlig-cli).
Ændringer til kommandoer eller API-kald skal laves der, ikke her.
