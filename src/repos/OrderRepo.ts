import { Compra, ICompra, IOrderItem, IShippingAddress } from '@src/models/Compra';

export interface CreateOrderDTO {
  idCompra: number;
  email: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: IShippingAddress;
  items: IOrderItem[];
  total: number;
}

async function create(dto: CreateOrderDTO): Promise<void> {
  await Compra.create({
    idCompra: dto.idCompra,
    fecha: new Date(),
    status: 'pending',
    paymentStatus: 'pending',
    Usuario_idUsuario: null,
    buyerEmail: dto.email,
    buyerName: dto.buyerName,
    buyerPhone: dto.buyerPhone,
    shippingAddress: dto.shippingAddress,
    items: dto.items,
    total: dto.total,
  } as unknown as Record<string, unknown>);
}

async function getById(id: number): Promise<ICompra | null> {
  const compra = await Compra.findByPk(id);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return compra ? (compra.toJSON() as ICompra) : null;
}

async function getByTrackingToken(token: string): Promise<ICompra | null> {
  const compra = await Compra.findOne({
    where: { trackingToken: token },
  });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return compra ? (compra.toJSON() as ICompra) : null;
}

async function findByEmail(email: string): Promise<ICompra[]> {
  const compras = await Compra.findAll({
    where: { buyerEmail: email },
    order: [['fecha', 'DESC']],
  });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return compras.map((c) => c.toJSON() as ICompra);
}

async function setTrackingToken(id: number, token: string): Promise<void> {
  await Compra.update({ trackingToken: token }, {
    where: { idCompra: id },
  });
}

async function updateShipmentStatus(
  id: number,
  status: string,
): Promise<void> {
  await Compra.update({ status }, {
    where: { idCompra: id },
  });
}

async function updatePaymentStatus(
  id: number,
  paymentStatus: string,
): Promise<void> {
  await Compra.update({ paymentStatus }, {
    where: { idCompra: id },
  });
}

export default {
  create,
  getById,
  getByTrackingToken,
  findByEmail,
  setTrackingToken,
  updateShipmentStatus,
  updatePaymentStatus,
};
