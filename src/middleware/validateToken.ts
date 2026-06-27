import jwt from "jsonwebtoken";
import { Request as IReq, Response as IRes, NextFunction as INext } from "express";
import HttpStatusCodes from "@src/common/HttpStatusCodes";

export interface Payload {
    id: number;
}
export interface CustomRequest extends IReq {
    payload: Payload;
}

export const authenticateToken = (req: IReq, res: IRes, next: INext) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
      res.status(HttpStatusCodes.UNAUTHORIZED).json({ error: 'Token requerido' });
      return;
    }

    const secret = process.env.JWT_SECRET || '';
    if (!secret) {
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Error de configuracion del servidor' });
      return;
    }

    jwt.verify(token, secret, (err, user) => {
        if (err) {
          return res.status(HttpStatusCodes.UNAUTHORIZED).json({ error: 'Token invalido o expirado' });
        }
        if (user) {
            (req as CustomRequest).payload = user as Payload;
            next();
        } else {
            res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Error interno' });
        }
    });
}


export async function verifyToken(req: IReq, res: IRes) {
    const { token } = req.body as unknown as { token: string };

    try {
        const verified = await new Promise((resolve, reject) => {
            jwt.verify(token, process.env.JWT_SECRET || '', (err, user) => {
                if (err) return reject(err);
                resolve(user);
            });
        });

        if (verified) {
            return res.status(HttpStatusCodes.OK).json({ message: "Token verified" });
        }
    } catch (error) {
        return res.status(HttpStatusCodes.UNAUTHORIZED).json({ error: "Unauthorized" });
    }
};
