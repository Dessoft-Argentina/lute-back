import { IReq, IRes } from './types/express/misc';
import CheckoutService, { CheckoutAddress } from '@src/services/CheckoutService';

interface CheckoutItem {
  variantId: number;
  quantity: number;
}

async function createCheckout(req: IReq, res: IRes) {
  const body = req.body as unknown as Record<string, unknown>;
  const { email, buyer, shippingAddress, items } = body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email invalido' });
  }
  if (!buyer || typeof buyer !== 'object') {
    return res.status(400).json({ error: 'Datos de comprador invalidos' });
  }
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return res.status(400).json({ error: 'Direccion de envio invalida' });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ error: 'Items invalidos' });
  }

  for (const item of items as CheckoutItem[]) {
    if (
      typeof item.variantId !== 'number' ||
      !Number.isInteger(item.variantId) ||
      item.variantId <= 0
    ) {
      return res.status(400).json({ error: 'variantId invalido' });
    }
    if (
      typeof item.quantity !== 'number' ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      return res.status(400).json({ error: 'quantity invalida' });
    }
  }

  try {
    const checkoutDTO = {
      email,
      buyer: buyer as { name: string; phone: string },
      shippingAddress: shippingAddress as CheckoutAddress,
      items: (items as CheckoutItem[]).map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    };
    const result = await CheckoutService.checkout(checkoutDTO);

    return res.status(200).json({
      orderId: result.orderId,
      paymentUrl: result.paymentUrl,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number; items?: unknown };
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 409
        ? 'Stock insuficiente'
        : 'Error al procesar el checkout';

    return res.status(statusCode).json({
      error: message,
      items: error.items || undefined,
    });
  }
}

export default {
  createCheckout,
};