"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_model_1 = require("../../DB/models/User.model");
const error_response_1 = require("../../utils/response/error.response");
const email_event_1 = require("../../utils/events/email.event");
const user_repository_1 = require("../../DB/repository/user.repository");
const hash_security_1 = require("../../utils/security/hash.security");
const otp_1 = require("../../utils/otp");
const token_security_1 = require("../../utils/security/token.security");
const google_auth_library_1 = require("google-auth-library");
class AuthenticationService {
    userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    async verifyGmailAccount(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_IDS?.split(",") || [],
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new error_response_1.BadRequestException("Failed to verify Google account");
        }
        return payload;
    }
    loginWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({
            filter: { email, provider: User_model_1.ProviderEnum.GOOGLE },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("User not found or with another provider");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return res.status(201).json({
            message: "Done",
            data: { credentials },
        });
    };
    signupWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email, family_name, given_name, picture } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({
            filter: { email },
        });
        if (user) {
            if (user.provider === User_model_1.ProviderEnum.GOOGLE) {
                return await this.loginWithGmail(req, res);
            }
            throw new error_response_1.ConflictException("Email already Exist");
        }
        const [newUser] = (await this.userModel.create({
            data: [
                {
                    email: email,
                    firstName: given_name,
                    lastName: family_name,
                    profileImage: picture,
                    confirmAt: new Date(),
                    provider: User_model_1.ProviderEnum.GOOGLE,
                },
            ],
        })) || [];
        if (!newUser) {
            throw new error_response_1.BadRequestException("Failed to create user");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(newUser);
        return res.status(201).json({
            message: "Done",
            data: { credentials },
        });
    };
    signup = async (req, res) => {
        const { username, email, password } = req.body;
        const otp = (0, otp_1.generateNumberOtp)();
        const checkUserExist = await this.userModel.findOne({
            filter: { email },
            select: { email: 1 },
            options: { lean: false },
        });
        if (checkUserExist) {
            throw new error_response_1.ConflictException("Email already Exist", 409);
        }
        const user = (await this.userModel.createUser({
            data: [
                {
                    username,
                    email,
                    password: await (0, hash_security_1.generateHash)(password),
                    confirmEmailOtp: await (0, hash_security_1.generateHash)(String(otp)),
                },
            ],
        })) || [];
        if (!user) {
            throw new error_response_1.BadRequestException("Failed to Signup user");
        }
        email_event_1.emailEvent.emit("confirmEmail", { to: email, otp: otp });
        return res.status(201).json({ message: "Done", data: user });
    };
    confirmEmail = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmAt: { $exists: false },
                confirmEmailOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid account or already verified");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.confirmEmailOtp))) {
            throw new error_response_1.ConflictException("Invalid OTP");
        }
        const updateResult = await this.userModel.updateOne({
            filter: {
                email: email,
            },
            update: {
                $set: { confirmAt: new Date() },
                $unset: { confirmEmailOtp: 1 },
            },
        });
        const updatedUser = updateResult && updateResult.modifiedCount > 0
            ? await this.userModel.findOne({ filter: { email } })
            : null;
        if (!updatedUser) {
            throw new error_response_1.ApplicationException("Invalid or expired OTP", 400);
        }
        return res
            .status(200)
            .json({ message: "Email confirmed successfully" });
    };
    login = async (req, res) => {
        const { email, password } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email: email,
                provider: User_model_1.ProviderEnum.SYSTEM,
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid email or password");
        }
        if (!user.confirmAt) {
            throw new error_response_1.ApplicationException("Please verify your account", 400);
        }
        if (!(await (0, hash_security_1.compareHash)(password, user.password))) {
            throw new error_response_1.ConflictException("Invalid email or password");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        console.log(credentials);
        return res.status(201).json({
            message: "Done",
            data: { credential: credentials },
        });
    };
    sendForgotCode = async (req, res) => {
        const { email } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email: email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                confirmAt: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid account due to one of the following reasons: account not registered, not verified, or invalid provider");
        }
        const otp = (0, otp_1.generateNumberOtp)();
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                $set: { resetPasswordOtp: await (0, hash_security_1.generateHash)(String(otp)) },
            },
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("Fail to send the reset code");
        }
        email_event_1.emailEvent.emit("resetPassword", { to: email, otp: otp });
        return res.status(201).json({
            message: "Done",
        });
    };
    verifyForgotPassword = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email: email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid account due to one of the following reasons: account not registered, not verified, or invalid provider");
        }
        if (!(await (0, hash_security_1.compareHash)(String(otp), user.resetPasswordOtp))) {
            throw new error_response_1.ConflictException("Invalid or expired OTP");
        }
        return res.status(201).json({
            message: "Done",
        });
    };
    resetForgotPassword = async (req, res) => {
        const { email, otp, password } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email: email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid account due to one of the following reasons: account not registered, not verified, or invalid provider");
        }
        if (!(await (0, hash_security_1.compareHash)(String(otp), user.resetPasswordOtp))) {
            throw new error_response_1.ConflictException("Invalid or expired OTP");
        }
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                password: await (0, hash_security_1.generateHash)(password),
                changeCredentialTime: new Date(),
                $unset: { resetPasswordOtp: 1 },
            },
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("Fail reset account password");
        }
        return res.status(201).json({
            message: "Done",
        });
    };
}
exports.default = new AuthenticationService();
