import nodemailer, { Transporter } from "nodemailer";

interface SendEmailOptions {
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  html?: string;
  attachments?: any[];
}

export async function sendEmail({
  from = process.env.APP_EMAIL || "",
  to,
  cc,
  bcc,
  subject = "socialmedia APP",
  html = "",
  attachments = [],
}: SendEmailOptions): Promise<void> {
  try {
    const transporter: Transporter = nodemailer.createTransport({
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
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}
