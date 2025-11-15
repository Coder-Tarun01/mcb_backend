/**
 * Quick AWS S3 Configuration Test
 * Run this to test if AWS credentials are working
 */

import dotenv from 'dotenv';
import AWS from 'aws-sdk';

// Load environment variables
dotenv.config();

console.log('🔍 Testing AWS S3 Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing');
console.log('AWS_REGION:', process.env.AWS_REGION || '❌ Missing');
console.log('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME || '❌ Missing');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-2'
});

// Create S3 instance
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

async function testS3Connection() {
  try {
    console.log('\n🧪 Testing S3 connection...');
    
    // Test bucket access
    const result = await s3.headBucket({
      Bucket: process.env.AWS_BUCKET_NAME
    }).promise();
    
    console.log('✅ S3 bucket access successful!');
    console.log('Bucket:', process.env.AWS_BUCKET_NAME);
    console.log('Region:', process.env.AWS_REGION);
    
    // Test listing objects (limited to 1)
    const listResult = await s3.listObjectsV2({
      Bucket: process.env.AWS_BUCKET_NAME,
      MaxKeys: 1
    }).promise();
    
    console.log('✅ S3 list objects successful!');
    console.log('Objects in bucket:', listResult.KeyCount || 0);
    
  } catch (error) {
    console.error('❌ S3 connection failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'NoSuchBucket') {
      console.error('💡 The bucket does not exist or you don\'t have access to it.');
    } else if (error.code === 'InvalidAccessKeyId') {
      console.error('💡 Invalid AWS Access Key ID.');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('💡 Invalid AWS Secret Access Key.');
    } else if (error.code === 'Forbidden') {
      console.error('💡 Access denied. Check your AWS permissions.');
    }
  }
}

// Run the test
testS3Connection();
