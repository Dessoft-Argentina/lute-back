/**
 * Express router paths go here.
 */

import Newsteller from "@src/models/Newsteller";


export default {
  Base: '/',
  Users: {
    Base: '/usuario',
    Get: '/',
    GetOne: '/:id',
    Add: '/',
    Update: '/:id',
    Delete: '/:id',
  },
  Auth: {
    Base: '/auth',
    Login: '/',
    Verify: '/verify',
  },
  Productos: {
    Base: '/producto',
    Get: '/',
    GetOne: '/:id',
    idBySpecs: '/idBySpecs',
    updateStock:'/updateStock',
    Add: '/',
    Update: '/:id',
    Delete: '/:id',
  },
  Compras: {
    Base: '/compra',
    Get: '/',
    GetOne: '/:id',
    Add: '/',
    Update: '/:id',
    Delete: '/:id',
  },
  Producto_has_Compra: {
    Base: '/prodHasComp',
    Get: '/',
    GetOne: '/:id',
    Add: '/',
    Delete: '/:id',
  },
  Mp: {
    Base: '/pagos',
    Post: '/',
  },
  Newsteller: {
    Base: '/newsteller',
    Add: '/',
  }  

} as const;
