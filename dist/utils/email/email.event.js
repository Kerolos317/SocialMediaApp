"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailEvent = void 0;
const node_events_1 = require("node:events");
const send_email_js_1 = require("../email/send.email.js");
const verfiy_email_templates_js_1 = require("../email/templates/verfiy.email.templates.js");
exports.emailEvent = new node_events_1.EventEmitter();
exports.emailEvent.on("confirmEmail", async (data) => {
    await (0, send_email_js_1.sendEmail)({
        to: data.to,
        subject: data.subject || "Confirm-Email",
        html: (0, verfiy_email_templates_js_1.verifyEmailTemplate)({ otp: data.otp }),
    }).catch((error) => {
        console.log(`Fail to send email to ${data.otp}`);
    });
});
exports.emailEvent.on("resetPassword", async (data) => {
    await (0, send_email_js_1.sendEmail)({
        to: data.to,
        subject: data.subject || "Reset Code",
        html: (0, verfiy_email_templates_js_1.verifyEmailTemplate)({ otp: data.otp }),
    }).catch((error) => {
        console.log(`Fail to send email to ${data.otp}`);
    });
});
exports.emailEvent.on("sendCustomEmail", async (data) => {
    await (0, send_email_js_1.sendEmail)({
        to: data.to,
        subject: data.subject,
        html: data.html,
    }).catch((error) => {
        console.log(`Fail to send custom email to ${data.to}`);
    });
});
exports.emailEvent.on("twoFactorSetup", async (data) => {
    await (0, send_email_js_1.sendEmail)({
        to: data.to,
        subject: "Two-Factor Authentication Setup",
        html: (0, verfiy_email_templates_js_1.verifyEmailTemplate)({ otp: data.otp }),
    }).catch((error) => {
        console.log(`Fail to send 2FA setup email to ${data.to}`);
    });
});
exports.emailEvent.on("twoFactorDisable", async (data) => {
    await (0, send_email_js_1.sendEmail)({
        to: data.to,
        subject: "Disable Two-Factor Authentication",
        html: (0, verfiy_email_templates_js_1.verifyEmailTemplate)({ otp: data.otp }),
    }).catch((error) => {
        console.log(`Fail to send 2FA disable email to ${data.to}`);
    });
});
