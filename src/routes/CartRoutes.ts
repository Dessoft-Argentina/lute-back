import HttpStatusCodes from '@src/common/HttpStatusCodes';
import CartService, { CartItemInput } from '@src/services/CartService';
import ProductRepo from '@src/repos/ProductRepo';
import { IReq, IRes } from './types/express/misc';

async function validateCart(req: IReq, res: IRes) {
  const { items } = req.body as unknown as { items: CartItemInput[] };

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({
      error: 'Items must be a non-empty array',
    });
  }

  if (items.length > 50) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({
      error: 'Too many items (max 50)',
    });
  }

  for (const item of items) {
    if (!Number.isInteger(item.variantId) || item.variantId <= 0) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json({
        error: 'Each item must have a valid variantId (positive integer)',
      });
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json({
        error: 'Each item must have a valid quantity (positive integer)',
      });
    }
  }

  const result = await CartService.validate(items);
  return res.status(HttpStatusCodes.OK).json(result);
}

async function getVariantStock(req: IReq, res: IRes) {
  const id = parseInt(req.params.id, 10);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({
      error: 'Invalid variant id',
    });
  }

  const variant = await ProductRepo.getByVariantId(id);

  if (!variant) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({
      error: 'Variant not found',
    });
  }

  return res.status(HttpStatusCodes.OK).json({
    variantId: variant.id,
    available: variant.stock,
  });
}

export default {
  validateCart,
  getVariantStock,
};
