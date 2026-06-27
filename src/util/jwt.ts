// eslint-disable-next-line node/no-extraneous-import
import jwt from 'jsonwebtoken';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no configurado');
  }
  return secret;
};

export function generateToken(data: Record<string, unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    const secret = getSecret();
    jwt.sign(
      { data },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
      (err, token) => {
        if (err) return reject(err);
        if (!token) return reject(new Error('Token not generated'));
        resolve(token);
      },
    );
  });
}

export function verifyToken(token: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const secret = getSecret();
    jwt.verify(token, secret, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}
