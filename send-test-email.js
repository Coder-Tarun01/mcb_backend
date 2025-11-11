const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendTestEmail() {
  console.log('📧 Sending test email to prasanthkathi05@gmail.com...');
  
  // Use current environment configuration
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER || 'tanasvi.dev@gmail.com',
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log('🔍 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    console.log('📤 Sending email...');
    const info = await transporter.sendMail({
      from: `"mycareerbuild Jobs" <${process.env.SMTP_USER || 'tanasvi.dev@gmail.com'}>`,
      to: 'prasanthkathi05@gmail.com',
      subject: 'Test Email from mycareerbuild Jobs System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">mycareerbuild Jobs</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Test Email</p>
            </div>
            
            <div style="padding: 30px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0;">Email System Test</h2>
              <p style="color: #64748b; margin: 0 0 30px 0; font-size: 16px;">
                This is a test email to verify that the mycareerbuild Jobs email system is working correctly.
              </p>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
                <div style="font-size: 24px; font-weight: bold; color: #2563eb;">
                  ✅ Email System Working!
                </div>
              </div>
              
              <p style="color: #64748b; margin: 20px 0 0 0; font-size: 14px;">
                If you received this email, the mycareerbuild Jobs email system is functioning properly.
              </p>
              
              <div style="margin-top: 30px; padding: 20px; background: #f1f5f9; border-radius: 8px;">
                <h3 style="color: #1e293b; margin: 0 0 10px 0;">Test Details:</h3>
                <ul style="color: #64748b; margin: 0; padding-left: 20px;">
                  <li>Sent at: ${new Date().toLocaleString()}</li>
                  <li>From: mycareerbuild Jobs System</li>
                  <li>SMTP: ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
                  <li>Status: Successfully Delivered</li>
                </ul>
              </div>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0;">© 2024 mycareerbuild Jobs. All rights reserved.</p>
              <p style="margin: 10px 0 0 0;">
                <a href="https://mycareerbuild.com" style="color: #2563eb; text-decoration: none;">Visit our website</a> | 
                <a href="mailto:support@mycareerbuild.com" style="color: #2563eb; text-decoration: none;">Contact Support</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        mycareerbuild Jobs - Test Email
        
        This is a test email to verify that the mycareerbuild Jobs email system is working correctly.
        
        If you received this email, the system is functioning properly.
        
        Test Details:
        - Sent at: ${new Date().toLocaleString()}
        - From: mycareerbuild Jobs System
        - SMTP: ${process.env.SMTP_HOST || 'smtp.gmail.com'}
        - Status: Successfully Delivered
        
        © 2024 mycareerbuild Jobs. All rights reserved.
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    console.log('📧 To: prasanthkathi05@gmail.com');
    console.log('📧 From:', process.env.SMTP_USER || 'tanasvi.dev@gmail.com');
    
    console.log('\n📋 Next steps:');
    console.log('1. Check your email inbox');
    console.log('2. Check spam/junk folder');
    console.log('3. Check promotions tab (Gmail)');
    console.log('4. Search for emails from:', process.env.SMTP_USER || 'tanasvi.dev@gmail.com');
    
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication Error:');
      console.log('- Check SMTP_USER and SMTP_PASS in .env');
      console.log('- Use app password instead of regular password');
      console.log('- Enable 2-factor authentication if using Gmail');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n🔧 Connection Error:');
      console.log('- Check SMTP_HOST and SMTP_PORT');
      console.log('- Verify server is accessible');
      console.log('- Check firewall settings');
    }
  }
}

sendTestEmail();
