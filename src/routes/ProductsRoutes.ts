import HttpStatusCodes from '@src/common/HttpStatusCodes';
import ProductService from '@src/services/ProductService';
import { IReq, IRes } from './types/express/misc';

async function getAll(req: IReq, res: IRes) {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(
    48, Math.max(1, parseInt(req.query.limit as string, 10) || 24),
  );
  const category = req.query.category as string | undefined;
  const tag = req.query.tag as string | undefined;
  const q = req.query.q as string | undefined;
  const featured = req.query.featured === 'true' ? true : undefined;

  const { items, page: p, limit: l, total } = await ProductService.listPublic(
    { category, tag, q, featured },
    { page, limit },
  );

  return res.status(HttpStatusCodes.OK).json({ items, page: p, limit: l, total });
}

async function getOne(req: IReq, res: IRes) {
  const { slug } = req.params;
  const product = await ProductService.getPublicBySlug(slug);
  return res.status(HttpStatusCodes.OK).json(product);
}

export default {
  getAll,
  getOne,
};
