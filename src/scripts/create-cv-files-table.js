import { sequelize, CVFile } from '../models/index';

async function createCVFilesTable() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established for CV files table creation.');

    // Sync the CVFile model to create the table
    await CVFile.sync({ force: false });
    console.log('CV files table created successfully.');

    console.log('CV files table migration completed successfully.');
  } catch (error) {
    console.error('Error during CV files table creation:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createCVFilesTable();
