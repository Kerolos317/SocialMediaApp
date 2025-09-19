"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hash_security_1 = require("../../utils/security/hash.security");
const nanoid_1 = require("nanoid");
const email_event_1 = require("../../utils/email/email.event");
const token_security_1 = require("../../utils/security/token.security");
const User_model_1 = require("../../DB/models/User.model");
const user_repository_1 = require("../../DB/repository/user.repository");
const s3_config_1 = require("../../utils/multer/s3.config");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const error_response_1 = require("../../utils/response/error.response");
const s3_events_1 = require("../../utils/multer/s3.events");
const success_response_1 = require("../../utils/response/success.response");
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
    dashboard = async (req, res) => {
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
        const user = await this.userModel.findByIdAndUpdate({
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
        const user = await this.userModel.findByIdAndUpdate({
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
    updateBasicInfo = async (req, res) => {
        if (req.body?.password || req.body?.email) {
            throw new error_response_1.BadRequestException("In-Valid Data");
        }
        const user = await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: req.body,
            options: { new: true },
        });
        if (user)
            return (0, success_response_1.successResponse)({ res, data: { user } });
        else
            throw new error_response_1.NotFoundException("user not found");
    };
    updatePassword = async (req, res) => {
        const { oldPassword, password, flag } = req.body;
        if (!await (0, hash_security_1.compareHash)(oldPassword, req.user?.password)) {
            throw new error_response_1.BadRequestException("Invalid old password");
        }
        if (req.user?.oldPasswords?.length) {
            for (const hashPassword of req.user.oldPasswords) {
                if (await (0, hash_security_1.compareHash)(password, hashPassword)) {
                    throw new error_response_1.BadRequestException("This password was used before");
                }
            }
        }
        let updatedData = {};
        let statusCode = 200;
        switch (flag) {
            case "all":
                updatedData.changeCredentialTime = new Date();
                break;
            case "only":
                await (0, token_security_1.createRevokeToken)(req.decoded);
                statusCode = 201;
                break;
        }
        const user = await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: {
                password: await (0, hash_security_1.generateHash)(password),
                ...updatedData,
                $push: { oldPasswords: req.user?.password }
            },
            options: { new: true }
        });
        if (!user)
            throw new error_response_1.NotFoundException("User not found");
        return res.status(statusCode).json({ message: "Password updated successfully" });
    };
    updateEmail = async (req, res) => {
        const { email, password } = req.body;
        if (!await (0, hash_security_1.compareHash)(password, req.user?.password)) {
            throw new error_response_1.BadRequestException("Invalid password");
        }
        const existingUser = await this.userModel.findOne({ filter: { email } });
        if (existingUser) {
            throw new error_response_1.BadRequestException("Email already exists");
        }
        const otp = (0, nanoid_1.nanoid)(6);
        const user = await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: {
                email,
                confirmEmailOtp: otp,
                confirmAt: undefined
            },
            options: { new: true }
        });
        if (!user)
            throw new error_response_1.NotFoundException("User not found");
        email_event_1.emailEvent.emit("confirmEmail", {
            to: email,
            otp: otp
        });
        return (0, success_response_1.successResponse)({ res, message: "Email updated. Please check your new email for verification" });
    };
    sendEmailWithTags = async (req, res) => {
        const { to, subject, message, tags } = req.body;
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
            email_event_1.emailEvent.emit("sendCustomEmail", {
                to: email,
                subject,
                html: emailContent
            });
        }
        return (0, success_response_1.successResponse)({ res, message: "Emails sent successfully" });
    };
    enableTwoFactor = async (req, res) => {
        const { password } = req.body;
        if (!await (0, hash_security_1.compareHash)(password, req.user?.password)) {
            throw new error_response_1.BadRequestException("Invalid password");
        }
        if (req.user?.twoFactorEnabled) {
            throw new error_response_1.BadRequestException("Two-factor authentication is already enabled");
        }
        const secret = (0, nanoid_1.nanoid)(32);
        const otp = (0, nanoid_1.nanoid)(6);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        const user = await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: {
                twoFactorSecret: secret,
                twoFactorOtp: await (0, hash_security_1.generateHash)(otp),
                twoFactorOtpExpires: otpExpires
            },
            options: { new: true }
        });
        if (!user)
            throw new error_response_1.NotFoundException("User not found");
        email_event_1.emailEvent.emit("twoFactorSetup", {
            to: req.user?.email,
            otp: otp
        });
        return (0, success_response_1.successResponse)({ res, message: "Two-factor setup initiated. Check your email for verification code" });
    };
    verifyTwoFactor = async (req, res) => {
        const { otp } = req.body;
        if (!req.user?.twoFactorOtp || !req.user?.twoFactorOtpExpires) {
            throw new error_response_1.BadRequestException("No two-factor setup in progress");
        }
        if (new Date() > req.user.twoFactorOtpExpires) {
            throw new error_response_1.BadRequestException("OTP expired");
        }
        if (!await (0, hash_security_1.compareHash)(otp, req.user.twoFactorOtp)) {
            throw new error_response_1.BadRequestException("Invalid OTP");
        }
        const user = await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: {
                twoFactorEnabled: true,
                $unset: { twoFactorOtp: 1, twoFactorOtpExpires: 1 }
            },
            options: { new: true }
        });
        if (!user)
            throw new error_response_1.NotFoundException("User not found");
        return (0, success_response_1.successResponse)({ res, message: "Two-factor authentication enabled successfully" });
    };
    disableTwoFactor = async (req, res) => {
        const { password, otp } = req.body;
        if (!await (0, hash_security_1.compareHash)(password, req.user?.password)) {
            throw new error_response_1.BadRequestException("Invalid password");
        }
        if (!req.user?.twoFactorEnabled) {
            throw new error_response_1.BadRequestException("Two-factor authentication is not enabled");
        }
        const verificationOtp = (0, nanoid_1.nanoid)(6);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await this.userModel.findByIdAndUpdate({
            id: req.decoded?._id,
            update: {
                twoFactorOtp: await (0, hash_security_1.generateHash)(verificationOtp),
                twoFactorOtpExpires: otpExpires
            }
        });
        if (await (0, hash_security_1.compareHash)(otp, await (0, hash_security_1.generateHash)(verificationOtp))) {
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
            if (!user)
                throw new error_response_1.NotFoundException("User not found");
            return (0, success_response_1.successResponse)({ res, message: "Two-factor authentication disabled successfully" });
        }
        else {
            email_event_1.emailEvent.emit("twoFactorDisable", {
                to: req.user?.email,
                otp: verificationOtp
            });
            return (0, success_response_1.successResponse)({ res, message: "Verification code sent to your email" });
        }
    };
}
exports.default = new UserService();
