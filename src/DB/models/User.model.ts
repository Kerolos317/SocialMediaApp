import mongoose, { HydratedDocument, Types } from "mongoose";
import { generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/email/email.event";

export enum GenderEnum {
    Male = "male",
    Female = "female",
}

export enum RoleEnum {
    User = "user",
    Admin = "admin",
}

export enum ProviderEnum {
    GOOGLE = "google",
    SYSTEM = "SYSTEM",
}

export interface IUser {
    firstName: string;
    lastName: string;
    username?: string;
    slug: string;

    email: string;
    confirmAt?: Date;
    confirmEmailOtp?: string;

    password: string;
    resetPasswordOtp?: string;
    changeCredentialTime?: Date;

    phone?: string;
    address?: string;

    profileImage?: string;
    tempProfileImage?: string;
    coverImages?: string[];

    gender: GenderEnum;
    role: RoleEnum;
    provider: ProviderEnum;

    freezedAt?: Date;
    freezedBy?: Types.ObjectId;
    restoredAt?: Date;
    restoredBy?: Types.ObjectId;

    createdAt: Date;
    updatedAt?: Date;
}

const userSchema = new mongoose.Schema<IUser>(
    {
        firstName: {
            type: String,
            required: true,
            minLength: 2,
            maxLength: 25,
        },
        lastName: { type: String, required: true, minLength: 2, maxLength: 25 },
        slug: { type: String, required: true, minLength: 2, maxLength: 51 },

        email: { type: String, required: true, unique: true },
        confirmEmailOtp: { type: String },
        confirmAt: { type: Date },

        password: {
            type: String,
            required: function () {
                return this.provider === ProviderEnum.GOOGLE ? false : true;
            },
        },
        resetPasswordOtp: { type: String },
        changeCredentialTime: { type: Date },

        phone: { type: String },
        address: { type: String },

        profileImage: { type: String },
        tempProfileImage: { type: String },
        coverImages: { type: [String] },

        gender: { type: String, enum: GenderEnum, default: GenderEnum.Male },
        role: { type: String, enum: RoleEnum, default: RoleEnum.User },
        provider: {
            type: String,
            enum: ProviderEnum,
            default: ProviderEnum.SYSTEM,
        },

        freezedAt: { type: Date },
        freezedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        restoredAt: { type: Date },
        restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

userSchema
    .virtual("username")
    .set(function (value) {
        const [firstName, lastName] = value?.split(" ") || [];
        this.set({ firstName, lastName, slug: value.replaceAll(/\s+/g, "-") });
    })
    .get(function () {
        return this.firstName + " " + this.lastName;
    });

userSchema.pre(
    "save",
    async function (
        this: HUserDocument & {
            wasNew: boolean;
            confirmEmailPlainOtp?: string;
        },
        next
    ) {
        this.wasNew = this.isNew;
        if (this.isModified("password")) {
            this.password = await generateHash(this.password);
        }
        if (this.isModified("confirmEmailOtp")) {
            this.confirmEmailPlainOtp = this.confirmEmailOtp as string;
            this.confirmEmailOtp = await generateHash(
                this.confirmEmailOtp as string
            );
        }
        next();
    }
);

userSchema.post("save", async function (doc, next) {
    const that = this as HUserDocument & {
        wasNew: boolean;
        confirmEmailPlainOtp?: string;
    };
    if (that.wasNew && that.confirmEmailPlainOtp) {
      
      emailEvent.emit("confirmEmail", {
          to: this.email,
          otp: that.confirmEmailPlainOtp,
      });
    }
});

export const UserModel =
    mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export type HUserDocument = HydratedDocument<IUser>;
