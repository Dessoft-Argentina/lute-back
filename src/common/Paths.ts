export default {
  Base: '/',
  Products: {
    Base: '/products',
    List: '/',
    Detail: '/:slug',
  },
  Mp: {
    Base: '/pagos',
    Post: '/',
  },
  Newsteller: {
    Base: '/newsteller',
    Add: '/',
  },
  Cart: {
    Base: '/cart',
    Validate: '/validate',
  },
  Variants: {
    Base: '/variants',
    Stock: '/:id/stock',
  },
  Checkout: {
    Base: '/checkout',
    Create: '/',
  },
  Orders: {
    Base: '/orders',
  },
  Drops: {
    Base: '/drops',
    Active: '/active',
  },
} as const;
