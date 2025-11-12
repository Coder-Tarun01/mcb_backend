// Load environment variables
require('dotenv').config();
const { sequelize } = require('../../dist/config/database');

async function populateJobFields() {
  try {
    console.log('🚀 Starting job fields population...');
    
    // Update existing jobs with sample enhanced data
    const updateQueries = [
      // Update job 1
      `UPDATE jobs SET 
        jobDescription = 'We are looking for a Senior Software Engineer to join our growing team. You will be responsible for building scalable web applications and leading technical initiatives.',
        experienceLevel = '3-6 years',
        minSalary = 800000,
        maxSalary = 1200000,
        salaryCurrency = 'INR',
        salaryType = 'Yearly',
        vacancies = 2,
        educationRequired = 'Bachelor degree in Computer Science or related field',
        skillsRequired = JSON_ARRAY('React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS'),
        genderPreference = 'Any',
        locationType = 'Remote',
        fullAddress = 'Mumbai, Maharashtra, India',
        city = 'Mumbai',
        state = 'Maharashtra',
        country = 'India',
        companyWebsite = 'https://techcorp.com',
        contactEmail = 'hr@techcorp.com',
        contactPhone = '+91-9876543210',
        applicationDeadline = '2024-12-31 23:59:59',
        status = 'Active'
      WHERE id = '1'`,
      
      // Update job 2
      `UPDATE jobs SET 
        jobDescription = 'Join our dynamic team as a Frontend Developer. You will work on creating amazing user experiences and building responsive web applications.',
        experienceLevel = '2-4 years',
        minSalary = 600000,
        maxSalary = 1000000,
        salaryCurrency = 'INR',
        salaryType = 'Yearly',
        vacancies = 1,
        educationRequired = 'Bachelor degree in Computer Science or equivalent',
        skillsRequired = JSON_ARRAY('React', 'JavaScript', 'CSS', 'HTML', 'Git'),
        genderPreference = 'Any',
        locationType = 'On-site',
        fullAddress = 'Bangalore, Karnataka, India',
        city = 'Bangalore',
        state = 'Karnataka',
        country = 'India',
        companyWebsite = 'https://digitalinnovations.com',
        contactEmail = 'careers@digitalinnovations.com',
        contactPhone = '+91-9876543211',
        applicationDeadline = '2024-12-30 23:59:59',
        status = 'Active'
      WHERE id = '2'`,
      
      // Update job 3
      `UPDATE jobs SET 
        jobDescription = 'We are seeking a Data Scientist to extract insights from large datasets and build machine learning models for our analytics platform.',
        experienceLevel = '3-7 years',
        minSalary = 900000,
        maxSalary = 1400000,
        salaryCurrency = 'INR',
        salaryType = 'Yearly',
        vacancies = 1,
        educationRequired = 'Master degree in Data Science, Statistics, or related field',
        skillsRequired = JSON_ARRAY('Python', 'R', 'Machine Learning', 'SQL', 'TensorFlow'),
        genderPreference = 'Any',
        locationType = 'Remote',
        fullAddress = 'Hyderabad, Telangana, India',
        city = 'Hyderabad',
        state = 'Telangana',
        country = 'India',
        companyWebsite = 'https://analyticspro.com',
        contactEmail = 'jobs@analyticspro.com',
        contactPhone = '+91-9876543212',
        applicationDeadline = '2024-12-29 23:59:59',
        status = 'Active'
      WHERE id = '3'`,
      
      // Update job 4
      `UPDATE jobs SET 
        jobDescription = 'Lead product strategy and development for our flagship products. Work with cross-functional teams to deliver exceptional user experiences.',
        experienceLevel = '4-8 years',
        minSalary = 1000000,
        maxSalary = 1500000,
        salaryCurrency = 'INR',
        salaryType = 'Yearly',
        vacancies = 1,
        educationRequired = 'Bachelor degree in Business, Engineering, or related field',
        skillsRequired = JSON_ARRAY('Product Management', 'Agile', 'Analytics', 'Leadership', 'Strategy'),
        genderPreference = 'Any',
        locationType = 'On-site',
        fullAddress = 'Chennai, Tamil Nadu, India',
        city = 'Chennai',
        state = 'Tamil Nadu',
        country = 'India',
        companyWebsite = 'https://startupxyz.com',
        contactEmail = 'hr@startupxyz.com',
        contactPhone = '+91-9876543213',
        applicationDeadline = '2024-12-28 23:59:59',
        status = 'Active'
      WHERE id = '4'`
    ];

    for (const query of updateQueries) {
      try {
        await sequelize.query(query);
        console.log('✅ Updated job record');
      } catch (error) {
        console.log('❌ Error updating job:', error.message);
      }
    }

    console.log('🎉 Job fields population completed!');
    console.log('📊 Enhanced job data added to existing records');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

populateJobFields();
