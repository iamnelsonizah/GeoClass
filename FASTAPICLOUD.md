# FastAPI Cloud Deployment Reference (https://fastapicloud.com)

This document provides quick deployment instructions for deploying the **GeoClass FastAPI Backend** to **[FastAPI Cloud](https://fastapicloud.com)**.

---

## Service Overview
- **Repository Root**: `backend/`
- **Application Entrypoint**: `main:app`
- **Framework**: FastAPI (Python 3.11+)
- **Health Check Route**: `/api/status`

## Required Environment Variables
Configure these in your FastAPI Cloud project settings:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `GEE_PROJECT` | Google Cloud project registered for Earth Engine | `my-gee-project-123` |
| `GEE_SERVICE_ACCOUNT` | Service Account IAM email | `gee-sa@my-gee-project-123.iam.gserviceaccount.com` |
| `GEE_SERVICE_ACCOUNT_JSON_B64` | Base64-encoded service account credentials JSON | `eyJuYW1lIjog...` |
| `FRONTEND_ORIGINS` | Allowed CORS origins (comma-separated or `*`) | `https://geoclass.pages.dev,http://localhost:3000` |
| `FRONTEND_ORIGIN_REGEX` | Regex for preview subdomains | `https://.*\.pages\.dev\|https://.*\.vercel\.app` |
| `MAX_AOI_HA` | Max study area hectare limit for open access | `50000.0` |
| `RATE_LIMIT_PER_MINUTE` | Max requests per IP per minute | `60` |

### Optional Distributed Redis
For multi-instance deployments where you want rate limits shared across instances:
| Variable | Description | Example |
| :--- | :--- | :--- |
| `REDIS_URL` | Redis connection URL for distributed token-bucket rate limiting | `redis://default:password@host:6379` |

## Asynchronous Background Jobs
To prevent HTTP 504 timeouts on heavy remote sensing workloads (multi-year LandTrendr change analysis, multi-page ReportLab PDF briefing generation, or long time-series extraction), use the background jobs endpoints:
- `POST /api/jobs/submit/change-detection`
- `POST /api/jobs/submit/pdf-briefing`
- `POST /api/jobs/submit/pixel-history`
- `GET /api/jobs/{job_id}` (poll status & retrieve results)
- `GET /api/jobs` (list recent tasks)
