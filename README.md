# 🚀 PERN Project Template

A batteries-included starter for building apps with **Postgres**, **Express**, **React**, and **Node.js**. The backend is pre-wired to talk to external PostgreSQL and MinIO services, and the frontend is a Vite-powered React app ready for customization.

## 📂 Project Structure
```
Pern-Template/
├── backend/
│   ├── src/
│   │   ├── app.js                # Express app configuration
│   │   ├── server.js             # Server bootstrapper
│   │   ├── config/               # Environment + runtime configuration
│   │   ├── routes/               # Automatic feature router loader
│   │   ├── utils/                # Logger + connection test scripts
│   │   └── features/             # Feature modules (health, shared connectors, …)
│   ├── .env.example              # Backend environment template
│   └── package.json
└── frontend/
    ├── src/                      # Vite React application
    ├── .env.example              # Frontend environment template
    └── package.json
```

## 📚 Template Wiki
For a step-by-step walkthrough of the development workflow—including an end-to-end example that adds a new backend API and stitches it into the React frontend—check out the [template wiki](docs/wiki/README.md).


## ✅ Prerequisites
- [Node.js 18+](https://nodejs.org/) (includes npm)
- Running PostgreSQL and MinIO instances (local or remote)

---

## 🛠️ Backend Setup
1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```
2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # edit .env to match your infrastructure
   ```
   Key variables:
   - `DATABASE_URL`: PostgreSQL connection string.
   - `MINIO_*`: MinIO connection credentials.
   - `CORS_ORIGIN`: URL allowed to talk to the backend (defaults to the Vite dev server).
   - `PORT`: Port the API listens on (defaults to `5000`).
   - `LOG_LEVEL`: Winston logger level (e.g. `error`, `warn`, `info`, `debug`).
   - `LOG_FILE`: Optional file path for persisted logs (leave empty to log to console only).
3. **Run connection diagnostics** (optional but recommended):
   ```bash
   npm run test:db         # Verifies PostgreSQL connectivity
   npm run test:minio      # Verifies MinIO connectivity
   npm run test:connections
   ```
4. **Start the backend**
   ```bash
   npm run dev             # Nodemon + hot reload
   # or
   npm start               # Plain Node.js
   ```

### 🔁 Adding new backend features
- Create a directory inside `src/features/<feature-name>`.
- Add one or more Express routers ending with the `.route.js` suffix (e.g. `users.route.js`).
  These files are auto-discovered and mounted, so you never have to touch `app.js` or `server.js` again.
- Import the shared Winston logger when you need structured logs:
  ```js
  const logger = require("../../utils/logger");
  logger.info("Users endpoint hit", { userId });
  ```

### 🧠 Health Check Endpoint
`GET /api/health` confirms connectivity to both Postgres and MinIO and responds with:
```json
{
  "status": "ok",
  "dbTime": "2025-09-17T14:23:45.123Z",
  "minioBucket": true
}
```
---

## 🎨 Frontend Setup
1. ```bash
   cd frontend
   npm install
   cp .env.example .env
   ```
2. Update `VITE_API_BASE_URL` in `.env` to point at your backend (`http://localhost:5000` in development).
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173` by default.

---

## 📝 Logging Overview
- Log configuration is centralized in `src/utils/logger.js`.
- `LOG_LEVEL` controls verbosity (`info` by default).
- Provide `LOG_FILE` in `.env` to persist logs (e.g. `logs/backend.log`). The path is resolved relative to the backend directory.
- Use structured metadata (`logger.info("message", { key: value })`) to keep logs queryable.

---

## 🚧 Next Steps
- Scaffold new feature modules under `backend/src/features/` using the auto-loader.
- Extend the React frontend to call your new endpoints.
- Add automated tests (e.g. Jest, Vitest) as your application grows.

Happy building! 🎉
