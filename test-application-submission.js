const { Application, User, Job } = require('./dist/models');
const fs = require('fs');
const path = require('path');

async function testApplicationSubmission() {
  try {
    console.log('🧪 Testing Application Submission Process...\n');

    // 1. Check if we have users and jobs
    console.log('1. Checking available users and jobs...');
    const users = await User.findAll({ limit: 1 });
    const jobs = await Job.findAll({ limit: 1 });
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    if (jobs.length === 0) {
      console.log('❌ No jobs found in database');
      return;
    }
    
    console.log(`✅ Found ${users.length} user(s) and ${jobs.length} job(s)`);
    console.log(`   User: ${users[0].name} (${users[0].email})`);
    console.log(`   Job: ${jobs[0].title} at ${jobs[0].company}`);

    // 2. Create a test application
    console.log('\n2. Creating test application...');
    const testApplication = await Application.create({
      userId: users[0].id,
      jobId: jobs[0].id,
      status: 'pending',
      coverLetter: 'This is a test application to verify the system is working.',
      resumeUrl: '/uploads/cv-files/test-resume.pdf',
      // Additional application data
      name: users[0].name,
      email: users[0].email,
      phone: users[0].phone || '123-456-7890',
      location: users[0].location || 'Test City',
      experience: '5 years',
      currentJobTitle: 'Software Developer',
      currentCompany: 'Test Company',
      currentCTC: '50000',
      expectedCTC: '60000',
      noticePeriod: '1 month',
      skills: 'JavaScript, React, Node.js',
      qualification: 'Bachelor of Engineering',
      specialization: 'Computer Science',
      university: 'Test University',
      yearOfPassing: '2020',
      linkedin: 'https://linkedin.com/in/test',
      portfolio: 'https://testportfolio.com',
      github: 'https://github.com/test'
    });

    console.log('✅ Test application created successfully!');
    console.log(`   Application ID: ${testApplication.id}`);
    console.log(`   User: ${testApplication.name} (${testApplication.email})`);
    console.log(`   Job: ${testApplication.jobId}`);
    console.log(`   Resume URL: ${testApplication.resumeUrl}`);
    console.log(`   Skills: ${testApplication.skills}`);

    // 3. Verify the application was stored
    console.log('\n3. Verifying application storage...');
    const storedApplication = await Application.findByPk(testApplication.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: Job, as: 'job', attributes: ['id', 'title', 'company'] }
      ]
    });

    if (storedApplication) {
      console.log('✅ Application successfully stored in database!');
      console.log('📋 Application Details:');
      console.log(`   ID: ${storedApplication.id}`);
      console.log(`   Status: ${storedApplication.status}`);
      console.log(`   Cover Letter: ${storedApplication.coverLetter}`);
      console.log(`   Resume URL: ${storedApplication.resumeUrl}`);
      console.log(`   Name: ${storedApplication.name}`);
      console.log(`   Email: ${storedApplication.email}`);
      console.log(`   Phone: ${storedApplication.phone}`);
      console.log(`   Experience: ${storedApplication.experience}`);
      console.log(`   Skills: ${storedApplication.skills}`);
      console.log(`   Applied At: ${storedApplication.appliedAt}`);
    } else {
      console.log('❌ Application not found in database');
    }

    // 4. Test application statistics
    console.log('\n4. Testing application statistics...');
    const totalApplications = await Application.count();
    const applicationsWithResume = await Application.count({
      where: {
        resumeUrl: {
          [require('sequelize').Op.ne]: null
        }
      }
    });

    console.log(`📊 Application Statistics:`);
    console.log(`   Total Applications: ${totalApplications}`);
    console.log(`   With Resume URLs: ${applicationsWithResume}`);
    console.log(`   Resume Coverage: ${totalApplications > 0 ? Math.round((applicationsWithResume / totalApplications) * 100) : 0}%`);

    console.log('\n✅ Application submission test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing application submission:', error);
  }
}

// Run the test
testApplicationSubmission()
  .then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
