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
