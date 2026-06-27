import { Router } from 'express';
import Paths from '@src/common/Paths';
import MpRoutes from './MpRoutes';
import NewstellerRoutes from './NewstellerRoutes';
import ProductsRoutes from './ProductsRoutes';
import CartRoutes from './CartRoutes';
import CheckoutRoutes from './CheckoutRoutes';
import TrackingRoutes from './TrackingRoutes';
import AdminAuthRoutes from './AdminAuthRoutes';
import DropRoutes from './DropRoutes';
import { generalRateLimit, strictRateLimit } from '@src/middleware/rateLimit';

const apiRouter = Router();

const productsRouter = Router();
const mpRouter = Router();
const newstellerRouter = Router();
const cartRouter = Router();
const variantRouter = Router();
const checkoutRouter = Router();

// New public catalog routes (slug-based, drop-aware)
productsRouter.get(
  Paths.Products.List,
  ProductsRoutes.getAll,
);

productsRouter.get(
  Paths.Products.Detail,
  ProductsRoutes.getOne,
);

// Mercado Pago webhook (POST only; PUT legacy removed)
mpRouter.post(
  Paths.Mp.Post,
  MpRoutes.webhooks,
);

// Newsletter (public — landing page "no-drop")
newstellerRouter.post(
  Paths.Newsteller.Add,
  generalRateLimit,
  NewstellerRoutes.add,
);

// Cart routes (stage 02)
cartRouter.post(
  Paths.Cart.Validate,
  generalRateLimit,
  CartRoutes.validateCart,
);

// Variant stock endpoint
variantRouter.get(
  Paths.Variants.Stock,
  generalRateLimit,
  CartRoutes.getVariantStock,
);

// Checkout endpoints (stage 03)
checkoutRouter.post(
  Paths.Checkout.Create,
  strictRateLimit,
  CheckoutRoutes.createCheckout,
);

// Admin auth (stage 05)
apiRouter.use('/admin/auth', generalRateLimit, AdminAuthRoutes);

// Mount routers
apiRouter.use(Paths.Products.Base, productsRouter);
apiRouter.use(Paths.Mp.Base, mpRouter);
apiRouter.use(Paths.Newsteller.Base, newstellerRouter);
apiRouter.use(Paths.Cart.Base, cartRouter);
apiRouter.use(Paths.Variants.Base, variantRouter);
apiRouter.use(Paths.Checkout.Base, checkoutRouter);
apiRouter.use(Paths.Orders.Base, TrackingRoutes);
apiRouter.use(Paths.Drops.Base, DropRoutes);

export default apiRouter;
