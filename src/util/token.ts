import crypto from 'crypto';

function generateTrackingToken(): string {
  return crypto.randomUUID();
}

export default {
  generateTrackingToken,
};
