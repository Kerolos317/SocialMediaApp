"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const uri = process.env.DB_URI;
        if (!uri) {
            throw new Error("DB_URI is not defined in environment variables");
        }
        await mongoose_1.default.connect(uri, {
            serverSelectionTimeoutMS: 30000,
        });
        console.log("DB connected successfully ❤️");
    }
    catch (error) {
        console.error("Fail to connect DB", error);
    }
};
exports.default = connectDB;
