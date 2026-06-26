# Self-Authoring OCEAN App

A mobile-first PWA for the 300-item Big Five (OCEAN) assessment and the four Self-Authoring programs (Past, Present-Faults, Present-Virtues, Future).

## Quick Start

```bash
cd app
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080) for the Dockerized production build.

That single command builds the API and web images, starts PostgreSQL, runs migrations, and serves the app. No local Node.js, pnpm, or Notion access required.

**Data source:** Program content (300 OCEAN items, prompts, trait text) comes from committed files in `packages/shared/` — especially `ocean-items.json`. Notion was scraped once into `self-authoring+scraper/` before this app existed; the app never re-scrapes Notion.

Optional: set `JWT_SECRET` in a `.env` file in `app/` before starting.

## Why it used to be many commands

The original setup only dockerized Postgres. Everything else assumed a local dev environment:

| Step | Why it existed |
|------|----------------|
| `pnpm install` | Install dependencies on your machine |
| `pnpm --filter shared build` | Compile shared types for API/web |
| `cp .env.example` | Manual API config |
| `prisma migrate deploy` | Apply DB schema (needed Postgres running first) |
| `pnpm dev` | Start API + Vite dev servers locally |

Those steps are now handled inside the Docker build and API container startup. None of them touch Notion.

## Local development (optional)

If you want hot-reload while coding:

```bash
docker compose up -d postgres          # DB only (do not start the web container)
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm dev                               # API :3001, Vite :5173
```

Use [http://localhost:5173](http://localhost:5173) for dev. The Docker `web` service uses port **8080** so it does not conflict with Vite.

If you previously ran the full Docker stack, clear your browser's service worker cache (DevTools → Application → Service Workers → Unregister) and hard-refresh, or you may keep seeing an old build.

Question data lives in `packages/shared/ocean-items.json`. Do not re-run the Notion scraper or `build:items` unless you intentionally replace that dataset.

## Project Structure

```
app/
├── apps/
│   ├── api/          # Fastify + Prisma backend
│   └── web/          # React PWA frontend
├── packages/
│   └── shared/       # Shared types + ocean-items.json
├── Dockerfile.api
├── Dockerfile.web
└── docker-compose.yml
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Sign in (returns JWT) |
| GET | `/auth/me` | Current user |
| POST | `/ocean` | Submit OCEAN answers |
| GET | `/ocean` | List past results |
| GET | `/ocean/:id` | Single result |
| GET | `/authoring/:module` | Get module document |
| PUT | `/authoring/:module` | Upsert module document |
