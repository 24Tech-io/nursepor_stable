import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const { to, subject, html, text } = options;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
      html,
    });

    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export async function sendOTPEmail(email: string, otp: string, name?: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
    .otp-code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; padding: 20px; background: white; border-radius: 8px; letter-spacing: 4px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NursePro Academy</h1>
    </div>
    <div class="content">
      <h2>Hello ${name || 'there'}!</h2>
      <p>Your one-time password (OTP) for login is:</p>
      <div class="otp-code">${otp}</div>
      <p>This code will expire in <strong>10 minutes</strong>.</p>
      <p>If you didn't request this code, please ignore this email and ensure your account is secure.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} NursePro Academy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Your Login OTP - NursePro Academy',
    html,
  });
}

export async function sendPasswordResetEmail(email: string, resetLink: string, name?: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NursePro Academy</h1>
    </div>
    <div class="content">
      <h2>Hello ${name || 'there'}!</h2>
      <p>We received a request to reset your password. Click the button below to reset it:</p>
      <div style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #4F46E5;">${resetLink}</p>
      <p>This link will expire in <strong>1 hour</strong>.</p>
      <p>If you didn't request a password reset, please ignore this email and ensure your account is secure.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} NursePro Academy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - NursePro Academy',
    html,
  });
}
