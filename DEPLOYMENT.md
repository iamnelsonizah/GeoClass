# Deployment Guide

Deploy one backend service and one frontend project:

- Frontend: Vercel, root directory `frontend`
- Backend: Render or Railway, root directory `backend`

## 1. Push the project to GitHub

This folder is not currently a Git repository. Create one and push it before importing it into the hosting platforms.

```powershell
git init
git add .
git commit -m "Configure deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Do not commit `backend/.env` or `backend/credentials.json`. They are ignored by `.gitignore`.

## 2. Create the Earth Engine secret

Convert the local service account JSON into a single-line base64 value:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("backend\credentials.json")) | Set-Clipboard
```

Paste that clipboard value into the hosting platform as:

```text
GEE_SERVICE_ACCOUNT_JSON_B64
```

## 3. Deploy the backend to Render

You can use the included `render.yaml` as a Render Blueprint, or create the service manually.

Manual settings:

- Service type: Web Service
- Root Directory: `backend`
- Runtime: Python
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/api/status`

Environment variables:

```text
PYTHON_VERSION=3.11.9
GEE_PROJECT=your-google-cloud-project-id
GEE_SERVICE_ACCOUNT=your-service-account@your-project.iam.gserviceaccount.com
GEE_SERVICE_ACCOUNT_JSON_B64=your-base64-service-account-json
FRONTEND_ORIGINS=http://localhost:3000
```

After deploy, open:

```text
https://your-render-service.onrender.com/api/status
```

## 4. Or deploy the backend to Railway

Create a Railway service from the same GitHub repository.

Settings:

- Service root directory: `backend`
- Build config: `backend/railway.json`
- Start command is already configured as `uvicorn main:app --host 0.0.0.0 --port $PORT`

Environment variables:

```text
GEE_PROJECT=your-google-cloud-project-id
GEE_SERVICE_ACCOUNT=your-service-account@your-project.iam.gserviceaccount.com
GEE_SERVICE_ACCOUNT_JSON_B64=your-base64-service-account-json
FRONTEND_ORIGINS=http://localhost:3000
```

After deploy, open:

```text
https://your-railway-domain.up.railway.app/api/status
```

## 5. Deploy the frontend to Vercel

Import the same GitHub repository into Vercel.

Project settings:

- Framework Preset: Next.js
- Root Directory: `frontend`
- Build Command: `npm run build`
- Install Command: `npm install`

Environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url
```

Deploy the frontend.

## 6. Connect frontend and backend

After Vercel gives you the final frontend URL, update the backend environment variable:

```text
FRONTEND_ORIGINS=https://your-vercel-app.vercel.app
```

Redeploy or restart the backend after changing this value.

If you want Vercel preview deployments to call the backend too, add a controlled regex:

```text
FRONTEND_ORIGIN_REGEX=https://.*\.vercel\.app
```

Use the exact `FRONTEND_ORIGINS` value for production whenever possible.

## 7. Verify

Open the Vercel app and check:

- The status indicator should show the backend as online.
- Browser network requests should go to the hosted backend, not `localhost:8000`.
- Location search should zoom the map.
- Draw an AOI, load imagery, and run classification.
- `/api/status` should return `gee_connected: true`.

Common fixes:

- CORS error: update `FRONTEND_ORIGINS` to the exact Vercel URL and restart the backend.
- Earth Engine offline: verify `GEE_PROJECT`, `GEE_SERVICE_ACCOUNT`, and `GEE_SERVICE_ACCOUNT_JSON_B64`.
- Mixed content error: make sure `NEXT_PUBLIC_API_BASE_URL` starts with `https://`.
- Frontend still calls localhost: update `NEXT_PUBLIC_API_BASE_URL` in Vercel and redeploy the frontend.
