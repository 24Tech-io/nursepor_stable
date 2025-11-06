import nodemailer from 'nodemailer';

// Create transporter only if SMTP is configured
let transporter: nodemailer.Transporter | null = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('✅ SMTP email configured');
  } catch (error) {
    console.error('❌ Failed to configure SMTP:', error);
  }
} else {
  console.warn('⚠️ SMTP not configured - email features will be disabled');
  console.warn('   To enable email, add SMTP_HOST, SMTP_USER, and SMTP_PASS to .env.local');
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  if (!transporter) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?email=${encodeURIComponent(email)}&token=${resetToken}`;
    console.log('📧 SMTP not configured - Password reset link (for development):');
    console.log(`   ${resetUrl}`);
    throw new Error('SMTP is not configured. Please configure SMTP settings in .env.local to send emails. For development, check the server console for the reset link.');
  }

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?email=${encodeURIComponent(email)}&token=${resetToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@lms-platform.com',
    to: email,
    subject: 'Password Reset Request - LMS Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You have requested to reset your password for your LMS Platform account.</p>
        <p>Please click the link below to reset your password:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>LMS Platform Team</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          If the button doesn't work, copy and paste this URL into your browser:<br>
          ${resetUrl}
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  if (!transporter) {
    console.log(`📧 SMTP not configured - Welcome email skipped for ${email}`);
    return; // Don't throw error for welcome email, just skip it
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@lms-platform.com',
    to: email,
    subject: 'Welcome to LMS Platform!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to LMS Platform, ${name}!</h2>
        <p>Thank you for joining our learning community.</p>
        <p>You can now access your dashboard and start your learning journey.</p>
        <p style="margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Get Started
          </a>
        </p>
        <p>Best regards,<br>LMS Platform Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendAccessRequestNotification(adminEmail: string, studentName: string, courseTitle: string): Promise<void> {
  if (!transporter) {
    console.log(`📧 SMTP not configured - Access request notification skipped`);
    return; // Don't throw error, just skip it
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@lms-platform.com',
    to: adminEmail,
    subject: 'New Course Access Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Course Access Request</h2>
        <p><strong>${studentName}</strong> has requested access to <strong>${courseTitle}</strong>.</p>
        <p>Please review this request in your admin dashboard.</p>
        <p style="margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/requests" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review Request
          </a>
        </p>
        <p>Best regards,<br>LMS Platform Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
