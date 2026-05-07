import { IProducto, Producto } from '@src/models/Producto';

// **** Functions **** //

/**
 * Get one user.
 */

async function getOne(id: number): Promise<IProducto | null> {
  try {

    const producto = await Producto.findOne({
      where: {
        idProducto: id
      }
    });


    return producto ? producto.toJSON() as IProducto : null;

  } catch (error) {
    console.error("Error retrieving producto:", error);
    return null;
  }
}


async function persists(id: number): Promise<boolean> {
  try {
    const producto = await Producto.findByPk(id);
    return !!producto;

  } catch (error) {
    console.error("Error checking producto existence:", error);
    return false; 
  }
}


async function getAll(): Promise<IProducto[]> {
  try {
    
    const productos = await Producto.findAll();
    return productos.map((producto: { toJSON: () => IProducto; }) => producto.toJSON() as IProducto);

  } catch (error) {
    console.error("Error retrieving productos:", error);
    return []; 
  }
}


async function add(producto: IProducto): Promise<void> {
  try {
    await Producto.create({
      
      idProducto: producto.idProducto,
      nombre: producto.nombre,
      color: producto.color,
      precio: producto.precio,
      stock: producto.stock,
      
    });

  } catch (error) {
    console.error("Error adding producto:", error);

  }
}

async function update(producto: IProducto): Promise<void> {
  try {

    await Producto.update(producto, {
      where: {
        idProducto: producto.idProducto
      }
    });

  } catch (error) {
    console.error("Error updating producto:", error);

  }
}

async function descontarStock(id: number, quantity: number): Promise<void> {
  const data = await Producto.findByPk(id);
  const producto :IProducto = data.dataValues;
  producto.stock -= quantity;

  
  try {

    await Producto.update(producto, {
      where: {
        idProducto: producto.idProducto
      }
    });

  } catch (error) {
    console.error("Error updating producto:", error);

  }
}

async function updateStock(id: number, quantity: number): Promise<void> {
  const data = await Producto.findByPk(id);
  const producto :IProducto = data.dataValues;

  producto.stock += quantity;

  try {
    await Producto.update(producto, {
      where: {
        idProducto: producto.idProducto
      }
    });

  } catch (error) {
    console.error("Error updating producto:", error);

  }
}


async function delete_(id: number): Promise<void> {
  try {
    
    await Producto.destroy({
      where: {
        idProducto: id
      }
    });

  } catch (error) {
    console.error("Error deleting producto:", error);
   
  }
}

// Función para obtener un producto por sus especificaciones
async function getProductBySpecs(nombre: string, storage: number, color: string, ram: number): Promise<IProducto | null> {
  
  try {
    const result = await Producto.findOne({
      where: {
        nombre: nombre,
        almacenamiento : storage,
        color : color,
        ram : ram
      }
    });
    
    return result;
  } 
  catch (error) {
    console.error('Error al obtener el producto por especificaciones:', error);
    throw new Error('Error en la base de datos');
  }
};


// **** Export default **** //

export default {
  getOne,
  persists,
  getAll,
  add,
  update,
  delete: delete_,
  descontarStock,
  updateStock, 
  getProductBySpecs
} as const;