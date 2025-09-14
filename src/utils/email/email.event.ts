import { EventEmitter } from "node:events";
import { sendEmail } from "../email/send.email.js";
import { verifyEmailTemplate } from "../email/templates/verfiy.email.templates.js";
export const emailEvent = new EventEmitter();

emailEvent.on("confirmEmail", async (data) => {
    await sendEmail({
        to: data.to,
        subject: data.subject || "Confirm-Email",
        html: verifyEmailTemplate({ otp: data.otp }),
    }).catch((error) => {
        console.log(`Fail to send email to ${data.otp}`);
    });
});

emailEvent.on("resetPassword", async (data) => {
    await sendEmail({
        to: data.to,
        subject: data.subject || "Reset Code",
        html: verifyEmailTemplate({ otp: data.otp }),
    }).catch((error) => {
        console.log(`Fail to send email to ${data.otp}`);
    });
});

emailEvent.on("sendCustomEmail", async (data) => {
    await sendEmail({
        to: data.to,
        subject: data.subject,
        html: data.html,
    }).catch((error) => {
        console.log(`Fail to send custom email to ${data.to}`);
    });
});

emailEvent.on("twoFactorSetup", async (data) => {
    await sendEmail({
        to: data.to,
        subject: "Two-Factor Authentication Setup",
        html: verifyEmailTemplate({ otp: data.otp }),
    }).catch((error) => {
        console.log(`Fail to send 2FA setup email to ${data.to}`);
    });
});

emailEvent.on("twoFactorDisable", async (data) => {
    await sendEmail({
        to: data.to,
        subject: "Disable Two-Factor Authentication",
        html: verifyEmailTemplate({ otp: data.otp }),
    }).catch((error) => {
        console.log(`Fail to send 2FA disable email to ${data.to}`);
    });
});
