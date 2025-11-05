# MovieApp Monorepo (Django + React) with CI and Docker

## Local Dev (Docker)
```bash
cp .env.example .env
cd docker
docker compose -f compose.dev.yml up --build
# frontend: http://localhost:5173
# backend health: http://localhost:8000/health/
```

## Local Dev (venv)
If you prefer running locally without Docker:

```powershell
# From repo root
py -3.12 -m venv .venv --upgrade-deps
. .\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -r movieapp/backend/requirements.txt

# Backend
cd movieapp/backend
python manage.py migrate
python manage.py runserver  # http://localhost:8000

# In a second terminal for the frontend
cd movieapp/frontend
npm install
npm run dev                 # http://localhost:5173
```

Notes
- Use `source .venv/bin/activate` on macOS/Linux to activate.
- Ensure the frontend points to the backend (default may be `http://localhost:8000`). If needed, set `VITE_API_URL` in the frontend `.env`.
- Keep `.venv/` uncommitted; it’s ignored by `.gitignore`.

## CI (GitHub Actions)
- On every push/PR, backend & frontend build and a Docker build sanity-check runs.

## CD Recommendation (Render.com)
- Create two Render Web Services from this repo:
  - Backend → Dockerfile.backend (set env vars; add managed Postgres; post-deploy: `python manage.py migrate`)
  - Frontend → Dockerfile.frontend (set `VITE_API_URL` to backend URL)
- Enable Auto Deploy on `main`. That's your CD.

## Notes
- Replace placeholder code with your real app.
- Add tests (pytest for Django, Vitest for React) later.
- Keep secrets in provider or GitHub Secrets (never commit `.env`).
