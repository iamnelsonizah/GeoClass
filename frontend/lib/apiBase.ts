/**
 * Single source of truth for the GeoClass backend URL.
 * Reads NEXT_PUBLIC_API_BASE_URL (documented in DEPLOYMENT.md), falling back to the
 * legacy NEXT_PUBLIC_BACKEND_URL, then to a local dev server. Adds a protocol if missing
 * and strips the trailing slash so callers can safely do `${API_BASE}/api/...`.
 */
function resolveApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:8000'
  ).trim();
  const withProtocol = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, '');
}

export const API_BASE = resolveApiBase();
