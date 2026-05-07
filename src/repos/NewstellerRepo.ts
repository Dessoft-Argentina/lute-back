
import {Newsteller, INewsteller } from "@src/models/Newsteller";

async function add(newsteller: INewsteller): Promise<void> {
  try {
    await Newsteller.create({
      id: newsteller.id,
        email: newsteller.email,
        nombre: newsteller.nombre,
        apellido: newsteller.apellido
    });

  } catch (error) {
    console.error("Error adding compra:", error);

  }
}

export default {
  add,
} as const; 