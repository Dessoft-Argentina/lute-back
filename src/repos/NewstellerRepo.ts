import {Newsteller, INewsteller } from "@src/models/Newsteller";

async function add(newsteller: INewsteller): Promise<boolean> {
  const [, created] = await Newsteller.findOrCreate({
    where: { email: newsteller.email },
    defaults: {
      email: newsteller.email,
      nombre: newsteller.nombre,
    },
  });
  return created;
}

export default {
  add,
} as const;
