import mongoose, { ConnectOptions } from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const uri: string | undefined = process.env.DB_URI;

    if (!uri) {
      throw new Error("DB_URI is not defined in environment variables");
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
    } as ConnectOptions);

    console.log("DB connected successfully ❤️");
  } catch (error) {
    console.error("Fail to connect DB", error);
  }
};

export default connectDB;
