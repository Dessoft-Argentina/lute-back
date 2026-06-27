import crypto from 'crypto';
import MercadoPagoConfig, { Preference } from 'mercadopago';
import CartService from '@src/services/CartService';
import ProductRepo from '@src/repos/ProductRepo';
import OrderRepo from '@src/repos/OrderRepo';

export interface CheckoutBuyer {
  name: string;
  phone: string;
}

export interface CheckoutAddress {
  street: string;
  number: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface CheckoutItemInput {
  variantId: number;
  quantity: number;
}

export interface CheckoutDTO {
  email: string;
  buyer: CheckoutBuyer;
  shippingAddress: CheckoutAddress;
  items: CheckoutItemInput[];
}

export interface CheckoutResult {
  orderId: number;
  paymentUrl: string;
}

function generateOrderId(): number {
  return parseInt(crypto.randomUUID().replace(/-/g, '').slice(0, 15), 16);
}

async function checkout(dto: CheckoutDTO): Promise<CheckoutResult> {
  // 1. Validate cart items (pure read, no lock)
  const validation = await CartService.validate(dto.items);
  const invalidItems = validation.items.filter((i) => !i.valid || i.adjusted);
  if (invalidItems.length > 0) {
    const err = new Error('Stock insuficiente o items invalidos') as Error & {
      statusCode: number;
      items: typeof invalidItems;
    };
    err.statusCode = 409;
    err.items = invalidItems;
    throw err;
  }

  // 2. Reserve stock (transactional with FOR UPDATE)
  const reserveItems = dto.items.map((i) => ({
    variantId: i.variantId,
    quantity: i.quantity,
  }));
  const reserveResult = await ProductRepo.reserveStock(reserveItems);
  if (!reserveResult.success) {
    const err = new Error('Stock insuficiente') as Error & {
      statusCode: number;
      items: typeof reserveResult.failedItems;
    };
    err.statusCode = 409;
    err.items = reserveResult.failedItems;
    throw err;
  }

  // 3. Create Order record (pending) with items snapshot + buyer data + tracking token
  const compraId = generateOrderId();
  const itemsSnapshot = dto.items.map((item) => {
    const variant = validation.items.find(
      (v) => v.variantId === item.variantId,
    );
    return {
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: variant?.unitPrice ?? 0,
    };
  });

  const total = itemsSnapshot.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0,
  );
  await OrderRepo.create({
    idCompra: compraId,
    email: dto.email,
    buyerName: dto.buyer.name,
    buyerPhone: dto.buyer.phone,
    shippingAddress: dto.shippingAddress,
    items: itemsSnapshot,
    total,
  });

  // 4. Create MP preference (items revalorized from DB)
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('MP_ACCESS_TOKEN no configurado');
  }

  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  const arrangedItems = dto.items.map((item) => {
    const variant = validation.items.find(
      (v) => v.variantId === item.variantId,
    );
    return {
      id: String(item.variantId),
      title: 'Producto Lute',
      quantity: item.quantity,
      unit_price: variant?.unitPrice ?? 0,
    };
  });

  const pr = await preference.create({
    body: {
      items: arrangedItems,
      back_urls: {
        success: process.env.PUBLIC_STOREFRONT_URL || 'http://localhost:3000',
        failure: process.env.PUBLIC_STOREFRONT_URL
          ? `${process.env.PUBLIC_STOREFRONT_URL}/failure`
          : 'http://localhost:3000/failure',
        pending: process.env.PUBLIC_STOREFRONT_URL
          ? `${process.env.PUBLIC_STOREFRONT_URL}/pending`
          : 'http://localhost:3000/pending',
      },
      auto_return: 'all',
      external_reference: String(compraId),
      metadata: {
        compraId,
      },
    },
  });

  return {
    orderId: compraId,
    paymentUrl: pr.init_point!,
  };
}

export default {
  checkout,
};