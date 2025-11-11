const nodemailer = require('nodemailer');
require('dotenv').config();

// Test email configuration
const testEmailConfig = {
  host: process.env.SMTP_HOST || 'mail.mycareerbuild.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER || 'support@mycareerbuild.com',
    pass: process.env.SMTP_PASS || 'Tanasvi@123',
  },
  logger: true,
  debug: true,
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  tls: {
    rejectUnauthorized: false,
    ciphers: 'TLSv1.2',
    secureProtocol: 'TLSv1_2_method'
  }
};

async function testEmailConnection() {
  console.log('🔍 Testing email connection...');
  console.log('Configuration:', {
    host: testEmailConfig.host,
    port: testEmailConfig.port,
    secure: testEmailConfig.secure,
    user: testEmailConfig.auth.user
  });

  try {
    const transporter = nodemailer.createTransport(testEmailConfig);
    
    // Verify connection
    await transporter.verify();
    console.log('✅ Email server connection verified');
    
    return transporter;
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    return null;
  }
}

async function sendTestOTP(transporter, testEmail) {
  console.log(`📧 Sending test OTP to ${testEmail}...`);
  
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  const mailOptions = {
    from: `MyCareerBuild <${testEmailConfig.auth.user}>`,
    to: testEmail,
    subject: 'Your MyCareerBuild OTP Code',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your MyCareerBuild OTP Code</title>
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
              .otp-box {
                  background: #f8fafc;
                  padding: 20px;
                  border-radius: 6px;
                  text-align: center;
                  margin: 20px 0;
              }
              .otp-code {
                  font-size: 32px;
                  font-weight: bold;
                  color: #2563eb;
                  letter-spacing: 8px;
                  font-family: 'Courier New', monospace;
              }
              .footer {
                  background: #f8fafc;
                  padding: 20px;
                  text-align: center;
                  color: #64748b;
                  font-size: 14px;
                  border-top: 1px solid #e2e8f0;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>MyCareerBuild</h1>
              </div>
              <div class="content">
                  <h2>Login Verification Code</h2>
                  <p>Use the following code to complete your login:</p>
                  
                  <div class="otp-box">
                      <div class="otp-code">${otp}</div>
                  </div>
                  
                  <p><strong>Your OTP is valid for 5 minutes.</strong></p>
                  <p>If you didn't request this code, please ignore this email.</p>
                  
                  <p>Best regards,<br>The MyCareerBuild Team</p>
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
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent successfully to ${testEmail}: ${info.messageId}`);
    console.log(`OTP Code: ${otp}`);
    return { success: true, messageId: info.messageId, otp };
  } catch (error) {
    console.error(`❌ Failed to send OTP to ${testEmail}:`, error);
    return { success: false, error: error.message };
  }
}

async function sendTestRegistrationEmail(transporter, testEmail) {
  console.log(`📧 Sending test registration email to ${testEmail}...`);
  
  const mailOptions = {
    from: `MyCareerBuild <careers@mycareerbuild.com>`,
    to: testEmail,
    subject: 'Welcome to MyCareerBuild!',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to MyCareerBuild!</title>
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
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>MyCareerBuild</h1>
              </div>
              <div class="content">
                  <h2>Welcome to MyCareerBuild, Test User!</h2>
                  <p>Welcome to MyCareerBuild! Your account has been created successfully.</p>
                  
                  <p>Thank you for registering with MyCareerBuild. We're excited to have you join our community of job seekers.</p>
                  
                  <p>Your account has been successfully created and you can now:</p>
                  <ul>
                      <li>Browse and apply to thousands of job opportunities</li>
                      <li>Create and manage your professional profile</li>
                      <li>Get personalized job recommendations</li>
                  </ul>
                  
                  <p>Ready to get started? Click the button below to log in to your account:</p>
                  <a href="http://localhost:3000/login" class="button">Login to Your Account</a>
                  
                  <p>If you have any questions or need assistance, feel free to contact our support team at <a href="mailto:support@mycareerbuild.com">support@mycareerbuild.com</a>.</p>
                  
                  <p>Best regards,<br>The MyCareerBuild Team</p>
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
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Registration email sent successfully to ${testEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send registration email to ${testEmail}:`, error);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting MyCareerBuild Email System Test');
  console.log('==========================================');
  
  // Test email address (replace with your Gmail)
  const testEmail = process.argv[2] || 'your-email@gmail.com';
  
  if (testEmail === 'your-email@gmail.com') {
    console.log('⚠️  Please provide a test email address as an argument:');
    console.log('   node test-email-system.js your-email@gmail.com');
    console.log('');
    console.log('Using default test email for configuration test only...');
  }
  
  // Test 1: Email Connection
  const transporter = await testEmailConnection();
  if (!transporter) {
    console.log('❌ Email connection test failed. Exiting...');
    process.exit(1);
  }
  
  console.log('');
  
  // Test 2: Send OTP Email
  if (testEmail !== 'your-email@gmail.com') {
    const otpResult = await sendTestOTP(transporter, testEmail);
    console.log('');
    
    // Test 3: Send Registration Email
    const regResult = await sendTestRegistrationEmail(transporter, testEmail);
    console.log('');
    
    // Summary
    console.log('📊 Test Summary:');
    console.log('================');
    console.log(`✅ Email Connection: PASSED`);
    console.log(`${otpResult.success ? '✅' : '❌'} OTP Email: ${otpResult.success ? 'PASSED' : 'FAILED'}`);
    console.log(`${regResult.success ? '✅' : '❌'} Registration Email: ${regResult.success ? 'PASSED' : 'FAILED'}`);
    
    if (otpResult.success && regResult.success) {
      console.log('');
      console.log('🎉 All email tests passed! Check your inbox for the test emails.');
    } else {
      console.log('');
      console.log('⚠️  Some tests failed. Check the error messages above.');
    }
  } else {
    console.log('✅ Email connection test passed!');
    console.log('💡 To test email sending, run: node test-email-system.js your-email@gmail.com');
  }
}

main().catch(console.error);
