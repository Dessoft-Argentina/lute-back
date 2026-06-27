import { INewsteller } from "@src/models/Newsteller";
import NewstellerRepo from "@src/repos/NewstellerRepo";

function addOne(newsteller: INewsteller): Promise<boolean> {
  return NewstellerRepo.add(newsteller);
}

export default {
  addOne,
} as const; 