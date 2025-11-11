/**
 * Simple S3 Permission Test
 * Tests individual S3 operations to identify specific permission issues
 */

import dotenv from 'dotenv';
import AWS from 'aws-sdk';

// Load environment variables
dotenv.config();

console.log('🔍 Simple S3 Permission Test...\n');

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

async function testIndividualPermissions() {
  const bucketName = process.env.AWS_BUCKET_NAME;
  
  console.log('Testing bucket:', bucketName);
  console.log('Testing region:', process.env.AWS_REGION);
  console.log('User ARN: arn:aws:iam::992382389110:user/tanasvi\n');

  // Test 1: ListBucket permission
  try {
    console.log('1. Testing ListBucket permission...');
    await s3.listObjectsV2({
      Bucket: bucketName,
      MaxKeys: 1
    }).promise();
    console.log('✅ ListBucket: SUCCESS');
  } catch (error) {
    console.log('❌ ListBucket: FAILED');
    console.log('   Error:', error.code, '-', error.message);
  }

  // Test 2: PutObject permission
  try {
    console.log('\n2. Testing PutObject permission...');
    const testKey = `test-permission-${Date.now()}.txt`;
    await s3.putObject({
      Bucket: bucketName,
      Key: testKey,
      Body: 'test content',
      ContentType: 'text/plain'
    }).promise();
    console.log('✅ PutObject: SUCCESS');
    
    // Test 3: GetObject permission
    try {
      console.log('\n3. Testing GetObject permission...');
      await s3.getObject({
        Bucket: bucketName,
        Key: testKey
      }).promise();
      console.log('✅ GetObject: SUCCESS');
    } catch (error) {
      console.log('❌ GetObject: FAILED');
      console.log('   Error:', error.code, '-', error.message);
    }

    // Test 4: DeleteObject permission
    try {
      console.log('\n4. Testing DeleteObject permission...');
      await s3.deleteObject({
        Bucket: bucketName,
        Key: testKey
      }).promise();
      console.log('✅ DeleteObject: SUCCESS');
    } catch (error) {
      console.log('❌ DeleteObject: FAILED');
      console.log('   Error:', error.code, '-', error.message);
    }

  } catch (error) {
    console.log('❌ PutObject: FAILED');
    console.log('   Error:', error.code, '-', error.message);
  }

  // Test 5: HeadBucket permission
  try {
    console.log('\n5. Testing HeadBucket permission...');
    await s3.headBucket({
      Bucket: bucketName
    }).promise();
    console.log('✅ HeadBucket: SUCCESS');
  } catch (error) {
    console.log('❌ HeadBucket: FAILED');
    console.log('   Error:', error.code, '-', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('If any tests failed, those specific permissions are missing.');
  console.log('Check your bucket policy and IAM user policies for conflicts.');
}

// Run the test
testIndividualPermissions();
