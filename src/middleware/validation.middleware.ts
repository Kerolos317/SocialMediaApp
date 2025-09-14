import type { NextFunction, Request, Response } from "express";
import type { ZodError, ZodType } from "zod";
import { BadRequestException } from "../utils/response/error.response";
import { z } from "zod";

type KeyReqType = keyof Request;
type SchemaType = Partial<Record<KeyReqType, ZodType>>;
type ValidationErrorsType = Array<{
    key: KeyReqType;
    issues: Array<{
        message: string;
        path: string | number | symbol | undefined;
    }>;
}>;

export const validation = (schema: SchemaType) => {
    return (req: Request, res: Response, next: NextFunction): NextFunction => {
        const validationErrors: ValidationErrorsType = [];
        for (const key of Object.keys(schema) as KeyReqType[]) {
            if (!schema[key]) {
                continue;
            }
            const validationResult = schema[key].safeParse(req[key]);

            if (!validationResult.success) {
                const errors = validationResult.error as ZodError;
                validationErrors.push({
                    key,
                    issues: errors.issues.map((issue) => {
                        return { message: issue.message, path: issue.path[0] };
                    }),
                });
            }

            if (validationErrors.length)
                throw new BadRequestException("validation Error", {
                    validationErrors,
                });
        }

        return next() as unknown as NextFunction;
    };
};

export const generalFields = {
    username: z
        .string({ error: "username is require" })
        .min(2, { error: "min username length is 2 char" })
        .max(20, { error: "min username length is 20 char" }),
    email: z.email({ error: "valid email must be like example@domain.com" }),
    password: z
        .string()
        .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    confirmPassword: z.string(),
    otp: z.string().regex(/^\d{6}$/),
};
