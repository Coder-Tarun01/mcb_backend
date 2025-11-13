import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

// Email configuration (read from .env - do NOT hardcode credentials)
// Expected env vars (as provided): EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, FROM_DOMAIN
const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
const emailPort = parseInt(process.env.EMAIL_PORT || '465', 10);
const envSecure = typeof process.env.EMAIL_SECURE !== 'undefined' ? process.env.EMAIL_SECURE === 'true' : undefined;
const secure = typeof envSecure !== 'undefined' ? envSecure : emailPort === 465;
const emailUser = process.env.EMAIL_USER || '';
const emailPass = process.env.EMAIL_PASS || '';
const fromDomain = process.env.FROM_DOMAIN || 'mycareerbuild.com';
const emailDebug = process.env.EMAIL_DEBUG === 'true';

const emailConfig = {
  host: emailHost,
  port: emailPort,
  secure,
  auth: emailUser && emailPass ? { user: emailUser, pass: emailPass } : undefined,
  logger: emailDebug,
  debug: emailDebug,
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  tls: {
    rejectUnauthorized: false,
  },
};

// Domain-based email addresses
export const EMAIL_ADDRESSES = {
  INFO: `info@${fromDomain}`,
  CAREERS: `careers@${fromDomain}`,
  NOREPLY: `noreply@${fromDomain}`,
  ADMIN: `admin@${fromDomain}`,
  BUSINESS: `business@${fromDomain}`,
  SALES: `sales@${fromDomain}`,
  SUPPORT: `support@${fromDomain}`,
} as const;

// Email context mapping for cPanel Webmail
export const EMAIL_CONTEXTS = {
  REGISTRATION: EMAIL_ADDRESSES.CAREERS,
  JOB_NOTIFICATIONS: EMAIL_ADDRESSES.NOREPLY, // send job alerts from noreply by default
  OTP: EMAIL_ADDRESSES.NOREPLY, // OTPs / system notifications should come from noreply
  ADMIN_NOTIFICATIONS: EMAIL_ADDRESSES.ADMIN,
  BUSINESS_INQUIRIES: EMAIL_ADDRESSES.BUSINESS,
  SALES: EMAIL_ADDRESSES.SALES,
  SUPPORT: EMAIL_ADDRESSES.SUPPORT,
  GENERAL: EMAIL_ADDRESSES.INFO,
} as const;

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify connection configuration
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Email server connection verified');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    return false;
  }
};

// Base email template with mycareerbuild branding
const getBaseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
        }
        .footer a {
            color: #2563eb;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MyCareerBuild</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© 2024 MyCareerBuild. All rights reserved.</p>
            <p>
                <a href="https://mycareerbuild.com">Visit our website</a> | 
                <a href="mailto:support@mycareerbuild.com">Contact Support</a>
            </p>
        </div>
    </div>
</body>
</html>
`;

// Generic email sending function
export const sendEmail = async (
  to: string | string[],
  subject: string,
  content: string,
  fromEmail: string = EMAIL_ADDRESSES.NOREPLY,
  isHTML: boolean = true
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const mailOptions = {
      from: `MyCareerBuild <${fromEmail}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html: isHTML ? getBaseTemplate(content, subject) : undefined,
      text: isHTML ? undefined : content,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('❌ Failed to send email:', error);
    // Also log to file when enabled
    if (process.env.LOG_EMAIL_ERRORS_TO_FILE === 'true') {
      try {
        const logDir = path.resolve(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        const filePath = path.join(logDir, 'email-errors.log');
        const msg = `[${new Date().toISOString()}] Failed to send email to ${Array.isArray(to) ? to.join(',') : to} | subject=${subject} | error=${error.message}\n`;
        fs.appendFileSync(filePath, msg);
      } catch (fsErr) {
        console.error('Failed to write email error log:', fsErr);
      }
    }

    return {
      success: false,
      error: error.message,
    };
  }
};

// Registration confirmation email
export const sendRegistrationEmail = async (
  userEmail: string,
  userName: string,
  userRole: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const subject = 'Welcome to MCB Jobs';
  const content = `
    <h2>Welcome to MCB Jobs, ${userName}!</h2>
    <p>Thank you for registering with MCB Jobs. Your account has been created successfully.</p>
    <p>We're excited to have you join our community of ${userRole === 'employee' ? 'job seekers' : 'employers'}.</p>
    <p>Click the button below to log in to your account and get started:</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Login to Your Account</a>
    <p>If you have any questions, contact our support team at <a href="mailto:${EMAIL_ADDRESSES.SUPPORT}">${EMAIL_ADDRESSES.SUPPORT}</a>.</p>
    <p>Best regards,<br>The MCB Jobs Team</p>
  `;

  return await sendEmail(userEmail, subject, content, EMAIL_CONTEXTS.REGISTRATION);
};

// New job posting notification email
export const sendJobNotificationEmail = async (
  userEmails: string[],
  jobData: {
    title: string;
    company: string;
    location: string;
    experience: string;
    type: string;
    salary?: string;
    description: string;
    jobId: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const subject = `New Job Alert: ${jobData.title} at ${jobData.company}`;
  const jobUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${jobData.jobId}`;
  
  const content = `
    <h2>New Job Opportunity Available!</h2>
    <p>We found a new job posting that might interest you:</p>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #2563eb;">${jobData.title}</h3>
      <p style="margin: 5px 0; font-weight: 500;">${jobData.company}</p>
      <p style="margin: 5px 0; color: #64748b;">📍 ${jobData.location}</p>
      <p style="margin: 5px 0; color: #64748b;">💼 ${jobData.experience} • ${jobData.type}</p>
      ${jobData.salary ? `<p style="margin: 5px 0; color: #64748b;">💰 ${jobData.salary}</p>` : ''}
    </div>
    
    <p>${jobData.description.substring(0, 200)}${jobData.description.length > 200 ? '...' : ''}</p>
    
    <a href="${jobUrl}" class="button">Apply Now</a>
    
    <p>Don't miss out on this opportunity! Apply now to be considered for this position.</p>
    
    <p>Best regards,<br>The MyCareerBuild Team</p>
  `;

  return await sendEmail(userEmails, subject, content, EMAIL_CONTEXTS.JOB_NOTIFICATIONS);
};

// OTP email (enhanced version with proper subject and branding)
export const sendOTPEmail = async (
  email: string,
  otp: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const subject = 'Your MyCareerBuild OTP Code';
  const content = `
    <h2>Login Verification Code</h2>
    <p>Use the following code to complete your login:</p>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
      <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">
        ${otp}
      </div>
    </div>
    
    <p><strong>Your OTP is valid for 5 minutes.</strong></p>
    <p>If you didn't request this code, please ignore this email.</p>
    
    <p>Best regards,<br>The MyCareerBuild Team</p>
  `;

  return await sendEmail(email, subject, content, EMAIL_CONTEXTS.OTP);
};

// Admin notification email
export const sendAdminNotification = async (
  subject: string,
  content: string,
  adminEmails: string[] = ['admin@mycareerbuild.com']
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  return await sendEmail(adminEmails, subject, content, EMAIL_CONTEXTS.ADMIN_NOTIFICATIONS);
};

// Support response email
export const sendSupportResponse = async (
  userEmail: string,
  userName: string,
  ticketId: string,
  response: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const subject = `Re: Your Support Request #${ticketId}`;
  const content = `
    <h2>Support Response</h2>
    <p>Dear ${userName},</p>
    
    <p>Thank you for contacting mycareerbuild Jobs support. Here's our response to your inquiry:</p>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
      ${response}
    </div>
    
    <p>If you need further assistance, please reply to this email or contact us at <a href="mailto:support@mycareerbuild.com">support@mycareerbuild.com</a>.</p>
    
    <p>Best regards,<br>The mycareerbuild Jobs Support Team</p>
  `;

  return await sendEmail(userEmail, subject, content, EMAIL_CONTEXTS.SUPPORT);
};

// Business inquiry email
export const sendBusinessInquiry = async (
  to: string,
  subject: string,
  content: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  return await sendEmail(to, subject, content, EMAIL_CONTEXTS.BUSINESS_INQUIRIES);
};

// Sales email
export const sendSalesEmail = async (
  to: string,
  subject: string,
  content: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  return await sendEmail(to, subject, content, EMAIL_CONTEXTS.SALES);
};

// Error logging utility
export const logEmailError = (context: string, error: any, recipient?: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] Email Error in ${context}: ${error.message}`;
  
  if (recipient) {
    console.error(`${logMessage} | Recipient: ${recipient}`);
  } else {
    console.error(logMessage);
  }
  
  // In production, you might want to send this to a logging service
  // or write to a file
};

export default transporter;
