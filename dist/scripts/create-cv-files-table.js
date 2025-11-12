"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../models/index");
async function createCVFilesTable() {
    try {
        await index_1.sequelize.authenticate();
        console.log('Database connection established for CV files table creation.');
        // Sync the CVFile model to create the table
        await index_1.CVFile.sync({ force: false });
        console.log('CV files table created successfully.');
        console.log('CV files table migration completed successfully.');
    }
    catch (error) {
        console.error('Error during CV files table creation:', error);
        process.exit(1);
    }
    finally {
        await index_1.sequelize.close();
    }
}
createCVFilesTable();
//# sourceMappingURL=create-cv-files-table.js.map