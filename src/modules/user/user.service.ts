import { Response, Request } from "express";
import { ILogoutDTO } from "./user.dto";
import {
    createLoginCredentials,
    createRevokeToken,
    LogoutEnum,
} from "../../utils/security/token.security";
import { Types, UpdateQuery } from "mongoose";
import {
    HUserDocument,
    IUser,
    RoleEnum,
    UserModel,
} from "../../DB/models/User.model";
import { UserRepository } from "../../DB/repository/user.repository";
import { JwtPayload } from "jsonwebtoken";
import {
    createPreSignedUploadLink,
    deleteFiles,
    deleteFolderByPrefix,
    uploadFiles,
    // uploadLargeFile,
} from "../../utils/multer/s3.config";
import { StorageEnum } from "../../utils/multer/cloud.multer";
import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "../../utils/response/error.response";
import { s3Event } from "../../utils/multer/s3.events";

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
        const {
            originalname,
            ContentType,
        }: { originalname: string; ContentType: string } = req.body;
        const { url, key } = await createPreSignedUploadLink({
            ContentType,
            originalname,
            path: `users/${req.decoded?._id}`,
        });
        const user = await this.userModel.findOneAndUpdate({
            id: req.decoded?._id,
            update: {
                profileImage: key,
                tempProfileImage: req.user?.profileImage,
            },
        });
        if (!user) {
            throw new BadRequestException("Fail to update profile image");
        }
        s3Event.emit("trackFileUpload", {
            Key: key,
            expiresIn: 30000,
            userId: req.decoded?._id,
            oldKey: req.user?.profileImage,
        });

        return res.json({
            message: "Done",
            data: {
                url,
                key,
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
        const user = await this.userModel.findOneAndUpdate({
            id: req.user?._id as Types.ObjectId,
            update: { coverImage: urls },
            options: { new: false },
        });
        if (user?.coverImages?.length) {
            await deleteFiles({
                urls: user.coverImages,
            });
        }
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

    freezeAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params;
        if (userId && req.user?.role != RoleEnum.Admin) {
            throw new ForbiddenException("not authorized account");
        }

        const user = await this.userModel.updateOne({
            filter: {
                _id: userId || req.decoded?._id,
                freezedAt: { $exists: false },
            },
            update: {
                freezedAt: new Date(),
                freezedBy: req.user?._id,
                changeCredentialTime: new Date(),
                $unset: { restoredAt: 1, restoredBy: 1 },
            },
        });
        if (!user.modifiedCount) {
            throw new NotFoundException("Fail to freeze account");
        }
        return res.json({
            message: "Done",
        });
    };

    hardDelete = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params;


        const user = await this.userModel.deleteOne({
            filter: {
                _id: userId ,
                freezedAt: { $exists: true },
            },
        });
        if (!user.deletedCount) {
            throw new NotFoundException("Fail to hardDelete account");
        }
        await deleteFolderByPrefix({path:`users/${userId}`})
        return res.json({
            message: "Done",
        });
    };
}

export default new UserService();
