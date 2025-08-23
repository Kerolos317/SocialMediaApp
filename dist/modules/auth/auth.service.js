"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_model_1 = require("../../DB/models/User.model");
const error_response_1 = require("../../utils/response/error.response");
const nanoid_1 = require("nanoid");
const email_event_1 = require("../../utils/events/email.event");
class AuthenticationService {
    constructor() {
    }
    signup = async (req, res) => {
        const { username, email, password } = req.body;
        if (await User_model_1.UserModel.findOne({ email: email })) {
            throw new error_response_1.ApplicationException("Email already Exist", 409);
        }
        const otp = (0, nanoid_1.customAlphabet)(`0123456789`, 6)();
        const confirmEmailOtp = otp;
        const user = await User_model_1.UserModel.create({
            username,
            email,
            password,
            confirmEmailOtp
        });
        email_event_1.emailEvent.emit("confirmEmail", { to: email, otp: otp });
        return res.status(201).json({ message: "Done", data: user });
    };
    confirmEmail = async (req, res) => {
        const { email, otp } = req.body;
        const user = await User_model_1.UserModel.findOne({
            email,
            confirmEmail: { $exists: false },
            confirmEmailOtp: { $exists: true },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid account or already verified");
        }
        const updatedUser = await User_model_1.UserModel.findOneAndUpdate({
            email: email,
            confirmEmail: { $in: [null, undefined] },
            confirmEmailOtp: otp,
        }, {
            $set: { confirmEmail: new Date() },
            $unset: { confirmEmailOtp: 1 },
            $inc: { __v: 1 },
        }, { new: true });
        if (!updatedUser) {
            throw new error_response_1.ApplicationException("Invalid or expired OTP", 400);
        }
        return res.status(200).json({ message: "Email confirmed successfully" });
    };
    login = async (req, res) => {
        const { email, password } = req.body;
        const user = await User_model_1.UserModel.findOne({ email: email, password: password });
        if (!user) {
            throw new error_response_1.NotFoundException("User not found");
        }
        if (!user.confirmEmail) {
            throw new error_response_1.ApplicationException("Please verify your account", 400);
        }
        return res.status(201).json({ message: "Done", data: user });
    };
}
exports.default = new AuthenticationService();
