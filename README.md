# # nemlig — Claude Skill til nemlig.com

En Claude-skill til at søge produkter, administrere kurv og se ordrehistorik på nemlig.com (dansk online-dagligvarehandel).

## Opsætning i Claude Code (Cloud Environment)

Hvis du bruger Claude Code med cloud environment, skal du konfigurere netværkstilladelser og miljøvariabler:

### 1. Opret cloud environment

I Claude Code vælg "New cloud environment" med følgende indstillinger:

**Name:** (vælg et navn, f.eks. "nemlig")

**Network access:** Trusted (tillader alle netværksforbindelser)

**Tillad disse domæner:**
- `nemlig.com` — Nemlig API
- `webapi.prod.knl.nemlig.it` — Nemlig Search API
- `pypi.org` — Python packages
- `files.pythonhosted.org` — Package files
- `github.com` — Skill installation
- `raw.githubusercontent.com` — GitHub raw files
- `googleapis.com` — (valgfrit) Google Sheets import

### 2. Environment variables

Sæt disse variabler (eller copy/paste fra `.env`):

```
NEMLIG_USER=din@email.com
NEMLIG_PASS=dit_password
```

⚠️ **Bemærk:** Credentials er synlige for alle i dette environment. Brug kun med fortrolig data.

### 3. Setup script (valgfrit)

Hvis du vil have automatisk installation af dependencies ved hver session:

```bash
#!/bin/bash
curl -LsSf https://astral.sh/uv/install.sh | sh
cd /home/user/nemlig-skill
uv sync
```

## Installation

Installer skillen direkte i Claude Code:

```
/install-skill https://github.com/simontjell/nemlig-skill
```

Skillen bliver tilgængelig som `/nemlig` i alle dine projekter.

### Alternativ: klon repoet

Hvis du vil have adgang til det lokalt og bidrage til skillen:

```bash
cd nemlig-skill
claude
```

Skillen under `.claude/skills/nemlig/` indlæses automatisk når du starter en session i repoet.

## Brug

Stil dit spørgsmål med `/nemlig`:

```
/nemlig søg efter mælk
/nemlig hvad koster cocio?
/nemlig vis min kurv
/nemlig tilføj 701025 til kurven
/nemlig se min ordrehistorik
```

## Installation af uv

Først skal du have [`uv`](https://docs.astral.sh/uv/getting-started/) installeret:

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Eller via package manager
brew install uv          # macOS
apt install uv           # Ubuntu/Debian
pacman -S uv             # Arch
```

Verificer installation:
```bash
uv --version
```

## Setup

Før du bruger skillen, skal dit nemlig.com-login være tilgængeligt. Vælg en af disse metoder:

### Metode 1: `.env`-fil (simplest, lokalt)

```bash
# Kopier template
cp .env.example .env

# Rediger filen med dine credentials
nano .env
```

`.env`-filen bliver loaded automatisk når du kører nemlig_cli.

### Metode 2: Persistent config (`~/.config/nemlig/login.json`)

```bash
mkdir -p ~/.config/nemlig
cat > ~/.config/nemlig/login.json << EOF
{
  "username": "din@email.com",
  "password": "dit_password"
}
EOF
chmod 600 ~/.config/nemlig/login.json
```

### Metode 3: CLI-flag

```bash
uv run python nemlig_cli.py -u "din@email.com" -p "ditpassword" search "mælk"
```

### Metode 4: Miljøvariabler

```bash
export NEMLIG_USER="din@email.com"
export NEMLIG_PASS="ditpassword"
uv run python nemlig_cli.py search "mælk"
```

**Prioritet:** CLI-flag > Config-fil > `.env`-fil > Miljøvariabler

## Funktioner

- **Produktsøgning** — find produkter efter navn eller kategori
- **Produktdetaljer** — se fuld info (ingredienser, allergener, pris osv.)
- **Kurv-management** — se, tilføj og administrer items
- **Ordrehistorik** — søg gennem dine tidligere ordrer
- **Ordredetaljer** — se hvad du bestilte sidste gang
- **Gemte indkøbslister** — gem standardindkøb i `.local/standardindkoeb.json` for hurtigt genbrug

## Filer

- `.claude/skills/nemlig/SKILL.md` — Claude instruktioner og workflow
- `nemlig_cli.py` — Python CLI klient
- `pyproject.toml` — Python dependencies
- `README.md` — denne fil
- `.env.example` — template for miljøvariabler
- `.local/` — brugerens lokale data, bl.a. gemte indkøbslister (gitignored)
  - `.local/standardindkoeb.json` — gemt standardindkøbsliste med produkt-IDer

## Teknologi

Skillen bruger [nemlig_cli](https://github.com/eisbaw/nemlig_cli) — en single-file Python-implementering der taler direkte med nemlig.com's API via `requests`.

## Licens

MIT
