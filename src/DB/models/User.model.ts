import mongoose, {  HydratedDocument } from "mongoose";

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

export interface IUser  { 
  firstName: string;
  lastName: string;
  username?: string;

  email: string;
  confirmAt?: Date;
  confirmEmailOtp?: string;

  password: string;
  resetPasswordOtp?: string;
  changeCredentialTime?: Date;

  phone?: string;
  address?: string;
  profileImage?: string;
  coverImages?: string[];

  gender: GenderEnum;
  role: RoleEnum;
  provider: ProviderEnum;

  createdAt: Date;
  updatedAt?: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {

    firstName: {type:String, required:true, minLength:2, maxLength:25},
    lastName: {type:String, required:true, minLength:2, maxLength:25},

    email: {type:String, required:true , unique:true},
    confirmEmailOtp: {type:String},
    confirmAt: {type:Date},

    password: {type:String, required:function () {
      return this.provider === ProviderEnum.GOOGLE ? false : true
    }},
    resetPasswordOtp: {type:String},
    changeCredentialTime: {type:Date},

    phone: {type:String},
    address: {type:String},

    profileImage:{type:String},
    coverImages:{type:[String]},
    gender: {type:String , enum:GenderEnum, default:GenderEnum.Male},
    role: {type:String , enum:RoleEnum, default:RoleEnum.User},
    provider: {type:String , enum:ProviderEnum, default:ProviderEnum.SYSTEM},

  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual("username").set(function (value) {
  const [firstName ,lastName] = value?.split(" ")|| [];
  this.set({firstName , lastName})
}).get(function() {
  return this.firstName + " " + this.lastName
})

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export type HUserDocument =HydratedDocument<IUser>;
