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

    await addIndexIfNotExists('jobs', ['created_at'], { name: 'jobs_created_at_idx' });
    await addIndexIfNotExists('jobs', ['type'], { name: 'jobs_type_idx' });
    await addIndexIfNotExists('jobs', ['notify_sent'], { name: 'jobs_notify_sent_idx' });
    await addIndexIfNotExists('aijobs', ['created_at'], { name: 'aijobs_created_at_idx' });
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
    await dropIndexIfExists('aijobs', 'aijobs_created_at_idx');
  },
};
