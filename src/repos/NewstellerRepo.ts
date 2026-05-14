
import {Newsteller, INewsteller } from "@src/models/Newsteller";

async function add(newsteller: INewsteller): Promise<void> {
  console.log("Adding newsteller:", newsteller);
  try {
    await Newsteller.create({
      id: newsteller.id,
        email: newsteller.email,
        nombre: newsteller.nombre,

    });

  } catch (error) {
    console.error("Error adding to newsteller:", error);

  }
}

export default {
  add,
} as const; 