const encoder = new TextEncoder();
const b64url = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const fromB64 = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const bytes = (value: Uint8Array) => new Uint8Array(value).buffer;

export async function sha256(value: string | Uint8Array) {
  return b64url(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : bytes(value)));
}

export async function signToken(payload: object, secret: string) {
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return `${body}.${b64url(await crypto.subtle.sign('HMAC', key, encoder.encode(body)))}`;
}

export async function verifyToken<T>(token: string, secret: string): Promise<T | null> {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify('HMAC', key, fromB64(signature), encoder.encode(body))) return null;
  try { return JSON.parse(new TextDecoder().decode(fromB64(body))) as T; } catch { return null; }
}

// Minimal DER reader: extracts SubjectPublicKeyInfo from an X.509 certificate.
export function extractSpki(cert: Uint8Array): Uint8Array {
  const read = (at: number) => { let length = cert[at + 1], head = 2; if (length & 0x80) { const n = length & 0x7f; length = 0; for (let i = 0; i < n; i++) length = length * 256 + cert[at + 2 + i]; head += n; } return { at, head, length, end: at + head + length }; };
  const outer = read(0), tbs = read(outer.at + outer.head);
  let cursor = tbs.at + tbs.head;
  if (cert[cursor] === 0xa0) cursor = read(cursor).end;
  for (let i = 0; i < 5; i++) cursor = read(cursor).end; // serial, signature, issuer, validity, subject
  const spki = read(cursor);
  return cert.slice(spki.at, spki.end);
}

export async function verifyGameCenterSignature(input: { playerId: string; bundleId: string; timestamp: number; salt: string; signature: string; publicKeyUrl: string }) {
  const url = new URL(input.publicKeyUrl);
  if (url.protocol !== 'https:' || !(url.hostname === 'apple.com' || url.hostname.endsWith('.apple.com'))) return false;
  const response = await fetch(url, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!response.ok || Number(response.headers.get('content-length') || 0) > 65536) return false;
  const cert = new Uint8Array(await response.arrayBuffer());
  if (cert.byteLength > 65536) return false;
  const key = await crypto.subtle.importKey('spki', bytes(extractSpki(cert)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ts = new Uint8Array(8); new DataView(ts.buffer).setBigUint64(0, BigInt(input.timestamp), false);
  const message = new Uint8Array([...encoder.encode(input.playerId), ...encoder.encode(input.bundleId), ...ts, ...fromB64(input.salt)]);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes(fromB64(input.signature)), bytes(message));
}
