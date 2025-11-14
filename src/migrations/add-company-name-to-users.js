'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'companyName', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'role'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'companyName');
  }
};
