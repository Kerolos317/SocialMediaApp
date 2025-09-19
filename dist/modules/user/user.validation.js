"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableTwoFactor = exports.verifyTwoFactor = exports.enableTwoFactor = exports.sendEmailWithTags = exports.updateEmail = exports.updatePassword = exports.updateBasicInfo = exports.hardDelete = exports.freezeAccount = exports.logout = void 0;
const zod_1 = require("zod");
const token_security_1 = require("../../utils/security/token.security");
const mongoose_1 = require("mongoose");
exports.logout = {
    body: zod_1.z.strictObject({
        flag: zod_1.z.enum(token_security_1.LogoutEnum).default(token_security_1.LogoutEnum.only),
    }),
};
exports.freezeAccount = {
    params: zod_1.z.object({
        userId: zod_1.z.string().optional(),
    }).refine((data) => {
        return data?.userId ? mongoose_1.Types.ObjectId.isValid(data.userId) : true;
    }, { error: "invalid objectId format", path: ["userId"] })
};
exports.hardDelete = {
    params: zod_1.z.strictObject({
        userId: zod_1.z.string(),
    }).refine((data) => {
        return data.userId ? mongoose_1.Types.ObjectId.isValid(data.userId) : true;
    }, { error: "invalid objectId format", path: ["userId"] })
};
exports.updateBasicInfo = {
    body: zod_1.z.object({
        username: zod_1.z.string().optional(),
        phone: zod_1.z.string().optional(),
        firstName: zod_1.z.string().min(2).max(25).optional(),
        lastName: zod_1.z.string().min(2).max(25).optional(),
        address: zod_1.z.string().optional(),
        gender: zod_1.z.enum(["male", "female"]).optional(),
    })
};
exports.updatePassword = {
    body: zod_1.z.object({
        oldPassword: zod_1.z.string().min(6),
        password: zod_1.z.string().min(6),
        flag: zod_1.z.enum(["only", "all"]).default("only"),
    })
};
exports.updateEmail = {
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(6),
    })
};
exports.sendEmailWithTags = {
    body: zod_1.z.object({
        to: zod_1.z.array(zod_1.z.string().email()),
        subject: zod_1.z.string(),
        message: zod_1.z.string(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
    })
};
exports.enableTwoFactor = {
    body: zod_1.z.object({
        password: zod_1.z.string().min(6),
    })
};
exports.verifyTwoFactor = {
    body: zod_1.z.object({
        otp: zod_1.z.string().length(6),
    })
};
exports.disableTwoFactor = {
    body: zod_1.z.object({
        password: zod_1.z.string().min(6),
        otp: zod_1.z.string().length(6),
    })
};
