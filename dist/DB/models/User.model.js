"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = exports.Gender = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
var Gender;
(function (Gender) {
    Gender["Male"] = "male";
    Gender["Female"] = "female";
})(Gender || (exports.Gender = Gender = {}));
const userSchema = new mongoose_1.default.Schema({
    username: {
        type: String,
        required: true,
        minLength: 2,
        maxLength: [20, "firstName max length is 20 char and you have entered {VALUE}"],
    },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: {
        type: String,
        enum: Object.values(Gender),
        default: Gender.Male,
    },
    confirmEmail: Date,
    confirmEmailOtp: String,
}, { timestamps: true });
exports.UserModel = mongoose_1.default.models.User || mongoose_1.default.model("User", userSchema);
