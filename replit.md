# السريع ون - Saree One

منصة توصيل طلبات متكاملة تشمل واجهة العميل، لوحة تحكم الإدارة، وتطبيق السائق.

## Stack
- **Frontend**: React 18 + Vite + TailwindCSS + Radix UI + TanStack Query
- **Backend**: Express.js + TypeScript (tsx)
- **Database**: PostgreSQL via Drizzle ORM (`@neondatabase/serverless` / `postgres`)
- **Real-time**: WebSockets (ws)
- **Auth**: JWT tokens + bcryptjs

## How to run
```
npm install && npm run dev
```
The server starts on port 5000. Vite serves the frontend in development mode.

## Environment variables
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Secret for session signing |

## Database
Schema is managed with Drizzle Kit. To push schema changes to the database:
```
npx drizzle-kit push
```

Migration files are in `./drizzle/`. The app seeds default data (categories, restaurants, admin users, drivers) on first startup when using `DatabaseStorage`.

## Project structure
```
client/src/        Frontend React app
server/            Express backend
  routes/          Modular route files (orders, driver, etc.)
  db.ts            DatabaseStorage (PostgreSQL)
  storage.ts       Storage interface + MemStorage fallback
  socket.ts        WebSocket manager
shared/schema.ts   Drizzle schema (shared between client & server)
drizzle/           Migration SQL files
```

## Key routes
- `/` — Customer storefront
- `/orders` — Customer order history (طلباتي)
- `/admin-login` — Admin panel login
- `/driver` — Driver app

## User preferences
- Keep project structure and existing stack as-is
- Arabic-language UI throughout
- Performance: minimize unnecessary re-fetches; use WebSocket for real-time updates
