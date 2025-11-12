const nodemailer = require('nodemailer');
require('dotenv').config();

// Test different email configurations
const emailConfigs = [
  {
    name: 'Current Configuration',
    host: 'mail.mycareerbuild.com',
    port: 465,
    secure: true,
    auth: {
      user: 'support@mycareerbuild.com',
      pass: 'Tanasvi@123',
    }
  },
  {
    name: 'Alternative Email 1',
    host: 'mail.mycareerbuild.com',
    port: 465,
    secure: true,
    auth: {
      user: 'info@mycareerbuild.com',
      pass: 'Tanasvi@123',
    }
  },
  {
    name: 'Alternative Email 2',
    host: 'mail.mycareerbuild.com',
    port: 465,
    secure: true,
    auth: {
      user: 'noreply@mycareerbuild.com',
      pass: 'Tanasvi@123',
    }
  },
  {
    name: 'Alternative Email 3',
    host: 'mail.mycareerbuild.com',
    port: 465,
    secure: true,
    auth: {
      user: 'admin@mycareerbuild.com',
      pass: 'Tanasvi@123',
    }
  },
  {
    name: 'Alternative Email 4',
    host: 'mail.mycareerbuild.com',
    port: 465,
    secure: true,
    auth: {
      user: 'careers@mycareerbuild.com',
      pass: 'Tanasvi@123',
    }
  },
  {
    name: 'Port 587 Configuration',
    host: 'mail.mycareerbuild.com',
    port: 587,
    secure: false,
    auth: {
      user: 'support@mycareerbuild.com',
      pass: 'Tanasvi@123',
    }
  }
];

async function testEmailConfig(config) {
  console.log(`\n🔍 Testing: ${config.name}`);
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   User: ${config.auth.user}`);
  console.log(`   Secure: ${config.secure}`);
  
  const transporter = nodemailer.createTransport({
    ...config,
    logger: false,
    debug: false,
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
    }
  });

  try {
    await transporter.verify();
    console.log(`   ✅ SUCCESS! Authentication successful`);
    return { success: true, config };
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Testing Email Configurations for MyCareerBuild');
  console.log('================================================');
  
  const results = [];
  
  for (const config of emailConfigs) {
    const result = await testEmailConfig(config);
    results.push({ ...result, config });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const successfulConfigs = results.filter(r => r.success);
  
  if (successfulConfigs.length > 0) {
    console.log('✅ Working configurations found:');
    successfulConfigs.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.config.name}`);
      console.log(`      Email: ${result.config.auth.user}`);
      console.log(`      Host: ${result.config.host}:${result.config.port}`);
      console.log(`      Secure: ${result.config.secure}`);
    });
    
    console.log('\n💡 To use a working configuration, update your .env file:');
    const workingConfig = successfulConfigs[0].config;
    console.log(`   SMTP_HOST=${workingConfig.host}`);
    console.log(`   SMTP_PORT=${workingConfig.port}`);
    console.log(`   SMTP_SECURE=${workingConfig.secure}`);
    console.log(`   SMTP_USER=${workingConfig.auth.user}`);
    console.log(`   SMTP_PASS=${workingConfig.auth.pass}`);
    
  } else {
    console.log('❌ No working configurations found.');
    console.log('\n🔧 Possible solutions:');
    console.log('   1. Check if email accounts exist in cPanel');
    console.log('   2. Verify passwords are correct');
    console.log('   3. Check if email accounts are active');
    console.log('   4. Contact your hosting provider for SMTP settings');
    console.log('   5. Try using a different email service (Gmail, etc.)');
  }
  
  console.log('\n📧 Next Steps:');
  console.log('   1. Update .env file with working credentials');
  console.log('   2. Restart your server: npm run dev');
  console.log('   3. Test OTP sending from your frontend');
}

main().catch(console.error);
