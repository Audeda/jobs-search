# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Vue d'ensemble

**IA Jobs Bordeaux** — application de veille d'offres d'emploi IA à Bordeaux, bâtie sur le template **Manus WebDev**. Stack : React 19 + Vite (front), Express + tRPC (back), Drizzle ORM + MySQL (données).

## Architecture

- `client/src/` — frontend React. Routing via `wouter` (`App.tsx`) : `/` (Home), `/offres/:id` (JobDetail), `/admin` (Admin, protégé par OAuth). Client tRPC typé (`lib/trpc.ts`) importe directement `AppRouter` depuis le serveur.
- `server/routers.ts` — routeur tRPC principal (`jobs`, `criteria`, `scans`, `auth`).
- `server/scanEngine.ts` — ingestion et déduplication des offres (hash sha256 sur titre+entreprise+source).
- `server/db.ts` — accès Drizzle à MySQL.
- `server/_core/` — briques du template Manus : OAuth, LLM, stockage S3 ("Forge"), cron ("Heartbeat"), notifications. Ces services **ne fonctionnent que déployés sur la plateforme Manus** (manus.im) ou dans un sandbox Manus — pas d'équivalent self-host.
- `drizzle/schema.ts` — 4 tables : `users`, `search_criteria`, `jobs`, `scans`.
- `seed.mjs` — charge les offres réelles depuis `ia_bordeaux_jobs.json` dans la base.

## Développement local

### Prérequis

- Node.js (v24 testé)
- `pnpm` — pas installé globalement sur cette machine ; utiliser `npx pnpm@10.15.1 <commande>` (ou activer via corepack si les droits d'écriture sur `/usr/local/bin` le permettent).
- MySQL 8 — **installé via le `.dmg` officiel** (dev.mysql.com/downloads/mysql, package "macOS 12 (ARM, 64-bit)"), pas Homebrew : cette machine tourne sous **macOS 12.3 (Monterey)**, pour lequel Homebrew n'a plus de bottles précompilées et force une recompilation depuis les sources (LLVM inclus) — plusieurs heures de build, à éviter.

### Variables d'environnement (`.env`, non commité)

```
DATABASE_URL=mysql://root:<password>@127.0.0.1:3306/ia_jobs_bordeaux
VITE_OAUTH_PORTAL_URL=https://example.com   # placeholder local, cf. limitations
VITE_APP_ID=preview                          # placeholder local
```

`VITE_OAUTH_PORTAL_URL`/`VITE_APP_ID` sont nécessaires même en local car `getLoginUrl()` (`client/src/const.ts`) construit une `URL()` au chargement de la page d'accueil et plante sinon (`TypeError: Invalid URL`).

### Lancer le serveur

Le script `dev` du `package.json` (`NODE_ENV=development tsx watch server/_core/index.ts`) nécessite `NODE_ENV` positionné — utiliser `pnpm run dev`, ou un wrapper shell qui exporte `NODE_ENV=development` avant d'appeler `tsx`.

### Base de données locale

```bash
# Créer la base
mysql -u root -p -e "CREATE DATABASE ia_jobs_bordeaux CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Appliquer les migrations Drizzle
DATABASE_URL=... npx drizzle-kit migrate

# Charger les offres réelles depuis ia_bordeaux_jobs.json
DATABASE_URL=... SEED_PATH=$(pwd)/ia_bordeaux_jobs.json node seed.mjs
```

## Limitations connues en local

- **Espace admin (`/admin`) inaccessible** : le login passe par OAuth Manus (`server/_core/oauth.ts`, `server/_core/sdk.ts`), qui nécessite un vrai projet déployé sur manus.im. Sans ça, la page affiche "Accès réservé" — comportement attendu, pas un bug.
- **Upload de fichiers, notifications, cron "Heartbeat"** (`server/storage.ts`, `server/_core/notification.ts`, `server/_core/heartbeat.ts`) dépendent des services "Forge" internes à Manus (`BUILT_IN_FORGE_API_URL`/`KEY`) — pas de clé auto-délivrable hors plateforme.
- **Scan LLM manuel** (`scans.runNow` dans `routers.ts`) appelle `invokeLLM` (`server/_core/llm.ts`), également un service Manus — ne fonctionnera pas sans déploiement/credentials Manus.

## Preview locale sur cette machine

Le dossier projet est sous `~/Documents`, protégé par macOS (TCC/Gatekeeper des dossiers Bureau/Documents/Téléchargements). L'outil de preview de Claude Code ne peut pas spawn de process avec ce `cwd` (`getcwd: Operation not permitted`), même si un terminal classique y a accès. Contournement utilisé : copie de travail du projet dans `~/dev/ia-jobs` (hors dossier protégé), dépendances réinstallées là-bas, et `.claude/launch.json`/`.env` configurés dans cette copie pour lancer le serveur de preview. Le dossier `~/Documents/.../ia-jobs` reste la source de vérité — resynchroniser `~/dev/ia-jobs` après modifications si la preview y est utilisée.
