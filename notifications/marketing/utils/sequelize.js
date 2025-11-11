const path = require('path');

let cachedModule;

function loadModelsModule() {
  if (cachedModule) {
    return cachedModule;
  }

  const baseDir = path.resolve(__dirname, '../../..');
  const distModelsPath = path.join(baseDir, 'dist', 'models');
  const srcModelsPath = path.join(baseDir, 'src', 'models');

  try {
    // Prefer compiled dist models for production builds
    cachedModule = require(distModelsPath);
    return cachedModule;
  } catch (distError) {
    try {
      // Fallback to TypeScript source for local development
      require('ts-node/register');
    } catch (tsNodeError) {
      const error = new Error(
        `Unable to load Sequelize models for marketing notifications. ` +
          `Ensure the backend has been built (dist directory) or install ts-node.\n` +
          `dist error: ${distError.message}\n` +
          `ts-node error: ${tsNodeError.message}`
      );
      error.cause = { distError, tsNodeError };
      throw error;
    }
    cachedModule = require(srcModelsPath);
    return cachedModule;
  }
}

function getSequelize() {
  const moduleRef = loadModelsModule();
  if (!moduleRef || !moduleRef.sequelize) {
    throw new Error('Sequelize instance not found when loading marketing notification models');
  }
  return moduleRef.sequelize;
}

module.exports = {
  getSequelize,
  loadModelsModule,
};


