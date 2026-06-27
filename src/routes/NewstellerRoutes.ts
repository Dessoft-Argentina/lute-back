import HttpStatusCodes from '@src/common/HttpStatusCodes';
import NewstellerService from '@src/services/NewstellerService';
import { IReq, IRes } from './types/express/misc';

async function add(req: IReq<Record<string, unknown>>, res: IRes) {
  const { email, nombre } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'Email requerido' });
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedEmail.length > 254) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'Email demasiado largo' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'Formato de email invalido' });
  }

  const name = typeof nombre === 'string' ? nombre.trim().slice(0, 255) : '';

  const created = await NewstellerService.addOne({
    id: 0,
    email: trimmedEmail,
    nombre: name,
  });

  if (!created) {
    return res.status(HttpStatusCodes.OK).json({ message: 'El email ya esta registrado' });
  }

  return res.status(HttpStatusCodes.CREATED).end();
}

export default {
  add,
} as const;
