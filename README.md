# Self-Authoring

A web app for the [Self-Authoring](https://www.selfauthoring.com/) programs and a 300-item Big Five (OCEAN) personality assessment.

## Quick start

```bash
cd app
cp apps/api/.env.example apps/api/.env   # add OPENAI_API_KEY if using AI analysis
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

## Repository layout

| Path | Description |
|------|-------------|
| `app/` | React PWA, Fastify API, Docker setup — see [app/README.md](app/README.md) |
| `self-authoring+scraper/` | One-time Notion scrape of program content (reference only) |

## Stack

React · Vite · Fastify · Prisma · PostgreSQL · Docker · OpenAI (optional OCEAN analysis)
