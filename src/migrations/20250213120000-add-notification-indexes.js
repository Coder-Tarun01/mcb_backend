module.exports = {
  up: async (queryInterface, Sequelize) => {
    const addIndexIfNotExists = async (table, fields, options = {}) => {
      const indexName = options.name || `${table}_${fields.join('_')}`;
      const indexes = await queryInterface.showIndex(table);
      const exists = indexes.some((index) => index.name === indexName);
      if (!exists) {
        await queryInterface.addIndex(table, fields, { ...options, name: indexName });
      }
    };

    // Add indexes to 'jobs' table
    await addIndexIfNotExists('jobs', ['created_at'], { name: 'jobs_created_at_idx' });
    await addIndexIfNotExists('jobs', ['type'], { name: 'jobs_type_idx' });
    await addIndexIfNotExists('jobs', ['notify_sent'], { name: 'jobs_notify_sent_idx' });

    // Add indexes to 'accounts_jobdata' table
    await addIndexIfNotExists('accounts_jobdata', ['created_at'], { name: 'accounts_jobdata_created_at_idx' });
    await addIndexIfNotExists('accounts_jobdata', ['posted_date'], { name: 'accounts_jobdata_posted_date_idx' });
    await addIndexIfNotExists('accounts_jobdata', ['job_type'], { name: 'accounts_jobdata_job_type_idx' });
    await addIndexIfNotExists('accounts_jobdata', ['notify_sent'], { name: 'accounts_jobdata_notify_sent_idx' });

    // Add index to marketing_contacts for email for faster lookups
    try {
      await addIndexIfNotExists('marketing_contacts', ['email'], { name: 'marketing_contacts_email_idx', unique: true });
    } catch (error) {
      // Log error but don't fail migration if table doesn't exist or index creation fails
      console.warn('Could not add index to marketing_contacts (table may not exist):', error.message);
    }
  },

  down: async (queryInterface) => {
    const dropIndexIfExists = async (table, indexName) => {
      const indexes = await queryInterface.showIndex(table);
      const exists = indexes.some((index) => index.name === indexName);
      if (exists) {
        await queryInterface.removeIndex(table, indexName);
      }
    };

    await dropIndexIfExists('jobs', 'jobs_created_at_idx');
    await dropIndexIfExists('jobs', 'jobs_type_idx');
    await dropIndexIfExists('jobs', 'jobs_notify_sent_idx');
    await dropIndexIfExists('accounts_jobdata', 'accounts_jobdata_created_at_idx');
    await dropIndexIfExists('accounts_jobdata', 'accounts_jobdata_posted_date_idx');
    await dropIndexIfExists('accounts_jobdata', 'accounts_jobdata_job_type_idx');
    await dropIndexIfExists('accounts_jobdata', 'accounts_jobdata_notify_sent_idx');
    
    try {
      await dropIndexIfExists('marketing_contacts', 'marketing_contacts_email_idx');
    } catch (error) {
      console.warn('Could not remove index from marketing_contacts:', error.message);
    }
  },
};
