# AI Agent Instructions for Medical Records System

## Architecture Overview

This is a medical records management system built with:
- Frontend: React 18 + TypeScript + Material-UI
- Backend: FastAPI + SQLAlchemy + PostgreSQL
- Deployment: Docker Compose with hot-reload for development

### Key Components

1. **Backend (`/backend/`):**
   - Main API: `main_clean_english.py` - Core FastAPI application
   - Database: `database.py` - SQLAlchemy models
   - Business Logic: `crud.py` - Database operations
   - Services: 
     - `appointment_service.py` - Appointment scheduling
     - `encryption.py` - Data encryption
     - `digital_signature.py` - Doctor signatures

2. **Frontend (`/frontend/`):**
   - React components with TypeScript
   - Material-UI for consistent styling
   - Axios for API communication

## Critical Patterns

### 1. Timezone Handling
- System uses Mexico City (CDMX) timezone as default
- All datetime operations should use `now_cdmx()` or `to_cdmx_timezone()`
- Database stores UTC, conversion happens at API layer
```python
from datetime import datetime
import pytz

SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')
dt = now_cdmx()  # Current time in CDMX
```

### 2. Data Security
- Sensitive patient data must be encrypted using `encryption_service`
- Digital signatures required for medical records
- JWT authentication for all API endpoints

### 3. Development Workflow
```bash
# Start development environment
docker compose up

# Initialize database (first time)
docker compose exec python-backend python init_db.py

# Run migrations
docker compose exec python-backend alembic upgrade head
```

## Integration Points

1. **Database Connections:**
   - Backend connects to PostgreSQL via SQLAlchemy
   - Connection string in `database.py`

2. **API Communication:**
   - Frontend makes requests to `:8000` endpoint
   - Authentication via JWT tokens in headers

## Best Practices

1. **Error Handling:**
   - Use `ErrorHandlingMiddleware` for consistent API errors
   - Frontend should handle HTTP 400/500 errors gracefully

2. **Data Validation:**
   - Backend: Use Pydantic models in `schemas.py`
   - Frontend: Form validation before API calls

3. **Code Organization:**
   - Keep sensitive configuration in `.env` files
   - Follow existing directory structure for new features