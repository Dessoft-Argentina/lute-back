import { Request as IReq, Response as IRes,  NextFunction as INext } from "express";
import UserRepo from "@src/repos/UserRepo";
import { IUser } from "@src/models/User";


export const isAdmin = async (req: IReq, res: IRes, next: INext) => {
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    var id: number;
    var user: IUser | null;
    if(token) {
        const data = atob(token.split('.')[1]);
        id = JSON.parse(data).data;
        user = await UserRepo.getOne(id);
        
    } else {
        res.status(401).send({message: "Unauthorized"});
    }

    
    
    
}