const { Application, User, Job } = require('./dist/models');
const path = require('path');

async function testApplicationResumeStorage() {
  try {
    console.log('🔍 Testing Application Resume Storage...\n');

    // 1. Check if applications table exists and has resumeUrl field
    console.log('1. Checking applications table structure...');
    const applications = await Application.findAll({
      limit: 1,
      attributes: ['id', 'userId', 'jobId', 'status', 'coverLetter', 'resumeUrl', 'appliedAt']
    });
    
    if (applications.length > 0) {
      console.log('✅ Applications table exists');
      console.log('📋 Sample application structure:', JSON.stringify(applications[0].toJSON(), null, 2));
    } else {
      console.log('⚠️  No applications found in database');
    }

    // 2. Check recent applications with resume URLs
    console.log('\n2. Checking recent applications with resume URLs...');
    const recentApplications = await Application.findAll({
      where: {
        resumeUrl: {
          [require('sequelize').Op.ne]: null
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'company']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    if (recentApplications.length > 0) {
      console.log(`✅ Found ${recentApplications.length} applications with resume URLs:`);
      recentApplications.forEach((app, index) => {
        console.log(`   ${index + 1}. Application ID: ${app.id}`);
        console.log(`      User: ${app.user?.name} (${app.user?.email})`);
        console.log(`      Job: ${app.job?.title} at ${app.job?.company}`);
        console.log(`      Resume URL: ${app.resumeUrl}`);
        console.log(`      Applied: ${app.appliedAt}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No applications with resume URLs found');
    }

    // 3. Check applications without resume URLs
    console.log('3. Checking applications without resume URLs...');
    const appsWithoutResume = await Application.findAll({
      where: {
        resumeUrl: null
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'resumeUrl']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    if (appsWithoutResume.length > 0) {
      console.log(`⚠️  Found ${appsWithoutResume.length} applications without resume URLs:`);
      appsWithoutResume.forEach((app, index) => {
        console.log(`   ${index + 1}. Application ID: ${app.id}`);
        console.log(`      User: ${app.user?.name} (${app.user?.email})`);
        console.log(`      User's Profile Resume: ${app.user?.resumeUrl || 'None'}`);
        console.log(`      Applied: ${app.appliedAt}`);
        console.log('');
      });
    } else {
      console.log('✅ All applications have resume URLs');
    }

    // 4. Check total statistics
    console.log('4. Application Statistics:');
    const totalApplications = await Application.count();
    const applicationsWithResume = await Application.count({
      where: {
        resumeUrl: {
          [require('sequelize').Op.ne]: null
        }
      }
    });
    const applicationsWithoutResumeCount = await Application.count({
      where: {
        resumeUrl: null
      }
    });

    console.log(`   Total Applications: ${totalApplications}`);
    console.log(`   With Resume URLs: ${applicationsWithResume}`);
    console.log(`   Without Resume URLs: ${applicationsWithoutResumeCount}`);
    console.log(`   Resume Coverage: ${totalApplications > 0 ? Math.round((applicationsWithResume / totalApplications) * 100) : 0}%`);

    // 5. Check if resume files exist on disk
    console.log('\n5. Checking resume files on disk...');
    const fs = require('fs');
    const uploadsPath = path.join(__dirname, 'uploads', 'cv-files');
    
    if (fs.existsSync(uploadsPath)) {
      const files = fs.readdirSync(uploadsPath);
      console.log(`✅ Uploads directory exists: ${uploadsPath}`);
      console.log(`📁 Found ${files.length} files in uploads/cv-files/`);
      
      if (files.length > 0) {
        console.log('   Files:');
        files.slice(0, 5).forEach(file => {
          const filePath = path.join(uploadsPath, file);
          const stats = fs.statSync(filePath);
          console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB, ${stats.mtime.toISOString()})`);
        });
        if (files.length > 5) {
          console.log(`   ... and ${files.length - 5} more files`);
        }
      }
    } else {
      console.log('⚠️  Uploads directory does not exist');
    }

    console.log('\n✅ Resume storage test completed!');

  } catch (error) {
    console.error('❌ Error testing resume storage:', error);
  }
}

// Run the test
testApplicationResumeStorage()
  .then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
