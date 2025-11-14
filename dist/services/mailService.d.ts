import nodemailer from 'nodemailer';
export declare const EMAIL_ADDRESSES: {
    readonly INFO: `info@${string}`;
    readonly CAREERS: `careers@${string}`;
    readonly NOREPLY: `noreply@${string}`;
    readonly ADMIN: `admin@${string}`;
    readonly BUSINESS: `business@${string}`;
    readonly SALES: `sales@${string}`;
    readonly SUPPORT: `support@${string}`;
};
export declare const EMAIL_CONTEXTS: {
    readonly REGISTRATION: `careers@${string}`;
    readonly JOB_NOTIFICATIONS: `noreply@${string}`;
    readonly OTP: `noreply@${string}`;
    readonly ADMIN_NOTIFICATIONS: `admin@${string}`;
    readonly BUSINESS_INQUIRIES: `business@${string}`;
    readonly SALES: `sales@${string}`;
    readonly SUPPORT: `support@${string}`;
    readonly GENERAL: `info@${string}`;
};
declare const transporter: nodemailer.Transporter<import("nodemailer/lib/smtp-transport").SentMessageInfo, import("nodemailer/lib/smtp-transport").Options>;
export declare const verifyEmailConnection: () => Promise<boolean>;
export declare const sendEmail: (to: string | string[], subject: string, content: string, fromEmail?: string, isHTML?: boolean) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export declare const sendRegistrationEmail: (userEmail: string, userName: string, userRole: string) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export declare const sendJobNotificationEmail: (userEmails: string[], jobData: {
    title: string;
    company: string;
    location: string;
    experience: string;
    type: string;
    salary?: string;
    description: string;
    jobId: string;
}) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export declare const sendOTPEmail: (email: string, otp: string) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export declare const sendAdminNotification: (subject: string, content: string, adminEmails?: string[]) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export declare const sendSupportResponse: (userEmail: string, userName: string, ticketId: string, response: string) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export declare const sendBusinessInquiry: (to: string, subject: string, content: string) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export declare const sendSalesEmail: (to: string, subject: string, content: string) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export declare const logEmailError: (context: string, error: any, recipient?: string) => void;
export default transporter;
//# sourceMappingURL=mailService.d.ts.map