# Whensday

Simple, opinionated Doodle-like app for scheduling.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- SQLite (Drizzle ORM)
- Tailwind CSS

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test
```

## Docker

```bash
# Pull and run
docker run -d -p 3000:3000 -v whensday-data:/app/data ghcr.io/gfanton/whensday:latest
```

## License

MIT
