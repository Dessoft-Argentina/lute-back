import { Op, Transaction } from 'sequelize';
import { sequelize } from '@src/database';
import { Product, IProduct } from '@src/models/Product';
import { ProductVariant } from '@src/models/ProductVariant';
import { ProductImage } from '@src/models/ProductImage';

export interface ProductListFilters {
  category?: string;
  tag?: string;
  q?: string;
  featured?: boolean;
  dropId?: number | null;
  isActive?: boolean;
}

export interface ProductListPagination {
  page: number;
  limit: number;
}

export interface ProductListResult {
  rows: IProduct[];
  count: number;
}

async function list(
  filters: ProductListFilters,
  pagination: ProductListPagination,
): Promise<ProductListResult> {
  const where: Record<string, unknown> = {};

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  if (filters.dropId !== undefined) {
    where.dropId = filters.dropId;
  }
  if (filters.category) {
    where.category = filters.category;
  }
  if (filters.featured !== undefined) {
    where.isFeatured = filters.featured;
  }
  if (filters.tag) {
    where.tags = { [Op.contains]: [filters.tag] };
  }
  if (filters.q) {
    where.name = { [Op.iLike]: `%${filters.q}%` };
  }

  const offset = (pagination.page - 1) * pagination.limit;

  const result = await Product.findAndCountAll({
    where,
    include: [
      { model: ProductVariant, as: 'variants', required: false },
      { model: ProductImage, as: 'images', required: false },
    ],
    offset,
    limit: pagination.limit,
    order: [['created_at', 'DESC']],
    distinct: true,
  });

  const rows = result.rows.map((r) => {
    const json = r.toJSON();
    return json as unknown as IProduct;
  });

  return { rows, count: result.count };
}

async function getBySlug(slug: string): Promise<IProduct | null> {
  const product = await Product.findOne({
    where: { slug },
    include: [
      { model: ProductVariant, as: 'variants', required: false },
      { model: ProductImage, as: 'images', required: false },
    ],
  });

  return product ? (product.toJSON() as unknown as IProduct) : null;
}

async function getById(id: number): Promise<IProduct | null> {
  const product = await Product.findByPk(id, {
    include: [
      { model: ProductVariant, as: 'variants', required: false },
      { model: ProductImage, as: 'images', required: false },
    ],
  });

  return product ? (product.toJSON() as unknown as IProduct) : null;
}

async function getVariantsByIds(ids: number[]): Promise<Record<string, unknown>[]> {
  const variants = await ProductVariant.findAll({
    where: { id: ids },
    include: [{ model: Product, as: 'product', required: true }],
  });

  return variants.map((v) => v.toJSON() as Record<string, unknown>);
}

async function persistsBySlug(slug: string): Promise<boolean> {
  const count = await Product.count({ where: { slug } });
  return count > 0;
}

async function getByVariantId(id: number): Promise<Record<string, unknown> | null> {
  const variant = await ProductVariant.findByPk(id, {
    include: [{ model: Product, as: 'product', required: true }],
  });

  return variant ? (variant.toJSON() as Record<string, unknown>) : null;
}

export interface ReserveItem {
  variantId: number;
  quantity: number;
}

export interface ReserveResult {
  success: boolean;
  failedItems: { variantId: number; reason: string }[];
}

async function reserveStock(items: ReserveItem[]): Promise<ReserveResult> {
  const t = await sequelize.transaction();
  try {
    const failedItems: { variantId: number; reason: string }[] = [];

    for (const item of items) {
      const variant = await ProductVariant.findByPk(item.variantId, {
        transaction: t,
        lock: Transaction.LOCK.UPDATE,
      });

      if (!variant) {
        failedItems.push({ variantId: item.variantId, reason: 'not_found' });
        continue;
      }

      const stock = variant.getDataValue('stock') as number;
      if (stock < item.quantity) {
        failedItems.push({ variantId: item.variantId, reason: 'insufficient_stock' });
        continue;
      }

      await variant.update({ stock: stock - item.quantity }, { transaction: t });
    }

    if (failedItems.length > 0) {
      await t.rollback();
      return { success: false, failedItems };
    }

    await t.commit();
    return { success: true, failedItems: [] };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function restoreStock(items: ReserveItem[]): Promise<void> {
  const t = await sequelize.transaction();
  try {
    for (const item of items) {
      const variant = await ProductVariant.findByPk(item.variantId, {
        transaction: t,
        lock: Transaction.LOCK.UPDATE,
      });

      if (variant) {
        const stock = variant.getDataValue('stock') as number;
        await variant.update({ stock: stock + item.quantity }, { transaction: t });
      }
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

export default {
  list,
  getBySlug,
  getById,
  getVariantsByIds,
  persistsBySlug,
  getByVariantId,
  reserveStock,
  restoreStock,
};
