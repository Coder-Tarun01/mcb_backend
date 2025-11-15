/**
 * Detailed AWS S3 Configuration Test
 * Run this to get more detailed error information
 */

import dotenv from 'dotenv';
import AWS from 'aws-sdk';

// Load environment variables
dotenv.config();

console.log('🔍 Detailed AWS S3 Configuration Test...\n');

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

async function detailedS3Test() {
  try {
    console.log('🧪 Testing S3 connection...');
    console.log('Bucket:', process.env.AWS_BUCKET_NAME);
    console.log('Region:', process.env.AWS_REGION);
    
    // Test 1: List buckets (to verify credentials work)
    console.log('\n1. Testing credentials by listing buckets...');
    const bucketsResult = await s3.listBuckets().promise();
    console.log('✅ Credentials are valid!');
    console.log('Available buckets:', bucketsResult.Buckets.map(b => b.Name));
    
    // Check if our bucket exists
    const bucketExists = bucketsResult.Buckets.some(b => b.Name === process.env.AWS_BUCKET_NAME);
    if (!bucketExists) {
      console.log(`❌ Bucket "${process.env.AWS_BUCKET_NAME}" not found in your account.`);
      console.log('Available buckets:', bucketsResult.Buckets.map(b => b.Name));
      return;
    }
    
    // Test 2: Check bucket access
    console.log('\n2. Testing bucket access...');
    const headResult = await s3.headBucket({
      Bucket: process.env.AWS_BUCKET_NAME
    }).promise();
    console.log('✅ Bucket access successful!');
    
    // Test 3: List objects in bucket
    console.log('\n3. Testing object listing...');
    const listResult = await s3.listObjectsV2({
      Bucket: process.env.AWS_BUCKET_NAME,
      MaxKeys: 5
    }).promise();
    console.log('✅ Object listing successful!');
    console.log('Objects in bucket:', listResult.KeyCount || 0);
    
    if (listResult.Contents && listResult.Contents.length > 0) {
      console.log('Sample objects:');
      listResult.Contents.forEach(obj => {
        console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
      });
    }
    
    console.log('\n🎉 All S3 tests passed! Your configuration is working correctly.');
    
  } catch (error) {
    console.error('❌ S3 test failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Status Code:', error.statusCode);
    
    if (error.code === 'NoSuchBucket') {
      console.error('💡 The bucket does not exist.');
    } else if (error.code === 'InvalidAccessKeyId') {
      console.error('💡 Invalid AWS Access Key ID.');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('💡 Invalid AWS Secret Access Key.');
    } else if (error.code === 'Forbidden' || error.code === 'AccessDenied') {
      console.error('💡 Access denied. Check your AWS IAM permissions.');
      console.error('Required permissions: s3:ListBucket, s3:GetObject, s3:PutObject');
    } else if (error.code === 'NoSuchRegion') {
      console.error('💡 Invalid AWS region.');
    }
  }
}

// Run the test
detailedS3Test();
