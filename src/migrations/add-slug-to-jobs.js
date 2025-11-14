'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add slug column (nullable initially) and previousSlugs (JSON)
    await queryInterface.addColumn('jobs', 'slug', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'company'
    });

    await queryInterface.addColumn('jobs', 'previousSlugs', {
      type: Sequelize.JSON,
      allowNull: true,
      after: 'slug'
    });

    // Add unique index on slug
    await queryInterface.addIndex('jobs', ['slug'], {
      name: 'jobs_slug_unique_idx',
      unique: true,
      where: {
        slug: { [Sequelize.Op.ne]: null }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index and columns in reverse order
    try {
      await queryInterface.removeIndex('jobs', 'jobs_slug_unique_idx');
    } catch (e) {
      // ignore if index doesn't exist
    }
    await queryInterface.removeColumn('jobs', 'previousSlugs');
    await queryInterface.removeColumn('jobs', 'slug');
  }
};


