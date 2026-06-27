import { Product } from "./Product";
import { ProductVariant } from "./ProductVariant";
import { ProductImage } from "./ProductImage";
import { Payment } from "./Payment";
import { AdminUser } from "./AdminUser";
import { AuditLog } from "./AuditLog";
import { Drop } from "./Drop";

export function defineAssociations() {
    Product.hasMany(ProductVariant, {foreignKey: 'product_id', as: 'variants'});
    ProductVariant.belongsTo(Product, {foreignKey: 'product_id', as: 'product'});
    Product.hasMany(ProductImage, {foreignKey: 'product_id', as: 'images'});
    ProductImage.belongsTo(Product, {foreignKey: 'product_id', as: 'product'});
}
