import { Router } from 'express';
import DropService from '@src/services/DropService';
import { IReq, IRes } from './types/express/misc';

const router = Router();

router.get('/active', async (_req: IReq, res: IRes) => {
  const result = await DropService.getActive();
  return res.status(200).json(result);
});

export default router;
