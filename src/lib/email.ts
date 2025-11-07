import nodemailer from 'nodemailer';

// Create transporter only if SMTP is configured
let transporter: nodemailer.Transporter | null = null;

function createTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  try {
    const config: any = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Add connection timeout and retry options
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
      // Disable TLS if explicitly set
      requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false',
      tls: {
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
      },
    };

    const newTransporter = nodemailer.createTransport(config);
    return newTransporter;
  } catch (error) {
    console.error('❌ Failed to create SMTP transporter:', error);
    return null;
  }
}

// Initialize transporter
transporter = createTransporter();

// Verify connection on startup if transporter exists (async, non-blocking)
if (transporter) {
  // Verify asynchronously without blocking startup - use callback for better compatibility
  transporter.verify((error, success) => {
    if (error) {
      // Only log errors in development mode to avoid build warnings
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ SMTP connection verification failed:', error.message);
        console.error('   Please check your SMTP settings in .env.local');
        console.error('   Email features will be disabled until SMTP is properly configured');
      }
      transporter = null; // Disable transporter if verification fails
    } else {
      // Only log success in development mode to avoid build warnings
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ SMTP email configured and verified');
      }
    }
  });
} else {
  // Only warn in development mode to avoid build warnings
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ SMTP not configured - email features will be disabled');
    console.warn('   To enable email, add SMTP_HOST, SMTP_USER, and SMTP_PASS to .env.local');
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  // Recreate transporter if it doesn't exist (in case env vars were added after startup)
  if (!transporter) {
    transporter = createTransporter();
  }

  if (!transporter) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?email=${encodeURIComponent(email)}&token=${resetToken}`;
    console.log('📧 SMTP not configured - Password reset link (for development):');
    console.log(`   ${resetUrl}`);
    throw new Error('SMTP is not configured. Please configure SMTP settings in .env.local to send emails. For development, check the server console for the reset link.');
  }

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?email=${encodeURIComponent(email)}&token=${resetToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@nurseproacademy.com',
    to: email,
    subject: 'Password Reset Request - Nurse Pro Academy',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You have requested to reset your password for your Nurse Pro Academy account.</p>
        <p>Please click the link below to reset your password:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>Nurse Pro Academy Team</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          If the button doesn't work, copy and paste this URL into your browser:<br>
          ${resetUrl}
        </p>
      </div>
    `,
  };

  try {
    if (!transporter) {
      throw new Error('SMTP transporter is not available');
    }
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
  } catch (error: any) {
    console.error('❌ Failed to send password reset email:', error.message);
    // Re-throw with more context
    throw new Error(`Failed to send email: ${error.message}. Please check your SMTP configuration.`);
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  // Recreate transporter if it doesn't exist
  if (!transporter) {
    transporter = createTransporter();
  }

  if (!transporter) {
    console.log(`📧 SMTP not configured - Welcome email skipped for ${email}`);
    return; // Don't throw error for welcome email, just skip it
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@nurseproacademy.com',
    to: email,
    subject: 'Welcome to Nurse Pro Academy!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Nurse Pro Academy, ${name}!</h2>
        <p>Thank you for joining our learning community.</p>
        <p>You can now access your dashboard and start your learning journey.</p>
        <p style="margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Get Started
          </a>
        </p>
        <p>Best regards,<br>Nurse Pro Academy Team</p>
      </div>
    `,
  };

  try {
    if (!transporter) {
      console.log(`📧 SMTP transporter not available - Welcome email skipped for ${email}`);
      return;
    }
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent:', info.messageId);
  } catch (error: any) {
    console.error('❌ Failed to send welcome email:', error.message);
    // Don't throw for welcome email - just log the error
  }
}

export async function sendAccessRequestNotification(adminEmail: string, studentName: string, courseTitle: string): Promise<void> {
  // Recreate transporter if it doesn't exist
  if (!transporter) {
    transporter = createTransporter();
  }

  if (!transporter) {
    console.log(`📧 SMTP not configured - Access request notification skipped`);
    return; // Don't throw error, just skip it
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@nurseproacademy.com',
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
        <p>Best regards,<br>Nurse Pro Academy Team</p>
      </div>
    `,
  };

  try {
    if (!transporter) {
      console.log(`📧 SMTP transporter not available - Access request notification skipped`);
      return;
    }
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Access request notification sent:', info.messageId);
  } catch (error: any) {
    console.error('❌ Failed to send access request notification:', error.message);
    // Don't throw for notifications - just log the error
  }
}

// Test email function
export async function testEmailConnection(): Promise<{ success: boolean; message: string }> {
  if (!transporter) {
    transporter = createTransporter();
  }

  if (!transporter) {
    return {
      success: false,
      message: 'SMTP is not configured. Please add SMTP_HOST, SMTP_USER, and SMTP_PASS to .env.local',
    };
  }

  try {
    // Use callback-based verify for better compatibility
    return new Promise((resolve) => {
      transporter!.verify((error, success) => {
        if (error) {
          resolve({
            success: false,
            message: `SMTP connection failed: ${error.message}`,
          });
        } else {
          resolve({
            success: true,
            message: 'SMTP connection verified successfully',
          });
        }
      });
    });
  } catch (error: any) {
    return {
      success: false,
      message: `SMTP connection failed: ${error.message}`,
    };
  }
}

// Send test email
export async function sendTestEmail(to: string): Promise<{ success: boolean; message: string }> {
  if (!transporter) {
    transporter = createTransporter();
  }

  if (!transporter) {
    return {
      success: false,
      message: 'SMTP is not configured',
    };
  }

  try {
    if (!transporter) {
      return {
        success: false,
        message: 'SMTP transporter is not available',
      };
    }
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@nurseproacademy.com',
      to: to,
      subject: 'Test Email - Nurse Pro Academy',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email</h2>
          <p>This is a test email from Nurse Pro Academy.</p>
          <p>If you received this email, your SMTP configuration is working correctly!</p>
          <p>Best regards,<br>Nurse Pro Academy Team</p>
        </div>
      `,
    });

    return {
      success: true,
      message: `Test email sent successfully. Message ID: ${info.messageId}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to send test email: ${error.message}`,
    };
  }
}
