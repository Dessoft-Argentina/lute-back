import ProductRepo from '@src/repos/ProductRepo';

export interface CartItemInput {
  variantId: number;
  quantity: number;
}

export interface CartItemResult {
  variantId: number;
  requested: number;
  available: number;
  unitPrice: number | null;
  valid: boolean;
  adjusted: boolean;
  reason?: string;
}

export interface CartValidateResult {
  items: CartItemResult[];
  total: number;
  currency: string;
}

async function validate(items: CartItemInput[]): Promise<CartValidateResult> {
  const ids = items.map((i) => i.variantId);
  const variantRows = await ProductRepo.getVariantsByIds(ids);

  const variantMap = new Map<number, Record<string, unknown>>();
  for (const v of variantRows) {
    variantMap.set(Number(v.id), v);
  }

  let total = 0;
  const results: CartItemResult[] = [];

  for (const item of items) {
    const variant = variantMap.get(item.variantId);

    if (!variant) {
      results.push({
        variantId: item.variantId,
        requested: item.quantity,
        available: 0,
        unitPrice: null,
        valid: false,
        adjusted: false,
        reason: 'not_found',
      });
      continue;
    }

    const product = variant.product as Record<string, unknown>;
    const stock = Number(variant.stock);
    const isActive = product?.isActive !== false;

    if (!isActive) {
      results.push({
        variantId: item.variantId,
        requested: item.quantity,
        available: 0,
        unitPrice: null,
        valid: false,
        adjusted: false,
        reason: 'inactive',
      });
      continue;
    }

    const basePrice = Number(product?.basePrice || 0);
    const priceOverride = variant.priceOverride
      ? Number(variant.priceOverride)
      : null;
    const unitPrice = priceOverride ?? basePrice;

    const available = Math.min(item.quantity, stock);
    const adjusted = available < item.quantity;

    if (stock === 0) {
      results.push({
        variantId: item.variantId,
        requested: item.quantity,
        available: 0,
        unitPrice: null,
        valid: false,
        adjusted: false,
        reason: 'out_of_stock',
      });
      continue;
    }

    total += unitPrice * available;

    results.push({
      variantId: item.variantId,
      requested: item.quantity,
      available,
      unitPrice,
      valid: true,
      adjusted,
    });
  }

  return { items: results, total, currency: 'ARS' };
}

export default {
  validate,
};
