'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('companies', 'slug', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'name'
    });

    await queryInterface.addColumn('companies', 'previousSlugs', {
      type: Sequelize.JSON,
      allowNull: true,
      after: 'slug'
    });

    await queryInterface.addIndex('companies', ['slug'], {
      name: 'companies_slug_unique_idx',
      unique: true,
      where: {
        slug: { [Sequelize.Op.ne]: null }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    try { await queryInterface.removeIndex('companies', 'companies_slug_unique_idx'); } catch (e) {}
    await queryInterface.removeColumn('companies', 'previousSlugs');
    await queryInterface.removeColumn('companies', 'slug');
  }
};


