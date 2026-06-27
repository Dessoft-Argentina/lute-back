import crypto from 'crypto';

export interface MpWebhookHeaders {
  'x-signature'?: string;
  'x-request-id'?: string;
}

function verifySignature(
  rawBody: string,
  headers: MpWebhookHeaders,
  secret: string,
): boolean {
  const signature = headers['x-signature'];
  const requestId = headers['x-request-id'];

  if (!signature || !requestId) {
    return false;
  }

  const parts = signature.split(',');
  const tsPart = parts.find((p) => p.trim().startsWith('ts='));
  const hashPart = parts.find((p) => p.trim().startsWith('v1='));

  if (!tsPart || !hashPart) {
    return false;
  }

  const ts = tsPart.split('=')[1]?.trim();
  const receivedHash = hashPart.split('=')[1]?.trim();

  if (!ts || !receivedHash) {
    return false;
  }

  const manifest = `id:${requestId};request-id:${requestId};ts:${ts};`;
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  const expBuf = Buffer.from(expectedHash);
  const recBuf = Buffer.from(receivedHash);

  if (expBuf.length !== recBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expBuf, recBuf);
}

export default {
  verifySignature,
};
