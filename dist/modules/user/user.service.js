"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const token_security_1 = require("../../utils/security/token.security");
const User_model_1 = require("../../DB/models/User.model");
const user_repository_1 = require("../../DB/repository/user.repository");
const s3_config_1 = require("../../utils/multer/s3.config");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const error_response_1 = require("../../utils/response/error.response");
const s3_events_1 = require("../../utils/multer/s3.events");
class UserService {
    userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    profile = async (req, res) => {
        return res.json({
            message: "Done",
            data: {
                user: req.user?._id,
                decoded: req.decoded?.iat,
            },
        });
    };
    profileImage = async (req, res) => {
        const { originalname, ContentType, } = req.body;
        const { url, key } = await (0, s3_config_1.createPreSignedUploadLink)({
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
            throw new error_response_1.BadRequestException("Fail to update profile image");
        }
        s3_events_1.s3Event.emit("trackFileUpload", {
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
    profileCoverImage = async (req, res) => {
        const urls = await (0, s3_config_1.uploadFiles)({
            storageApproach: cloud_multer_1.StorageEnum.disk,
            files: req.files,
            path: `users/${req.decoded?._id}/cover`,
            useLarge: true,
        });
        const user = await this.userModel.findOneAndUpdate({
            id: req.user?._id,
            update: { coverImage: urls },
            options: { new: false },
        });
        if (user?.coverImages?.length) {
            await (0, s3_config_1.deleteFiles)({
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
    logout = async (req, res) => {
        const { flag } = req.body;
        let statusCode = 200;
        const update = {};
        switch (flag) {
            case token_security_1.LogoutEnum.all:
                update.changeCredentialTime = new Date();
                break;
            default:
                await (0, token_security_1.createRevokeToken)(req.decoded);
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
    refreshToken = async (req, res) => {
        const credentials = await (0, token_security_1.createLoginCredentials)(req.user);
        await (0, token_security_1.createRevokeToken)(req.decoded);
        return res.status(201).json({
            message: "Token refreshed",
            data: credentials,
        });
    };
    freezeAccount = async (req, res) => {
        const { userId } = req.params;
        if (userId && req.user?.role != User_model_1.RoleEnum.Admin) {
            throw new error_response_1.ForbiddenException("not authorized account");
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
            throw new error_response_1.NotFoundException("Fail to freeze account");
        }
        return res.json({
            message: "Done",
        });
    };
    hardDelete = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.deleteOne({
            filter: {
                _id: userId,
                freezedAt: { $exists: true },
            },
        });
        if (!user.deletedCount) {
            throw new error_response_1.NotFoundException("Fail to hardDelete account");
        }
        await (0, s3_config_1.deleteFolderByPrefix)({ path: `users/${userId}` });
        return res.json({
            message: "Done",
        });
    };
}
exports.default = new UserService();
