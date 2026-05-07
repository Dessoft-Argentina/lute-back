import HttpStatusCodes from '@src/common/HttpStatusCodes';
import NewstellerService from '@src/services/NewstellerService';
import { IReq, IRes } from './types/express/misc';
import { INewsteller } from '@src/models/Newsteller';
import e from 'express';

async function add(req: IReq<INewsteller>, res: IRes) {
  const newsteller = req.body;
  await NewstellerService.addOne(newsteller);
  return res.status(HttpStatusCodes.CREATED).end();
}

export default {
  add,
} as const;