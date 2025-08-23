"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
async function sendEmail({ from = process.env.APP_EMAIL || "", to, cc, bcc, subject = "socialmedia APP", html = "", attachments = [], }) {
    try {
        const transporter = nodemailer_1.default.createTransport({
            service: "gmail",
            auth: {
                user: process.env.APP_EMAIL,
                pass: process.env.APP_PASSWORD,
            },
        });
        const info = await transporter.sendMail({
            from: `"socialmedia APP" <${from}>`,
            to,
            cc,
            bcc,
            subject,
            html,
            attachments,
        });
        console.log("✅ Message sent:", info.messageId);
    }
    catch (error) {
        console.error("❌ Error sending email:", error);
    }
}
