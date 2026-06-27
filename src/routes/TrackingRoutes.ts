import { IReq, IRes } from './types/express/misc';
import OrderService from '@src/services/OrderService';
import { generalRateLimit, strictRateLimit } from '@src/middleware/rateLimit';
import { Router } from 'express';

const router = Router();

router.post(
  '/track-request',
  generalRateLimit,
  async (req: IReq, res: IRes) => {
    const { email } = req.body as unknown as { email: string };

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Email invalido' });
    }

    await OrderService.requestTracking(email);

    return res.status(200).json({
      message:
        'Si hay pedidos asociados a ese email, te enviamos un enlace de seguimiento.',
    });
  },
);

router.get(
  '/track/:token',
  strictRateLimit,
  async (req: IReq, res: IRes) => {
    const { token } = req.params;

    if (!token || typeof token !== 'string') {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    const order = await OrderService.getByToken(token);

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    return res.status(200).json(order);
  },
);

export default router;
