import { z } from "zod";
import { LogoutEnum } from "../../utils/security/token.security";
import { Types } from "mongoose";

export const logout = {
    body: z.strictObject({
        flag: z.enum(LogoutEnum).default(LogoutEnum.only),
    }),
};

export const freezeAccount = {
    params: z.object({
        userId: z.string().optional(),
    }).refine((data) => {
      return data?.userId ? Types.ObjectId.isValid(data.userId) : true;
    } , {error:"invalid objectId format" , path:["userId"]})
        
};
export const hardDelete = {
    params: z.strictObject({
        userId: z.string(),
    }).refine((data) => {
      return data.userId ? Types.ObjectId.isValid(data.userId) : true;
    } , {error:"invalid objectId format" , path:["userId"]})
        
};


export const updateBasicInfo = {
    body:z.object({
        username:z.string().optional(),
        phone:z.string().optional(),
        email:z.string().optional(),
        
    })
}

