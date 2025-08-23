"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailTemplate = void 0;
const verifyEmailTemplate = ({ otp, title = "Email Confirmation", }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Email Template</title>
<style>
  body { font-family: Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
  .header { background-color: #630E2B; color: #fff; padding: 20px; text-align: center; }
  .content { padding: 30px; text-align: center; }
  .otp-box { display:inline-block; background:#630E2B; color:#fff; font-size:24px; padding:10px 25px; border-radius:6px; margin-top:15px; letter-spacing:2px; }
  .footer { background-color:#f4f6f8; padding:20px; text-align:center; font-size:14px; color:#555; }
  a.button { background:#630E2B; color:#fff; padding:10px 20px; text-decoration:none; border-radius:4px; display:inline-block; margin-top:20px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>${title}</h2></div>
    <div class="content">
      <p>Please use the OTP below to continue:</p>
      <div class="otp-box">${otp}</div>
      <br/>
      <a href="http://localhost:4200/#/" class="button" target="_blank">View in Website</a>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
exports.verifyEmailTemplate = verifyEmailTemplate;
