"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../models/index");
async function createResumesTable() {
    try {
        console.log('🔄 Creating resumes table...');
        // Create the resumes table
        await index_1.sequelize.sync({ force: false, alter: true });
        console.log('✅ Resumes table created successfully');
        console.log('📊 Table structure:');
        console.log('   - id (UUID, Primary Key)');
        console.log('   - userId (UUID, Foreign Key to users)');
        console.log('   - title (String)');
        console.log('   - isPrimary (Boolean)');
        console.log('   - isPublic (Boolean)');
        console.log('   - status (Enum: draft, published, archived)');
        console.log('   - personalInfo (JSON)');
        console.log('   - workExperience (JSON)');
        console.log('   - education (JSON)');
        console.log('   - skills (JSON)');
        console.log('   - projects (JSON)');
        console.log('   - certifications (JSON)');
        console.log('   - languages (JSON)');
        console.log('   - references (JSON)');
        console.log('   - additionalInfo (JSON)');
        console.log('   - settings (JSON)');
        console.log('   - createdAt (Date)');
        console.log('   - updatedAt (Date)');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error creating resumes table:', error);
        process.exit(1);
    }
}
createResumesTable();
//# sourceMappingURL=create-resumes-table.js.map