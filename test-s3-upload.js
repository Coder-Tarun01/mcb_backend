/**
 * AWS S3 Upload API Test File
 * Demonstrates how to use the upload endpoints
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Configuration
const API_BASE_URL = 'http://localhost:4000/api';
const UPLOAD_ENDPOINT = `${API_BASE_URL}/upload`;

/**
 * Test single file upload
 */
async function testSingleFileUpload() {
  try {
    console.log('🧪 Testing single file upload...');
    
    // Create a test file (you can replace this with an actual file path)
    const testFilePath = path.join(__dirname, 'test-image.jpg');
    
    // Check if test file exists, if not create a dummy one
    if (!fs.existsSync(testFilePath)) {
      console.log('⚠️ Test file not found. Please provide a real file path.');
      return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    
    // Optional: Add folder parameter
    formData.append('folder', 'test-uploads');

    // Make request
    const response = await axios.post(UPLOAD_ENDPOINT, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('✅ Single file upload successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Single file upload failed:', error.response?.data || error.message);
  }
}

/**
 * Test multiple files upload
 */
async function testMultipleFilesUpload() {
  try {
    console.log('🧪 Testing multiple files upload...');
    
    // Create form data
    const formData = new FormData();
    
    // Add multiple files (replace with actual file paths)
    const filePaths = [
      path.join(__dirname, 'test-image1.jpg'),
      path.join(__dirname, 'test-image2.png')
    ];

    // Check if files exist
    const existingFiles = filePaths.filter(filePath => fs.existsSync(filePath));
    
    if (existingFiles.length === 0) {
      console.log('⚠️ No test files found. Please provide real file paths.');
      return;
    }

    // Add existing files to form data
    existingFiles.forEach((filePath, index) => {
      formData.append('files', fs.createReadStream(filePath));
    });

    // Make request
    const response = await axios.post(`${UPLOAD_ENDPOINT}/multiple`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('✅ Multiple files upload successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Multiple files upload failed:', error.response?.data || error.message);
  }
}

/**
 * Test health check
 */
async function testHealthCheck() {
  try {
    console.log('🧪 Testing S3 health check...');
    
    const response = await axios.get(`${UPLOAD_ENDPOINT}/health`);
    
    console.log('✅ Health check successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Health check failed:', error.response?.data || error.message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting AWS S3 Upload API Tests...\n');
  
  await testHealthCheck();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testSingleFileUpload();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testMultipleFilesUpload();
  
  console.log('\n🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { testSingleFileUpload, testMultipleFilesUpload, testHealthCheck };
