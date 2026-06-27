import { Router } from 'express';
import HttpStatusCodes from '@src/common/HttpStatusCodes';
import AuthService from '@src/services/AuthService';
import { IReq, IRes } from './types/express/misc';

const router = Router();

router.post('/login', async (req: IReq, res: IRes) => {
  const { email, password } = req.body as unknown as {
    email: string;
    password: string;
  };

  if (!email || !password) {
    return res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: 'Email y password requeridos' });
  }

  try {
    const result = await AuthService.loginAdmin(email, password);
    return res.status(HttpStatusCodes.OK).json(result);
  } catch (_e) {
    return res
      .status(HttpStatusCodes.UNAUTHORIZED)
      .json({ error: 'Credenciales invalidas' });
  }
});

export default router;
