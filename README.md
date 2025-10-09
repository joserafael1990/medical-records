# historias-clinicas

## Running with Docker

This project uses Docker to run the backend (Python/FastAPI), frontend (React/TypeScript), and PostgreSQL database. The setup is managed via Docker Compose.

### Requirements
- Docker and Docker Compose installed
- No additional global dependencies required

### Service Versions
- **Backend:** Python 3.11 (see `backend/Dockerfile`)
- **Frontend:** Node.js 22.13.1 (see `frontend/Dockerfile`)
- **Database:** PostgreSQL (latest)

### Environment Variables
- Default environment variables for PostgreSQL are set in `docker-compose.yml`:
  - `POSTGRES_USER=postgres`
  - `POSTGRES_PASSWORD=postgres`
  - `POSTGRES_DB=historias_clinicas`
- Optional: You can provide `.env` files for backend and frontend by uncommenting the `env_file` lines in `docker-compose.yml`.

### Ports
- **Backend (FastAPI):** `8000` (exposed as `8000:8000`)
- **Frontend (React):** `3000` (exposed as `3000:3000`)
- **Database (PostgreSQL):** `5432` (exposed as `5432:5432`)

### Build and Run Instructions
1. From the project root, run:
   ```sh
   docker compose up --build
   ```
   This will build and start all services.

2. Access the services:
   - Backend API: [http://localhost:8000](http://localhost:8000)
   - Frontend app: [http://localhost:3000](http://localhost:3000)
   - PostgreSQL: localhost:5432

### Special Configuration
- Persistent database storage is configured via the `postgres_data` volume.
- Healthchecks are enabled for PostgreSQL to ensure backend starts only after the database is ready.
- Non-root users are used for both backend and frontend containers for improved security.

---
