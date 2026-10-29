# Deployment Guide: GeoClass Platform

This guide outlines how to deploy the **GeoClass** platform:
- **Backend API**: [FastAPI Cloud](https://fastapicloud.com), root directory `backend`
- **Frontend Workstation**: [Cloudflare Pages](https://pages.cloudflare.com) or [Vercel](https://vercel.com), root directory `frontend`

---

## 1. Google Earth Engine Credentials Preparation

Before deploying, convert your Google Earth Engine service account JSON key into a single-line base64 string so it can be securely passed as an environment variable without storing key files in the repository.

### On macOS / Linux:
```bash
base64 -i backend/credentials.json | tr -d '\n' | pbcopy
# (Or on Linux: base64 -w 0 backend/credentials.json)
```

### On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("backend\credentials.json")) | Set-Clipboard
```

Keep this clipboard string ready for the `GEE_SERVICE_ACCOUNT_JSON_B64` environment variable.

---

## 2. Deploy Backend to FastAPI Cloud (https://fastapicloud.com)

[FastAPI Cloud](https://fastapicloud.com) is the native hosting platform for FastAPI applications, providing automatic Python dependency management, HTTPS SSL termination, auto-scaling, and health check monitoring.

### Step-by-Step Deployment:
1. Log in to your [FastAPI Cloud](https://fastapicloud.com) dashboard.
2. Click **New Project** and connect your GitHub repository (`Geoclass`).
3. Configure the build and runtime parameters:
   - **Root Directory**: `backend`
   - **Entrypoint**: `main:app`
   - **Python Version**: `3.11` (or `3.12`)
   - **Health Check Path**: `/api/status`
4. Add the following **Environment Variables** in the FastAPI Cloud settings:

```text
PYTHON_VERSION=3.11.9
GEE_PROJECT=your-google-cloud-project-id
GEE_SERVICE_ACCOUNT=your-service-account@your-project.iam.gserviceaccount.com
GEE_SERVICE_ACCOUNT_JSON_B64=your-base64-service-account-json
FRONTEND_ORIGINS=https://your-frontend-domain.pages.dev,http://localhost:3000
FRONTEND_ORIGIN_REGEX=https://.*\.pages\.dev|https://.*\.vercel\.app
RATE_LIMIT_PER_MINUTE=60
MAX_AOI_HA=50000
```

*(Optional: If using distributed Redis for multi-instance rate limiting across worker replicas)*:
```text
REDIS_URL=redis://default:password@your-redis-host:6379
```

5. Click **Deploy**.
6. Once deployment finishes, FastAPI Cloud will provide your live API URL:
   ```text
   https://geoclass-api.fastapicloud.app
   ```
7. Verify deployment by opening:
   ```text
   https://geoclass-api.fastapicloud.app/api/status
   ```
   You should see:
   ```json
   {
     "status": "healthy",
     "gee_connected": true,
     "version": "1.0.0"
   }
   ```

---

## 3. Deploy Frontend (Cloudflare Pages or Vercel)

The frontend is a Next.js 16 application configured with static HTML export (`output: "export"`) optimized for Cloudflare Pages and modern static CDNs.

### A. Deploy to Cloudflare Pages:
1. Go to the **Cloudflare Dashboard** > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select your `Geoclass` repository.
3. Configure build settings:
   - **Framework Preset**: `Next.js (Static Export)`
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
4. Set the Environment Variable:
   ```text
   NEXT_PUBLIC_API_BASE_URL=https://geoclass-api.fastapicloud.app
   ```
5. Click **Save and Deploy**.

### B. Or Deploy to Vercel:
1. Import the same repository into Vercel.
2. Select root directory: `frontend`.
3. Set environment variable:
   ```text
   NEXT_PUBLIC_API_BASE_URL=https://geoclass-api.fastapicloud.app
   ```
4. Deploy.

---

## 4. Connect Frontend & Backend Verification

1. Open your live frontend URL (e.g. `https://geoclass.pages.dev`).
2. Verify that the **GEE Engine** indicator in the workstation header displays `CONNECTED (10m MSI)`.
3. Select an Area of Interest (AOI), load True Color imagery, and click **Run Classification**.
4. Check that browser network requests succeed against your FastAPI Cloud backend URL.

### Troubleshooting:
- **CORS Error**: Ensure `FRONTEND_ORIGINS` in your FastAPI Cloud dashboard includes your exact frontend URL.
- **Earth Engine Offline**: Verify `GEE_PROJECT` and `GEE_SERVICE_ACCOUNT_JSON_B64` in FastAPI Cloud.
- **504 Timeouts**: For large AOI operations, use the `/api/jobs/submit/...` asynchronous background endpoints.
