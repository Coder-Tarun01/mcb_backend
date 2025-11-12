const axios = require('axios');

async function testAllJobFields() {
  try {
    console.log('🔍 Testing ALL job card fields...\n');
    
    // Test the jobs API endpoint
    const response = await axios.get('http://localhost:5000/api/jobs');
    const jobs = response.data;
    
    console.log(`📊 Found ${jobs.length} jobs with complete field analysis:\n`);
    
    jobs.forEach((job, index) => {
      console.log(`\n📋 JOB ${index + 1}: ${job.title}`);
      console.log('=' .repeat(50));
      
      // Basic Info
      console.log(`🏢 Company: ${job.company}`);
      console.log(`📍 Location: ${job.location}`);
      console.log(`🏷️  Type: ${job.type || 'Not specified'}`);
      console.log(`📂 Category: ${job.category || 'Not specified'}`);
      console.log(`🌐 Remote: ${job.isRemote ? 'Yes' : 'No'}`);
      
      // Experience & Skills
      console.log(`💼 Experience: ${job.experienceLevel || 'Not specified'}`);
      console.log(`🎯 Skills: ${job.skills ? job.skills.join(', ') : 'Not specified'}`);
      
      // Salary
      if (job.salary && job.salary.min && job.salary.max) {
        const currency = job.salary.currency === 'INR' ? '₹' : '$';
        console.log(`💰 Salary: ${currency}${job.salary.min.toLocaleString()}-${currency}${job.salary.max.toLocaleString()}`);
      } else {
        console.log(`💰 Salary: Not specified`);
      }
      
      // Additional Info
      console.log(`👥 Vacancies: ${job.vacancies || 'Not specified'}`);
      console.log(`📅 Posted: ${job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'Not specified'}`);
      console.log(`⏰ Deadline: ${job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'Not specified'}`);
      console.log(`🎓 Education: ${job.educationRequired || 'Not specified'}`);
      
      // Contact Info
      console.log(`🌐 Website: ${job.companyWebsite || 'Not specified'}`);
      console.log(`📧 Email: ${job.contactEmail || 'Not specified'}`);
      console.log(`📞 Phone: ${job.contactPhone || 'Not specified'}`);
      
      // Status
      console.log(`📊 Status: ${job.status || 'Not specified'}`);
      console.log(`⭐ Rating: ${job.rating || 'Not specified'}`);
      console.log(`👥 Applicants: ${job.applicantsCount || 0}`);
      console.log(`🆕 New Job: ${job.isNew ? 'Yes' : 'No'}`);
      console.log(`🔖 Bookmarked: ${job.isBookmarked ? 'Yes' : 'No'}`);
    });
    
    // Test individual job endpoint
    if (jobs.length > 0) {
      console.log('\n\n🔍 Testing individual job endpoint...');
      const jobId = jobs[0].id;
      const jobResponse = await axios.get(`http://localhost:5000/api/jobs/${jobId}`);
      const singleJob = jobResponse.data;
      
      console.log(`\n📋 SINGLE JOB DETAILS for ID ${jobId}:`);
      console.log('=' .repeat(50));
      console.log(`Title: ${singleJob.title}`);
      console.log(`Company: ${singleJob.company}`);
      console.log(`All fields available: ${Object.keys(singleJob).length} fields`);
      console.log(`Fields: ${Object.keys(singleJob).join(', ')}`);
    }
    
    console.log('\n✅ All job fields test completed!');
    
  } catch (error) {
    console.error('❌ Error testing job fields:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAllJobFields();
