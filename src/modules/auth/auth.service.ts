import type { Request, Response } from "express";
import type {
    IConfirmEmailBodyInputDTO,
    IForgotCodeBodyInputDTO,
    IGmail,
    ILoginBodyInputDTO,
    IResetForgotCodeBodyInputDTO,
    ISignupBodyInputDTO,
    IVerifyForgotCodeBodyInputDTO,
} from "./auth.dto";
import { ProviderEnum, UserModel } from "../../DB/models/User.model";
import {
    ApplicationException,
    BadRequestException,
    ConflictException,
    NotFoundException,
} from "../../utils/response/error.response";
import { emailEvent } from "../../utils/events/email.event";
import { UserRepository } from "../../DB/repository/user.repository";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { generateNumberOtp } from "../../utils/otp";
import { createLoginCredentials } from "../../utils/security/token.security";
import { OAuth2Client, TokenPayload } from "google-auth-library";

class AuthenticationService {
    private userModel = new UserRepository(UserModel);
    constructor() {}

    private async verifyGmailAccount(idToken: string): Promise<TokenPayload> {
        const client = new OAuth2Client();

        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_IDS?.split(",") || [],
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new BadRequestException("Failed to verify Google account");
        }
        return payload;
    }

    loginWithGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: IGmail = req.body;
        const { email }: TokenPayload = await this.verifyGmailAccount(idToken);

        const user = await this.userModel.findOne({
            filter: { email, provider: ProviderEnum.GOOGLE },
        });
        if (!user) {
            throw new NotFoundException(
                "User not found or with another provider"
            );
        }

        const credentials = await createLoginCredentials(user);
        return res.status(201).json({
            message: "Done",
            data: { credentials },
        });
    };

    signupWithGmail = async (
        req: Request,
        res: Response
    ): Promise<Response> => {
        const { idToken }: IGmail = req.body;
        const { email, family_name, given_name, picture }: TokenPayload =
            await this.verifyGmailAccount(idToken);

        const user = await this.userModel.findOne({
            filter: { email },
        });
        if (user) {
            if (user.provider === ProviderEnum.GOOGLE) {
                return await this.loginWithGmail(req, res);
            }
            throw new ConflictException("Email already Exist");
        }

        const [newUser] =
            (await this.userModel.create({
                data: [
                    {
                        email: email as string,
                        firstName: given_name as string,
                        lastName: family_name as string,
                        profileImage: picture as string,
                        confirmAt: new Date(),
                        provider: ProviderEnum.GOOGLE,
                    },
                ],
            })) || [];

        if (!newUser) {
            throw new BadRequestException("Failed to create user");
        }

        const credentials = await createLoginCredentials(newUser);
        return res.status(201).json({
            message: "Done",
            data: { credentials },
        });
    };

    signup = async (req: Request, res: Response): Promise<Response> => {
        const { username, email, password }: ISignupBodyInputDTO = req.body;

        const otp: number = generateNumberOtp();

        const checkUserExist = await this.userModel.findOne({
            filter: { email },
            select: { email: 1 },
            options: { lean: false },
        });
        if (checkUserExist) {
            throw new ConflictException("Email already Exist", 409);
        }

        const user =
            (await this.userModel.createUser({
                data: [
                    {
                        username,
                        email,
                        password: await generateHash(password),
                        confirmEmailOtp: await generateHash(String(otp)),
                    },
                ],
            })) || [];

        if (!user) {
            throw new BadRequestException("Failed to Signup user");
        }

        emailEvent.emit("confirmEmail", { to: email, otp: otp });

        return res.status(201).json({ message: "Done", data: user });
    };

    confirmEmail = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp }: IConfirmEmailBodyInputDTO = req.body;

        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmAt: { $exists: false },
                confirmEmailOtp: { $exists: true },
            },
        });

        if (!user) {
            throw new NotFoundException("Invalid account or already verified");
        }
        if (!(await compareHash(otp, user.confirmEmailOtp as string))) {
            throw new ConflictException("Invalid OTP");
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

        const updatedUser =
            updateResult && updateResult.modifiedCount > 0
                ? await this.userModel.findOne({ filter: { email } })
                : null;

        if (!updatedUser) {
            throw new ApplicationException("Invalid or expired OTP", 400);
        }

        return res
            .status(200)
            .json({ message: "Email confirmed successfully" });
    };

    login = async (req: Request, res: Response): Promise<Response> => {
        const { email, password }: ILoginBodyInputDTO = req.body;

        const user = await this.userModel.findOne({
            filter: {
                email: email,
                provider: ProviderEnum.SYSTEM,
            },
        });
        if (!user) {
            throw new NotFoundException("Invalid email or password");
        }

        if (!user.confirmAt) {
            throw new ApplicationException("Please verify your account", 400);
        }

        if (!(await compareHash(password, user.password as string))) {
            throw new ConflictException("Invalid email or password");
        }

        const credentials = await createLoginCredentials(user);
        if (user.changeCredentialTime) {
            await this.userModel.updateOne({
                filter: { _id: user._id },
                update: { $unset: { changeCredentialTime: 1 } },
            });
        }
        // console.log(credentials);

        return res.status(201).json({
            message: "Done",
            data: { credential: credentials },
        });
    };

    sendForgotCode = async (req: Request, res: Response): Promise<Response> => {
        const { email }: IForgotCodeBodyInputDTO = req.body;

        const user = await this.userModel.findOne({
            filter: {
                email: email,
                provider: ProviderEnum.SYSTEM,
                confirmAt: { $exists: true },
            },
        });
        if (!user) {
            throw new NotFoundException(
                "Invalid account due to one of the following reasons: account not registered, not verified, or invalid provider"
            );
        }

        const otp: number = generateNumberOtp();
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                $set: { resetPasswordOtp: await generateHash(String(otp)) },
            },
        });

        if (!result.matchedCount) {
            throw new BadRequestException("Fail to send the reset code");
        }

        emailEvent.emit("resetPassword", { to: email, otp: otp });

        return res.status(201).json({
            message: "Done",
        });
    };

    verifyForgotPassword = async (
        req: Request,
        res: Response
    ): Promise<Response> => {
        const { email, otp }: IVerifyForgotCodeBodyInputDTO = req.body;

        const user = await this.userModel.findOne({
            filter: {
                email: email,
                provider: ProviderEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new NotFoundException(
                "Invalid account due to one of the following reasons: account not registered, not verified, or invalid provider"
            );
        }
        if (
            !(await compareHash(String(otp), user.resetPasswordOtp as string))
        ) {
            throw new ConflictException("Invalid or expired OTP");
        }

        return res.status(201).json({
            message: "Done",
        });
    };

    resetForgotPassword = async (
        req: Request,
        res: Response
    ): Promise<Response> => {
        const { email, otp, password }: IResetForgotCodeBodyInputDTO =
            req.body;

        const user = await this.userModel.findOne({
            filter: {
                email: email,
                provider: ProviderEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new NotFoundException(
                "Invalid account due to one of the following reasons: account not registered, not verified, or invalid provider"
            );
        }
        if (
            !(await compareHash(String(otp), user.resetPasswordOtp as string))
        ) {
            throw new ConflictException("Invalid or expired OTP");
        }

        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                password: await generateHash(password),
                changeCredentialTime: new Date(),
                $unset: { resetPasswordOtp: 1 },
            },
        });

        if (!result.matchedCount) {
            throw new BadRequestException("Fail reset account password");
        }

        return res.status(201).json({
            message: "Done",
        });
    };
}

export default new AuthenticationService();
