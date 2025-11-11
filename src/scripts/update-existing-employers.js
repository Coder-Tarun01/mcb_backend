const { User } = require('../models');

async function updateExistingEmployers() {
  try {
    console.log('Updating existing employers with company names...');
    
    // Find all employers without company names
    const employers = await User.findAll({
      where: {
        role: 'employer',
        companyName: null
      }
    });

    console.log(`Found ${employers.length} employers without company names`);

    for (const employer of employers) {
      // You can set a default company name or prompt for input
      // For now, we'll use the user's name as company name
      await employer.update({
        companyName: employer.name
      });
      console.log(`Updated employer ${employer.email} with company name: ${employer.name}`);
    }

    console.log('All employers updated successfully!');
  } catch (error) {
    console.error('Error updating employers:', error);
  }
}

// Run the script
updateExistingEmployers();
