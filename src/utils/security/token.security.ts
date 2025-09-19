import { v4 as uuidv4 } from "uuid";
import { JwtPayload, Secret, sign, SignOptions, verify } from "jsonwebtoken";
import { HUserDocument, RoleEnum, UserModel } from "../../DB/models/User.model";
import {
    BadRequestException,
    UnauthorizedException,
} from "../response/error.response";
import { HTokenDocument, TokenModel } from "../../DB/models/Token.model";
import { TokenRepository , UserRepository } from "../../DB/repository";

export enum SignatureLevelEnum {
    Bearer = "Bearer",
    System = "System",
}

export enum TokenEnum {
    access = "access",
    refresh = "refresh",
}
export enum LogoutEnum {
    only = "only",
    all = "all",
}

export const generateToken = async ({
    payload,
    secret = process.env.ACCESS_TOKEN_SIGNATURE as string,
    options = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) },
}: {
    payload: object;
    secret?: Secret;
    options?: SignOptions;
}): Promise<string> => {
    return sign(payload, secret, options);
};

export const verifyToken = async ({
    token,
    secret = process.env.ACCESS_TOKEN_SIGNATURE as string,
}: {
    token: string;
    secret?: Secret;
}): Promise<JwtPayload> => {
    return verify(token, secret) as JwtPayload;
};

export const detectSignatureLevel = async (
    role: RoleEnum = RoleEnum.User
): Promise<SignatureLevelEnum> => {
    let signatureLevel: SignatureLevelEnum = SignatureLevelEnum.Bearer;
    switch (role) {
        case RoleEnum.Admin:
        case RoleEnum.superAdmin:
            signatureLevel = SignatureLevelEnum.System;
            break;
        default:
            signatureLevel = SignatureLevelEnum.Bearer;
    }
    return signatureLevel;
};

export const getSignatureLevel = async (
    signatureLevel: SignatureLevelEnum = SignatureLevelEnum.Bearer
): Promise<{ access_signature: string; refresh_signature: string }> => {
    let signatures: { access_signature: string; refresh_signature: string } = {
        access_signature: "",
        refresh_signature: "",
    };
    switch (signatureLevel) {
        case SignatureLevelEnum.System:
            signatures.access_signature = process.env
                .ACCESS_SYSTEM_TOKEN_SIGNATURE as string;
            signatures.refresh_signature = process.env
                .REFRESH_SYSTEM_TOKEN_SIGNATURE as string;
            break;
        default:
            signatures.access_signature = process.env
                .ACCESS_USER_TOKEN_SIGNATURE as string;
            signatures.refresh_signature = process.env
                .REFRESH_USER_TOKEN_SIGNATURE as string;
    }
    return signatures;
};

export const createLoginCredentials = async (user: HUserDocument) => {
    const signatureLevel = await detectSignatureLevel(user.role);
    const signatures = await getSignatureLevel(signatureLevel);

    const jwtId = uuidv4();
    const accessToken = await generateToken({
        payload: { _id: user._id },
        secret: signatures.access_signature,
        options: {
            expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN),
            jwtid: jwtId,
        },
    });

    const refreshToken = await generateToken({
        payload: { _id: user._id },
        secret: signatures.refresh_signature,
        options: {
            expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
            jwtid: jwtId,
        },
    });

    return {
        accessToken,
        refreshToken,
    };
};

export const decodeToken = async ({
    authorization,
    tokenType = TokenEnum.access,
}: {
    authorization: string;
    tokenType?: TokenEnum;
}) => {
    const userModel = new UserRepository(UserModel);
    const tokenModel = new TokenRepository(TokenModel);
    const [bearerKey, token] = authorization.split(" ");
    if (!bearerKey || !token) {
        throw new UnauthorizedException("missing token parts");
    }

    const signatures = await getSignatureLevel(bearerKey as SignatureLevelEnum);
    const decoded = await verifyToken({
        token,
        secret:
            tokenType === TokenEnum.refresh
                ? signatures.refresh_signature
                : signatures.access_signature,
    });

    if (!decoded?._id || !decoded?.iat) {
        throw new BadRequestException("Invalid token");
    }
    if (await tokenModel.findOne({ filter: { jti: decoded.jti } })) {
        throw new UnauthorizedException("Invalid or old login credential");
    }

    const user = await userModel.findOne({ filter: { _id: decoded._id } });
    if (!user) {
        throw new BadRequestException("not register account");
    }

    if (user.changeCredentialTime?.getTime() || 0 > decoded.iat * 1000) {
        throw new UnauthorizedException("Invalid or old login credential");
    }
    return { user, decoded };
};

export const createRevokeToken = async (decoded: JwtPayload): Promise<HTokenDocument> => {
    const tokenModel = new TokenRepository(TokenModel);

    const [result] = (await tokenModel.create({
        data: [
            {
                jti: decoded.jti as string,
                expiresIn:
                    (decoded.iat as number) +
                    Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
                userId: decoded._id,
            },
        ],
    })) || [];

    if (!result) {
        throw new BadRequestException("Failed to create revoke token");
    }
    return result;
};
