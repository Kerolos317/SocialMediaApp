"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = exports.ProviderEnum = exports.RoleEnum = exports.GenderEnum = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
var GenderEnum;
(function (GenderEnum) {
    GenderEnum["Male"] = "male";
    GenderEnum["Female"] = "female";
})(GenderEnum || (exports.GenderEnum = GenderEnum = {}));
var RoleEnum;
(function (RoleEnum) {
    RoleEnum["User"] = "user";
    RoleEnum["Admin"] = "admin";
})(RoleEnum || (exports.RoleEnum = RoleEnum = {}));
var ProviderEnum;
(function (ProviderEnum) {
    ProviderEnum["GOOGLE"] = "google";
    ProviderEnum["SYSTEM"] = "SYSTEM";
})(ProviderEnum || (exports.ProviderEnum = ProviderEnum = {}));
const userSchema = new mongoose_1.default.Schema({
    firstName: { type: String, required: true, minLength: 2, maxLength: 25 },
    lastName: { type: String, required: true, minLength: 2, maxLength: 25 },
    email: { type: String, required: true, unique: true },
    confirmEmailOtp: { type: String },
    confirmAt: { type: Date },
    password: { type: String, required: function () {
            return this.provider === ProviderEnum.GOOGLE ? false : true;
        } },
    resetPasswordOtp: { type: String },
    changeCredentialTime: { type: Date },
    phone: { type: String },
    address: { type: String },
    profileImage: { type: String },
    coverImages: { type: [String] },
    gender: { type: String, enum: GenderEnum, default: GenderEnum.Male },
    role: { type: String, enum: RoleEnum, default: RoleEnum.User },
    provider: { type: String, enum: ProviderEnum, default: ProviderEnum.SYSTEM },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
userSchema.virtual("username").set(function (value) {
    const [firstName, lastName] = value?.split(" ") || [];
    this.set({ firstName, lastName });
}).get(function () {
    return this.firstName + " " + this.lastName;
});
exports.UserModel = mongoose_1.default.models.User || mongoose_1.default.model("User", userSchema);
