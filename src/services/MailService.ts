import { ICompra } from '@src/models/Compra';

// eslint-disable-next-line @typescript-eslint/require-await
async function sendOrderConfirmation(
  order: ICompra,
): Promise<void> {
  try {
    const publicUrl = process.env.PUBLIC_STOREFRONT_URL || 'http://localhost:3000';
    const trackingLink = order.trackingToken
      ? `${publicUrl}/orders/track/${order.trackingToken}`
      : null;

    console.log(
      `[MailService] Confirmation for order ${order.idCompra} sent to ${order.buyerEmail}` +
        (trackingLink ? ` — tracking: ${trackingLink}` : ''),
    );
  } catch (error) {
    console.error(`[MailService] Failed to send confirmation for order ${order.idCompra}:`, error);
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
async function sendTrackingLinks(
  email: string,
  orders: ICompra[],
): Promise<void> {
  try {
    const publicUrl = process.env.PUBLIC_STOREFRONT_URL || 'http://localhost:3000';
    const links = orders
      .filter((o) => o.trackingToken)
      .map((o) => `${publicUrl}/orders/track/${o.trackingToken}`);

    console.log(
      `[MailService] Tracking links sent to ${email}: ${links.join(', ')}`,
    );
  } catch (error) {
    console.error(`[MailService] Failed to send tracking links to ${email}:`, error);
  }
}

export default {
  sendOrderConfirmation,
  sendTrackingLinks,
};
