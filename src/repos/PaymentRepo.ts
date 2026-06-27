import { Payment, IPayment } from '@src/models/Payment';

async function getByMpPaymentId(mpPaymentId: string): Promise<IPayment | null> {
  const payment = await Payment.findOne({
    where: { mpPaymentId },
  });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return payment ? (payment.toJSON() as IPayment) : null;
}

async function create(data: Partial<IPayment>): Promise<IPayment> {
  const payment = await Payment.create(data as Record<string, unknown>);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return payment.toJSON() as IPayment;
}

async function updateStatus(id: number, status: string): Promise<void> {
  await Payment.update({ status, processedAt: new Date() }, {
    where: { id },
  });
}

export default {
  getByMpPaymentId,
  create,
  updateStatus,
};
