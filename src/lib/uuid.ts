/**
 * Canonical v4 UUID generation for the client-held request_id.
 *
 * crypto.randomUUID() is available in every browser that supports a secure
 * context, which GitHub Pages always is (HTTPS). The fallback covers older
 * browsers and keeps the shape the Edge Function validates.
 */
export function newRequestId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()

  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}
