const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendSimpleTest() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'tanasvi.dev@gmail.com',
      pass: 'hhyk vand igwj hyqb'
    }
  });

  try {
    console.log('📧 Sending simple test email via Gmail SMTP...');
    
    const info = await transporter.sendMail({
      from: '"mycareerbuild Jobs" <tanasvi.dev@gmail.com>',
      to: 'prasanthkathi05@gmail.com',
      subject: 'Simple Test - mycareerbuild Jobs',
      text: 'This is a simple test email to check delivery.',
      html: '<h1>Test Email</h1><p>This is a simple test email to check delivery.</p>'
    });

    console.log('✅ Email sent via Gmail SMTP!');
    console.log('Message ID:', info.messageId);
    console.log('Check your inbox now!');
    
  } catch (error) {
    console.error('❌ Gmail SMTP failed:', error.message);
  }
}

sendSimpleTest();
