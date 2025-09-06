import { Response, Request } from "express";
import { ILogoutDTO } from "./user.dto";
import {
    createLoginCredentials,
    createRevokeToken,
    LogoutEnum,
} from "../../utils/security/token.security";
import { UpdateQuery } from "mongoose";
import { HUserDocument, IUser, UserModel } from "../../DB/models/User.model";
import { UserRepository } from "../../DB/repository/user.repository";
import { JwtPayload } from "jsonwebtoken";
import { uploadFiles, uploadLargeFile } from "../../utils/multer/s3.config";
import { StorageEnum } from "../../utils/multer/cloud.multer";

class UserService {
    private userModel = new UserRepository(UserModel);
    constructor() {}

    profile = async (req: Request, res: Response): Promise<Response> => {
        return res.json({
            message: "Done",
            data: {
                user: req.user?._id,
                decoded: req.decoded?.iat,
            },
        });
    };

    profileImage = async (req: Request, res: Response): Promise<Response> => {
        const Key = await uploadLargeFile({
            storageApproach: StorageEnum.disk,
            file: req.file as Express.Multer.File,
            path: `users/${req.decoded?._id}`,
        });
        return res.json({
            message: "Done",
            data: {
                file: Key,
            },
        });
    };

    profileCoverImage = async (
        req: Request,
        res: Response
    ): Promise<Response> => {
        const urls = await uploadFiles({
            storageApproach: StorageEnum.disk,
            files: req.files as Express.Multer.File[],
            path: `users/${req.decoded?._id}/cover`,
            useLarge: true,
        });
        return res.json({
            message: "Done",
            data: {
                file: urls,
            },
        });
    };

    logout = async (req: Request, res: Response): Promise<Response> => {
        const { flag }: ILogoutDTO = req.body;
        let statusCode: number = 200;

        const update: UpdateQuery<IUser> = {};
        switch (flag) {
            case LogoutEnum.all:
                update.changeCredentialTime = new Date();
                break;
            default:
                await createRevokeToken(req.decoded as JwtPayload);

                statusCode = 201;
                break;
        }

        await this.userModel.updateOne({
            filter: { _id: req.decoded?._id },
            update,
        });
        return res.status(statusCode).json({
            message: "Done",
        });
    };

    refreshToken = async (req: Request, res: Response): Promise<Response> => {
        const credentials = await createLoginCredentials(
            req.user as HUserDocument
        );
        await createRevokeToken(req.decoded as JwtPayload);

        return res.status(201).json({
            message: "Token refreshed",
            data: credentials,
        });
    };
}

export default new UserService();
