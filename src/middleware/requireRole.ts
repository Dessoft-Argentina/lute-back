import { Response as IRes, NextFunction as INext } from 'express';
import HttpStatusCodes from '@src/common/HttpStatusCodes';
import { AuthenticatedRequest } from '@src/middleware/requireAuth';

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: IRes, next: INext): void => {
    if (!req.user) {
      res.status(HttpStatusCodes.UNAUTHORIZED).json({ error: 'No autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(HttpStatusCodes.FORBIDDEN).json({ error: 'Permiso insuficiente' });
      return;
    }

    next();
  };
}
