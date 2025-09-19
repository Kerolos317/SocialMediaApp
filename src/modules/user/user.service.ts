import { Response, Request } from "express";
import { 
    ILogoutDTO, 
    IUpdatePasswordDTO, 
    IUpdateEmailDTO, 
    ISendEmailWithTagsDTO, 
    IEnableTwoFactorDTO, 
    IVerifyTwoFactorDTO, 
    IDisableTwoFactorDTO 
} from "./user.dto";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { nanoid } from "nanoid";
import { emailEvent } from "../../utils/email/email.event";
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
import { successResponse } from "../../utils/response/success.response";

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
    dashboard = async (req: Request, res: Response): Promise<Response> => {
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
        const user = await this.userModel.findByIdAndUpdate({
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
        const user = await this.userModel.findByIdAndUpdate({
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
                _id: userId,
                freezedAt: { $exists: true },
            },
        });
        if (!user.deletedCount) {
            throw new NotFoundException("Fail to hardDelete account");
        }
        await deleteFolderByPrefix({ path: `users/${userId}` });
        return res.json({
            message: "Done",
        });
    };

    updateBasicInfo = async (
        req: Request,
        res: Response
    ): Promise<Response> => {
        if (req.body?.password || req.body?.email) {
            throw new BadRequestException("In-Valid Data");
        }

        const user = await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: req.body,
            options: { new: true },
        });

        if (user) return successResponse({ res, data: { user } });
        else throw new NotFoundException("user not found");
    };

    updatePassword = async (req: Request, res: Response): Promise<Response> => {
        const { oldPassword, password, flag }: IUpdatePasswordDTO = req.body;
        
        if (!await compareHash(oldPassword, req.user?.password as string)) {
            throw new BadRequestException("Invalid old password");
        }

        if (req.user?.oldPasswords?.length) {
            for (const hashPassword of req.user.oldPasswords) {
                if (await compareHash(password, hashPassword)) {
                    throw new BadRequestException("This password was used before");
                }
            }
        }

        let updatedData: UpdateQuery<IUser> = {};
        let statusCode = 200;

        switch (flag) {
            case "all":
                updatedData.changeCredentialTime = new Date();
                break;
            case "only":
                await createRevokeToken(req.decoded as any);
                statusCode = 201;
                break;
        }

        const user = await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: {
                password: await generateHash(password),
                ...updatedData,
                $push: { oldPasswords: req.user?.password }
            },
            options: { new: true }
        });

        if (!user) throw new NotFoundException("User not found");
        
        return res.status(statusCode).json({ message: "Password updated successfully" });
    };

    updateEmail = async (req: Request, res: Response): Promise<Response> => {
        const { email, password }: IUpdateEmailDTO = req.body;
        
        if (!await compareHash(password, req.user?.password as string)) {
            throw new BadRequestException("Invalid password");
        }

        const existingUser = await this.userModel.findOne({ filter: { email } });
        if (existingUser) {
            throw new BadRequestException("Email already exists");
        }

        const otp = nanoid(6);
        const user = await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: {
                email,
                confirmEmailOtp: otp,
                confirmAt: undefined
            },
            options: { new: true }
        });

        if (!user) throw new NotFoundException("User not found");

        emailEvent.emit("confirmEmail", {
            to: email,
            otp: otp
        });

        return successResponse({ res, message: "Email updated. Please check your new email for verification" });
    };

    sendEmailWithTags = async (req: Request, res: Response): Promise<Response> => {
        const { to, subject, message, tags }: ISendEmailWithTagsDTO = req.body;
        
        const emailContent = `
            <div>
                <h2>${subject}</h2>
                <p>${message}</p>
                ${tags?.length ? `<div><strong>Tags:</strong> ${tags.join(', ')}</div>` : ''}
                <hr>
                <p><small>Sent from ${process.env.APPLICATION_NAME}</small></p>
            </div>
        `;

        for (const email of to) {
            emailEvent.emit("sendCustomEmail", {
                to: email,
                subject,
                html: emailContent
            });
        }

        return successResponse({ res, message: "Emails sent successfully" });
    };

    enableTwoFactor = async (req: Request, res: Response): Promise<Response> => {
        const { password }: IEnableTwoFactorDTO = req.body;
        
        if (!await compareHash(password, req.user?.password as string)) {
            throw new BadRequestException("Invalid password");
        }

        if (req.user?.twoFactorEnabled) {
            throw new BadRequestException("Two-factor authentication is already enabled");
        }

        const secret = nanoid(32);
        const otp = nanoid(6);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        const user = await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: {
                twoFactorSecret: secret,
                twoFactorOtp: await generateHash(otp),
                twoFactorOtpExpires: otpExpires
            },
            options: { new: true }
        });

        if (!user) throw new NotFoundException("User not found");

        emailEvent.emit("twoFactorSetup", {
            to: req.user?.email,
            otp: otp
        });

        return successResponse({ res, message: "Two-factor setup initiated. Check your email for verification code" });
    };

    verifyTwoFactor = async (req: Request, res: Response): Promise<Response> => {
        const { otp }: IVerifyTwoFactorDTO = req.body;
        
        if (!req.user?.twoFactorOtp || !req.user?.twoFactorOtpExpires) {
            throw new BadRequestException("No two-factor setup in progress");
        }

        if (new Date() > req.user.twoFactorOtpExpires) {
            throw new BadRequestException("OTP expired");
        }

        if (!await compareHash(otp, req.user.twoFactorOtp)) {
            throw new BadRequestException("Invalid OTP");
        }

        const user = await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: {
                twoFactorEnabled: true,
                $unset: { twoFactorOtp: 1, twoFactorOtpExpires: 1 }
            },
            options: { new: true }
        });

        if (!user) throw new NotFoundException("User not found");

        return successResponse({ res, message: "Two-factor authentication enabled successfully" });
    };

    disableTwoFactor = async (req: Request, res: Response): Promise<Response> => {
        const { password, otp }: IDisableTwoFactorDTO = req.body;
        
        if (!await compareHash(password, req.user?.password as string)) {
            throw new BadRequestException("Invalid password");
        }

        if (!req.user?.twoFactorEnabled) {
            throw new BadRequestException("Two-factor authentication is not enabled");
        }

        const verificationOtp = nanoid(6);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: {
                twoFactorOtp: await generateHash(verificationOtp),
                twoFactorOtpExpires: otpExpires
            }
        });

        if (await compareHash(otp, await generateHash(verificationOtp))) {
            const user = await this.userModel.findByIdAndUpdate({
                id: req.decoded?._id,
                update: {
                    twoFactorEnabled: false,
                    $unset: { 
                        twoFactorSecret: 1, 
                        twoFactorOtp: 1, 
                        twoFactorOtpExpires: 1 
                    }
                },
                options: { new: true }
            });

            if (!user) throw new NotFoundException("User not found");

            return successResponse({ res, message: "Two-factor authentication disabled successfully" });
        } else {
            emailEvent.emit("twoFactorDisable", {
                to: req.user?.email,
                otp: verificationOtp
            });

            return successResponse({ res, message: "Verification code sent to your email" });
        }
    };

    //     export const updateBasicInfo = asyncHandler(async (req, res, next) => {
    //   if (req.body.phone) {
    //     req.body.phone = await generateEncryption({plaintext:req.body.phone})
    //   }
    //   const user = await DBService.findOneAndUpdate({
    //     model:UserModel,
    //     filter:{
    //       _id:req.user._id,
    //     },
    //     data:req.body

    //   })
    //     return user? successResponse({ res, data: { user } }):next(new Error("In-valid account", {cause:404}))
    // });

    // export const updatePassword = asyncHandler(async (req, res, next) => {
    //   const {oldPassword , password ,flag} = req.body;
    //   if (! await compareHash({plaintext:oldPassword , hashValue:req.user.password})) {
    //     return next(new Error("In-valid old password"))
    //   }

    //   if (req.user.oldPasswords?.length) {
    //     for (const hashPassword of req.user.oldPasswords) {
    //       if ( await compareHash({plaintext:password , hashValue:hashPassword})) {
    //     return next(new Error("this password is used before"))
    //   }
    //     }
    //   }
    //   let updatedData = {}
    //   switch (flag) {
    //     case logoutEnum.signoutFromAll:
    //       updatedData.changeCredentialsTime = new Date()
    //     case logoutEnum.signout:
    //       await createRevokeToken({req})
    //       status = 201
    //       break;

    //     default:

    //       break;
    //   }
    //   const user = await DBService.findOneAndUpdate({
    //     model:UserModel,
    //     filter:{
    //       _id:req.user._id,
    //     },
    //     data:{
    //       password: await generateHash({plaintext:password}),
    //       ...updatedData,
    //       $push: {oldPasswords : req.user.password}
    //     }

    //   })
    //     return user? successResponse({ res, data: { user } }):next(new Error("In-valid account", {cause:404}))
    // });
}

export default new UserService();
