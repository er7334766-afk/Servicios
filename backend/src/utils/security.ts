import crypto from 'crypto';

const SECRET = process.env.SECRET_KEY ?? 'default_secret_change_me';

export function hash256(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
}

export function hash512(data: string): string {
  return crypto.createHmac('sha512', SECRET).update(data).digest('hex');
}

export function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
