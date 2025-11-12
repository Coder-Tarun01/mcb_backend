# mycareerbuild Jobs Email System Setup

## Environment Configuration

Add the following to your `.env` file:

```env
# SMTP Email Configuration (mycareerbuild Domain)
SMTP_HOST=mail.mycareerbuild.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@mycareerbuild.com
SMTP_PASS=YourEmailPassword

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email Domain Configuration
FROM_DOMAIN=mycareerbuild.com
```

## Available Email Addresses

The system is configured to use the following mycareerbuild domain email addresses:

- **info@mycareerbuild.com** - General contact / inquiries
- **careers@mycareerbuild.com** - Registration, career updates
- **noreply@mycareerbuild.com** - OTPs, system notifications
- **admin@mycareerbuild.com** - Internal admin notifications
- **business@mycareerbuild.com** - B2B partnership / corporate mails
- **sales@mycareerbuild.com** - Client / recruiter sales communication
- **support@mycareerbuild.com** - User issue responses

## Features Implemented

### 1. User Registration Email
- **Trigger:** After successful user registration
- **From:** careers@mycareerbuild.com
- **Subject:** "Welcome to mycareerbuild Jobs"
- **Content:** Welcome message with login link

### 2. New Job Post Notifications
- **Trigger:** When a new job is posted
- **From:** careers@mycareerbuild.com
- **Recipients:** All registered job seekers (employees)
- **Subject:** "New Job Alert: [Job Title] at [Company Name]"
- **Content:** Job details with "Apply Now" button

### 3. OTP Login Emails
- **Trigger:** When user requests OTP login
- **From:** noreply@mycareerbuild.com
- **Subject:** "Your OTP for mycareerbuild Jobs Login"
- **Content:** 6-digit OTP code with expiry information

### 4. Additional Email Functions
- Admin notifications
- Support responses
- Business inquiries
- Sales communications
- Custom email sending

## API Endpoints

### Test Email Connection
```
GET /api/email/test-connection
```

### Send Admin Notification
```
POST /api/email/admin-notification
Content-Type: application/json
Authorization: Bearer <token>

{
  "subject": "Admin Alert",
  "content": "Notification content",
  "adminEmails": ["admin@mycareerbuild.com"]
}
```

### Send Support Response
```
POST /api/email/support-response
Content-Type: application/json
Authorization: Bearer <token>

{
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "ticketId": "TICKET-123",
  "response": "Your issue has been resolved..."
}
```

### Send Business Inquiry
```
POST /api/email/business-inquiry
Content-Type: application/json
Authorization: Bearer <token>

{
  "to": "business@mycareerbuild.com",
  "subject": "Partnership Inquiry",
  "content": "We would like to discuss partnership opportunities..."
}
```

### Send Sales Email
```
POST /api/email/sales-email
Content-Type: application/json
Authorization: Bearer <token>

{
  "to": "client@company.com",
  "subject": "mycareerbuild Jobs Services",
  "content": "Discover our recruitment solutions..."
}
```

### Send Custom Email (Admin Only)
```
POST /api/email/custom-email
Content-Type: application/json
Authorization: Bearer <token>

{
  "to": ["user1@example.com", "user2@example.com"],
  "subject": "Custom Subject",
  "content": "Custom email content",
  "fromEmail": "info@mycareerbuild.com"
}
```

## Error Handling

- All email operations are non-blocking
- Failed emails are logged but don't break user flows
- Comprehensive error logging with context
- Graceful fallbacks for email service failures

## Security Features

- Environment-based configuration
- No hardcoded credentials
- Secure SMTP connection
- Proper authentication for email endpoints
- Role-based access control

## Scalability Features

- Template-based email system
- Easy to add new email types
- Support for HTML and text emails
- Batch email sending capability
- Extensible for multilingual support

## Testing

Test the email system:

1. **Test Connection:**
   ```bash
   curl -X GET http://localhost:4000/api/email/test-connection \
     -H "Authorization: Bearer <your-token>"
   ```

2. **Test Registration Email:**
   - Register a new user through the API
   - Check if welcome email is sent

3. **Test Job Notification:**
   - Create a new job posting
   - Check if notification emails are sent to job seekers

4. **Test OTP Email:**
   - Use OTP login feature
   - Check if OTP email is received

## Troubleshooting

### Common Issues:

1. **SMTP Connection Failed:**
   - Verify SMTP credentials in `.env`
   - Check if SMTP server is accessible
   - Ensure correct port and security settings

2. **Emails Not Being Sent:**
   - Check email service logs
   - Verify recipient email addresses
   - Check spam folders

3. **Authentication Errors:**
   - Ensure proper JWT token
   - Check user permissions
   - Verify role-based access

### Logs to Check:

- Server console logs for email sending status
- SMTP server logs for delivery issues
- Application error logs for configuration problems

## Future Enhancements

- Email templates management UI
- Email analytics and tracking
- Bulk email campaigns
- Email scheduling
- Advanced email personalization
- Multi-language email support
