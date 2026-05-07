import { IUser, Usuario } from '@src/models/User';
import { generateToken } from '@src/util/jwt';
import bcrypt from 'bcrypt';

// **** Functions **** //

/**
 * Get one user.
 */
async function getOne(id: number): Promise<IUser | null> {
  try {

    const usuario = await Usuario.findOne({
      where: {
        idUsuario: id
      }
    });


    return usuario ? usuario.toJSON() as IUser : null;

  } catch (error) {
    console.error("Error retrieving usuario:", error);
    return null;
  }
}


async function persists(id: number): Promise<boolean> {
  try {
    const usuario = await Usuario.findByPk(id);
    return !!usuario;

  } catch (error) {
    console.error("Error checking usuario existence:", error);
    return false; 
  }
}


async function getAll(): Promise<IUser[]> {
  try {
    
    const usuarios = await Usuario.findAll();
    return usuarios.map((usuario: { toJSON: () => IUser; }) => usuario.toJSON() as IUser);

  } catch (error) {
    console.error("Error retrieving usuarios:", error);
    return []; 
  }
}

async function add(usuario: IUser): Promise<string | void> {
  try {
    await Usuario.create({
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      direccion: usuario.direccion,
    });
  } catch (error) {
    console.error("Error adding usuario:", error);
  }
}


async function update(usuario: IUser): Promise<void> {
  try {
    await Usuario.update(usuario, {
      where: {
        idUsuario: usuario.idUsuario
      }
    });

  } catch (error) {
    console.error("Error updating usuario:", error);

  }
}


async function delete_(id: number): Promise<void> {
  try {
    
    await Usuario.destroy({
      where: {
        idUsuario: id
      }
    });

  } catch (error) {
    console.error("Error deleting usuario:", error);
   
  }
}


// **** Export default **** //

export default {
  getOne,
  persists,
  getAll,
  add,
  update,
  delete: delete_,
} as const;