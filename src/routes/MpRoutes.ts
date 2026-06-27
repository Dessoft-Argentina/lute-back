import MercadoPagoConfig, { Payment } from 'mercadopago';
import { IReq, IRes } from './types/express/misc';
import ProductRepo from '@src/repos/ProductRepo';
import OrderRepo from '@src/repos/OrderRepo';
import PaymentRepo from '@src/repos/PaymentRepo';
import MailService from '@src/services/MailService';
import mpSignature from '@src/util/mpSignature';
import tokenUtil from '@src/util/token';
import { ICompra } from '@src/models/Compra';

const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
  console.error('MP_ACCESS_TOKEN no configurado');
}
const client = new MercadoPagoConfig({ accessToken: accessToken ?? '' });

async function webhooks(req: IReq, res: IRes) {
  const webhookSecret = process.env.MP_WEBHOOK_SECRET;
  if (webhookSecret) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const headers = {
      'x-signature': req.headers['x-signature'] as string | undefined,
      'x-request-id': req.headers['x-request-id'] as string | undefined,
    };

    if (!mpSignature.verifySignature(rawBody, headers, webhookSecret)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  }

  const mpPaymentId = (req.body as unknown as { data: { id: string } }).data.id;
  if (!mpPaymentId) {
    return res.status(400).json({ error: 'Missing payment id' });
  }

  const existing = await PaymentRepo.getByMpPaymentId(mpPaymentId);
  if (existing) {
    return res.status(200).json({ status: 'already_processed' });
  }

  await handlePayment(mpPaymentId);

  return res.status(200).json({ status: 'processed' });
}

async function handlePayment(mpPaymentId: string): Promise<void> {
  const paymentData = await new Payment(client).get({ id: mpPaymentId });

  const externalRef = paymentData.external_reference as string | undefined;
  let compra: ICompra | null = null;

  if (externalRef) {
    compra = await OrderRepo.getById(Number(externalRef));
  }

  if (!compra) return;

  const amount = paymentData.transaction_amount
    ? Number(paymentData.transaction_amount)
    : null;
  const preferenceId = (paymentData as unknown as Record<string, unknown>).preference_id as string | undefined;

  await PaymentRepo.create({
    orderId: compra.idCompra,
    mpPaymentId,
    mpPreferenceId: preferenceId || null,
    status: paymentData.status as string || 'unknown',
    amount,
    processedAt: new Date(),
  } as any);

  const paymentStatus = paymentData.status as string;

  if (paymentStatus === 'approved') {
    const trackingToken = tokenUtil.generateTrackingToken();
    await OrderRepo.setTrackingToken(compra.idCompra, trackingToken);
    await OrderRepo.updatePaymentStatus(compra.idCompra, 'approved');

    const updatedCompra = await OrderRepo.getById(compra.idCompra);
    if (updatedCompra) {
      await MailService.sendOrderConfirmation(updatedCompra);
    }
  } else if (['rejected', 'refunded', 'cancelled'].includes(paymentStatus)) {
    if (externalRef && compra.items && compra.items.length > 0) {
      const restoreItems = compra.items.map((i: any) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      }));
      await ProductRepo.restoreStock(restoreItems);
    }

    await OrderRepo.updatePaymentStatus(compra.idCompra, paymentStatus);
  }
}

export default {
  webhooks,
} as const;
