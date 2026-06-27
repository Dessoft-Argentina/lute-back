import HttpStatusCodes from '@src/common/HttpStatusCodes';
import RouteError from '@src/common/RouteError';
import ProductRepo, { ProductListFilters, ProductListPagination } from '@src/repos/ProductRepo';
import DropService from '@src/services/DropService';
import { IProduct, IProductDTO, IProductVariantDTO, IProductImageDTO } from '@src/models/Product';

export const PRODUCT_NOT_FOUND_ERR = 'Product not found';

interface ProductWithRelations extends IProduct {
  variants?: Array<{
    id: number;
    size: string;
    color: string;
    sku: string;
    stock: number;
    priceOverride: number;
  }>;
  images?: Array<{
    url: string;
    alt: string;
    position: number;
  }>;
}

function getEffectivePrice(
  basePrice: number,
  priceOverride: number | null,
): number {
  return priceOverride ?? basePrice;
}

function toDTO(raw: IProduct): IProductDTO {
  const product = raw as unknown as ProductWithRelations;

  const variants: IProductVariantDTO[] = (product.variants || []).map((v) => ({
    id: v.id,
    size: v.size || null,
    color: v.color || null,
    sku: v.sku,
    stock: v.stock,
    price: getEffectivePrice(Number(product.basePrice), v.priceOverride),
    available: v.stock > 0,
  }));

  const images: IProductImageDTO[] = (product.images || []).map((img) => ({
    url: img.url,
    alt: img.alt || null,
    position: img.position,
  }));

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    tags: product.tags,
    basePrice: Number(product.basePrice),
    currency: 'ARS',
    isFeatured: product.isFeatured,
    images,
    variants,
  };
}

async function listPublic(
  filters: ProductListFilters,
  pagination: ProductListPagination,
): Promise<{ items: IProductDTO[]; page: number; limit: number; total: number }> {
  const activeDropId = await getActiveDropId();

  const dbFilters: ProductListFilters = {
    ...filters,
    isActive: true,
    dropId: activeDropId,
  };

  const result = await ProductRepo.list(dbFilters, pagination);

  return {
    items: result.rows.map(toDTO),
    page: pagination.page,
    limit: pagination.limit,
    total: result.count,
  };
}

async function getPublicBySlug(slug: string): Promise<IProductDTO> {
  const product = await ProductRepo.getBySlug(slug);

  if (!product || !product.isActive) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, PRODUCT_NOT_FOUND_ERR);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return toDTO(product);
}

async function getActiveDropId(): Promise<number | null> {
  return DropService.getActiveDropId();
}

export default {
  listPublic,
  getPublicBySlug,
};
