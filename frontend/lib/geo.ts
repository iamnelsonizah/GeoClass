/** Format a coordinate pair with correct hemisphere letters, e.g. 8.4872° N · 5.5283° E */
export function formatLatLng(lat: number, lng: number, digits = 4): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(digits)}° ${ns} · ${Math.abs(lng).toFixed(digits)}° ${ew}`;
}

/** Ready-made demo area: the Niger–Benue confluence at Lokoja, in the dry season (least cloud). */
export const EXAMPLE_AREA = {
  name: 'Niger–Benue confluence, Lokoja',
  lat: 7.8,
  lng: 6.745,
  sizeKm: 8,
  start: '2024-11-01',
  end: '2025-02-28',
} as const;

/** Turn low-level fetch errors into something a person can act on. */
export function humanizeError(msg: string | null): string | null {
  if (!msg) return msg;
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return "Couldn't reach the analysis server. Check your connection and try again; if it keeps happening the server may be restarting.";
  }
  if (/timed? ?out|timeout|504/i.test(msg)) {
    return 'The analysis took too long and timed out. Try a smaller area or a shorter date range.';
  }
  return msg;
}
