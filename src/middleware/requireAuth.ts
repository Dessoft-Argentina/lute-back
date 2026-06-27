import { Request as IReq, Response as IRes, NextFunction as INext } from 'express';
import HttpStatusCodes from '@src/common/HttpStatusCodes';
import { verifyToken } from '@src/util/jwt';

export interface TokenPayload {
  data: {
    id: number;
    email: string;
    role: 'admin' | 'staff';
  };
}

export interface AuthenticatedRequest extends IReq {
  user?: TokenPayload['data'];
}

export async function requireAuth(
  req: IReq,
  res: IRes,
  next: INext,
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(HttpStatusCodes.UNAUTHORIZED).json({ error: 'Token requerido' });
    return;
  }

  try {
    const decoded = await verifyToken(token);
    const payload = decoded as TokenPayload;

    if (!payload.data || !payload.data.id) {
      res.status(HttpStatusCodes.UNAUTHORIZED).json({ error: 'Token invalido' });
      return;
    }

    (req as AuthenticatedRequest).user = payload.data;
    next();
  } catch (_e) {
    res.status(HttpStatusCodes.UNAUTHORIZED).json({ error: 'Token invalido o expirado' });
  }
}
