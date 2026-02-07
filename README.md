# R360 Platform

The R360 Platform is a resource management and allocation system designed for modern consultancy operations.

## Architecture

This is a Monorepo containing:
- **`app/`**: Next.js 14 Frontend (React, Tailwind, Shadcn UI)
- **`backend/`**: Node.js Backend (Express, Mongoose, TypeScript)

## Prerequisites

- Node.js 18+
- MongoDB (Local or Atlas)

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
npm run build
cp .env.example .env  # Update with your Mongo URI
npm start
```

### 2. Frontend Setup

```bash
cd app
npm install
cp .env.example .env.local
npm run dev
```

## Testing

Run backend tests:
```bash
cd backend
npm test
```

## Operational Readiness

- **Health Check**: `GET /health` (Returns DB status)
- **Logging**: JSON structured logs in Production.
- **Correlation**: All requests include `x-request-id` header.
- **Graceful Shutdown**: Handles SIGTERM/SIGINT to close DB connections safely.
