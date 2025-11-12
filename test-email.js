const nodemailer = require('nodemailer');
require('dotenv').config();

// Test email configuration
const testEmailConfig = {
  host: process.env.SMTP_HOST || 'mail.mycareerbuild.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER || 'tanasvi.dev@gmail.com',
    pass: process.env.SMTP_PASS,
  },
};

console.log('Testing email configuration:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_SECURE:', process.env.SMTP_SECURE);

async function testEmailConnection() {
  try {
    console.log('\n🔍 Testing SMTP connection...');
    const transporter = nodemailer.createTransport(testEmailConfig);
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Send test email
    console.log('\n📧 Sending test email...');
    const testEmail = {
      from: `"mycareerbuild Jobs" <${process.env.SMTP_USER}>`,
      to: 'prasanthkathi05@gmail.com',
      subject: 'Test Email from mycareerbuild Jobs',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">mycareerbuild Jobs</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Test Email</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0;">Email System Test</h2>
            <p style="color: #64748b; margin: 0 0 30px 0; font-size: 16px;">
              This is a test email to verify that the email system is working correctly.
            </p>
            
            <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <div style="font-size: 24px; font-weight: bold; color: #2563eb;">
                ✅ Email System Working!
              </div>
            </div>
            
            <p style="color: #64748b; margin: 20px 0 0 0; font-size: 14px;">
              If you received this email, the system is working correctly.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f1f5f9; border-radius: 8px;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
              This is a test email from mycareerbuild Jobs system.
            </p>
            <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">
              Sent at: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `,
      text: `
        mycareerbuild Jobs - Test Email
        
        This is a test email to verify that the email system is working correctly.
        
        If you received this email, the system is working correctly.
        
        Sent at: ${new Date().toLocaleString()}
      `
    };

    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
    console.log('\n📋 Next steps:');
    console.log('1. Check your email inbox');
    console.log('2. Check spam/junk folder');
    console.log('3. Check promotions tab (Gmail)');
    console.log('4. Search for emails from:', process.env.SMTP_USER);
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication Error - Possible fixes:');
      console.log('1. Check SMTP_USER and SMTP_PASS in .env');
      console.log('2. Use app password instead of regular password');
      console.log('3. Enable 2-factor authentication if using Gmail');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n🔧 Connection Error - Possible fixes:');
      console.log('1. Check SMTP_HOST and SMTP_PORT');
      console.log('2. Verify server is accessible');
      console.log('3. Check firewall settings');
    }
  }
}

// Run the test
testEmailConnection();
