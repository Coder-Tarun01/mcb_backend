/**
 * Direct Bucket Access Test
 * Tests S3 bucket access without listing buckets
 */

import dotenv from 'dotenv';
import AWS from 'aws-sdk';

// Load environment variables
dotenv.config();

console.log('🔍 Direct Bucket Access Test...\n');

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

async function testDirectBucketAccess() {
  try {
    console.log('🧪 Testing direct bucket access...');
    console.log('Bucket:', process.env.AWS_BUCKET_NAME);
    console.log('Region:', process.env.AWS_REGION);
    
    // Test 1: Check if bucket exists and is accessible
    console.log('\n1. Testing bucket existence and access...');
    const headResult = await s3.headBucket({
      Bucket: process.env.AWS_BUCKET_NAME
    }).promise();
    console.log('✅ Bucket exists and is accessible!');
    
    // Test 2: List objects in bucket
    console.log('\n2. Testing object listing...');
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
    
    // Test 3: Test upload capability (upload a small test file)
    console.log('\n3. Testing upload capability...');
    const testKey = `test-upload-${Date.now()}.txt`;
    const testContent = 'This is a test file for S3 upload verification.';
    
    const uploadResult = await s3.upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
      ACL: 'public-read'
    }).promise();
    
    console.log('✅ Upload test successful!');
    console.log('Uploaded file URL:', uploadResult.Location);
    
    // Test 4: Clean up test file
    console.log('\n4. Cleaning up test file...');
    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: testKey
    }).promise();
    console.log('✅ Test file cleaned up!');
    
    console.log('\n🎉 All S3 tests passed! Your configuration is working correctly.');
    console.log('✅ Your S3 upload API should work perfectly!');
    
  } catch (error) {
    console.error('❌ S3 test failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Status Code:', error.statusCode);
    
    if (error.code === 'NoSuchBucket') {
      console.error('💡 The bucket does not exist or is in a different region.');
    } else if (error.code === 'InvalidAccessKeyId') {
      console.error('💡 Invalid AWS Access Key ID.');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('💡 Invalid AWS Secret Access Key.');
    } else if (error.code === 'Forbidden' || error.code === 'AccessDenied') {
      console.error('💡 Access denied. Check your AWS IAM permissions.');
      console.error('Required permissions for the bucket:');
      console.error('  - s3:GetObject');
      console.error('  - s3:PutObject');
      console.error('  - s3:DeleteObject');
      console.error('  - s3:ListBucket');
    } else if (error.code === 'NoSuchRegion') {
      console.error('💡 Invalid AWS region.');
    }
  }
}

// Run the test
testDirectBucketAccess();
