import OrderRepo from '@src/repos/OrderRepo';
import MailService from '@src/services/MailService';
import tokenUtil from '@src/util/token';

export interface TrackingPublicDTO {
  status: string;
  paymentStatus: string;
  shipmentStatus: string;
  placedAt: string;
  items: { name: string; size: string | null; color: string | null; quantity: number }[];
  carrier: string | null;
  trackingNumber: string | null;
}

async function requestTracking(email: string): Promise<void> {
  const orders = await OrderRepo.findByEmail(email);

  if (orders.length > 0) {
    for (const order of orders) {
      if (!order.trackingToken) {
        const token = tokenUtil.generateTrackingToken();
        await OrderRepo.setTrackingToken(order.idCompra, token);
      }
    }

    const updated = await OrderRepo.findByEmail(email);
    await MailService.sendTrackingLinks(email, updated);
  }
}

async function getByToken(token: string): Promise<TrackingPublicDTO | null> {
  const order = await OrderRepo.getByTrackingToken(token);

  if (!order) {
    return null;
  }

  return {
    status: order.status || 'pending',
    paymentStatus: order.paymentStatus || 'pending',
    shipmentStatus: order.status || 'pending',
    placedAt: order.fecha
      ? new Date(order.fecha).toISOString()
      : new Date().toISOString(),
    items: (order.items || []).map((i) => ({
      name: 'Producto Lute',
      size: null,
      color: null,
      quantity: i.quantity,
    })),
    carrier: null,
    trackingNumber: null,
  };
}

export default {
  requestTracking,
  getByToken,
};
