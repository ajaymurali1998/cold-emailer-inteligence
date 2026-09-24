// Explicit locale/options everywhere -- Date#toLocaleString() with no
// arguments uses the *runtime's* default locale, which differs between the
// Node server (SSR) and the browser (hydration), causing a hydration
// mismatch. Pinning both to the same explicit format keeps them identical.
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
