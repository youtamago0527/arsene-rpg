import { createHash, createHmac, timingSafeEqual, verify, X509Certificate } from 'node:crypto';
import { Buffer } from 'node:buffer';

export const digest = value => createHash('sha256').update(value).digest('base64url');

function mac(payload, secret) {
  return createHmac('sha256', secret).update('arsene-infinite-ranking.v1.' + payload).digest();
}

export function signSession(playerId, secret, now) {
  const payload = Buffer.from(JSON.stringify({ playerId, expires: now + 3_600_000 })).toString('base64url');
  return payload + '.' + mac(payload, secret).toString('base64url');
}

export function readSession(header, secret, now) {
  const match = /^Bearer ([\w-]{1,256})\.([\w-]{43})$/i.exec(header || '');
  if (!match) return null;
  const [, payload, signature] = match;
  const received = Buffer.from(signature, 'base64url');
  if (!timingSafeEqual(received, mac(payload, secret))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isSafeInteger(session.playerId) && session.playerId > 0 && session.expires > now
      ? session.playerId : null;
  } catch {
    return null;
  }
}

function validAt(cert, now) {
  return Date.parse(cert.validFrom) <= now && now <= Date.parse(cert.validTo);
}

export async function verifyGameCenter(data, env, now) {
  const url = new URL(data.publicKeyUrl);
  if (url.origin !== 'https://static.gc.apple.com' || url.username || url.password ||
      url.search || url.hash || !/^\/public-key\/[a-z0-9_-]+\.cer$/i.test(url.pathname)) return false;
  const response = await fetch(url, { redirect: 'error', cf: { cacheEverything: true, cacheTtl: 3600 } });
  if (!response.ok) throw new Error('game_center_key_unavailable');
  if (Number(response.headers.get('content-length')) > 65536) return false;
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > 65536) return false;
  const certificate = new X509Certificate(Buffer.from(buffer));
  const issuers = env.GAME_CENTER_CA_PEMS.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || [];
  if (!issuers.length) throw new Error('game_center_issuer_missing');
  const trusted = issuers.some(pem => {
    const issuer = new X509Certificate(pem);
    return issuer.ca && validAt(issuer, now) && certificate.checkIssued(issuer) && certificate.verify(issuer.publicKey);
  });
  if (!trusted || !validAt(certificate, now)) return false;
  const timestamp = Buffer.alloc(8);
  timestamp.writeBigUInt64BE(BigInt(data.timestamp));
  const message = Buffer.concat([
    Buffer.from(data.playerId, 'utf8'), Buffer.from(env.APPLE_BUNDLE_ID, 'utf8'),
    timestamp, Buffer.from(data.salt, 'base64')
  ]);
  return verify('RSA-SHA256', message, certificate.publicKey, Buffer.from(data.signature, 'base64'));
}
