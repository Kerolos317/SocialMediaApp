import mongoose, { Document, Model } from "mongoose";

export enum Gender {
  Male = "male",
  Female = "female",
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  gender: "male" | "female";
  confirmEmail?: Date;
  confirmEmailOtp?: string;
}

const userSchema = new mongoose.Schema<IUser>(
  {
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
  },
  { timestamps: true }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);
