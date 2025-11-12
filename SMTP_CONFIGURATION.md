# mycareerbuild SMTP Configuration

## Updated Environment Variables

Your SMTP configuration has been updated to use the mycareerbuild domain:

```env
# SMTP Email Configuration (mycareerbuild Domain)
SMTP_HOST=mail.mycareerbuild.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=tanasvi.dev@gmail.com
SMTP_PASS=hhyk vand igwj hyqb

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email Domain Configuration
FROM_DOMAIN=mycareerbuild.com
```

## Updated Email Addresses

The system now uses the following mycareerbuild domain email addresses:

- **info@mycareerbuild.com** - General contact / inquiries
- **careers@mycareerbuild.com** - Registration, career updates
- **noreply@mycareerbuild.com** - OTPs, system notifications
- **admin@mycareerbuild.com** - Internal admin notifications
- **business@mycareerbuild.com** - B2B partnership / corporate mails
- **sales@mycareerbuild.com** - Client / recruiter sales communication
- **support@mycareerbuild.com** - User issue responses

## Email Templates Updated

All email templates have been updated with:

- **Branding:** "mycareerbuild Jobs" instead of "MCB Jobs"
- **Domain:** All email addresses now use @mycareerbuild.com
- **Website Links:** Updated to https://mycareerbuild.com
- **Footer:** Updated copyright and branding

## Features Ready

✅ **User Registration Emails**
- From: careers@mycareerbuild.com
- Subject: "Welcome to mycareerbuild Jobs"
- Professional welcome message with login link

✅ **Job Notification Emails**
- From: careers@mycareerbuild.com
- Subject: "New Job Alert: [Job Title] at [Company Name]"
- Sent to all job seekers when new jobs are posted

✅ **OTP Login Emails**
- From: noreply@mycareerbuild.com
- Subject: "Your OTP for mycareerbuild Jobs Login"
- Professional 6-digit OTP with expiry information

✅ **Admin & Support Emails**
- Admin notifications from admin@mycareerbuild.com
- Support responses from support@mycareerbuild.com
- Business inquiries from business@mycareerbuild.com
- Sales communications from sales@mycareerbuild.com

## Testing the Configuration

1. **Test SMTP Connection:**
   ```bash
   curl -X GET http://localhost:4000/api/email/test-connection \
     -H "Authorization: Bearer <your-token>"
   ```

2. **Test Registration Email:**
   - Register a new user
   - Check for welcome email from careers@mycareerbuild.com

3. **Test Job Notifications:**
   - Create a new job posting
   - Check if notification emails are sent to job seekers

4. **Test OTP Email:**
   - Use OTP login feature
   - Check for OTP email from noreply@mycareerbuild.com

## SMTP Server Details

- **Host:** mail.mycareerbuild.com
- **Port:** 465 (SSL)
- **Security:** SSL/TLS
- **Authentication:** Username/Password
- **Username:** tanasvi.dev@gmail.com
- **Password:** hhyk vand igwj hyqb

## Security Notes

- SMTP credentials are stored in environment variables
- SSL/TLS encryption is enabled
- No hardcoded credentials in the code
- Role-based access control for email endpoints

## Troubleshooting

If emails are not being sent:

1. **Check SMTP Credentials:**
   - Verify username and password in .env
   - Ensure app password is used (not regular password)

2. **Check SMTP Server:**
   - Verify mail.mycareerbuild.com is accessible
   - Check if port 465 is open

3. **Check Logs:**
   - Server console logs for email sending status
   - Check for authentication errors

4. **Test Connection:**
   - Use the test-connection endpoint
   - Verify SMTP server responds

## Ready for Production

The email system is now configured with your mycareerbuild domain and ready for production use. All email templates, addresses, and branding have been updated to reflect your domain.
