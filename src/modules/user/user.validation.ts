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
        firstName:z.string().min(2).max(25).optional(),
        lastName:z.string().min(2).max(25).optional(),
        address:z.string().optional(),
        gender:z.enum(["male", "female"]).optional(),
    })
}

export const updatePassword = {
    body: z.object({
        oldPassword: z.string().min(6),
        password: z.string().min(6),
        flag: z.enum(["only", "all"]).default("only"),
    })
}

export const updateEmail = {
    body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
    })
}

export const sendEmailWithTags = {
    body: z.object({
        to: z.array(z.string().email()),
        subject: z.string(),
        message: z.string(),
        tags: z.array(z.string()).optional(),
    })
}

export const enableTwoFactor = {
    body: z.object({
        password: z.string().min(6),
    })
}

export const verifyTwoFactor = {
    body: z.object({
        otp: z.string().length(6),
    })
}

export const disableTwoFactor = {
    body: z.object({
        password: z.string().min(6),
        otp: z.string().length(6),
    })
}

