const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const isRouter = (candidate) =>
  candidate && typeof candidate === 'function' && typeof candidate.use === 'function';

const registerRoutes = (app) => {
  const featuresDir = path.join(__dirname, '..', 'features');

  if (!fs.existsSync(featuresDir)) {
    logger.warn('Features directory not found. No routes were registered.');
    return;
  }

  const walk = (dir) => {
    fs.readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((entry) => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
          return;
        }

        if (!entry.isFile() || !entry.name.endsWith('.route.js')) {
          return;
        }

        const routeModule = require(fullPath);
        const router = routeModule.router || routeModule;
        const basePath = routeModule.basePath || '/';

        if (!isRouter(router)) {
          logger.warn(
            `Skipped registering route at ${fullPath} because it did not export an Express router.`
          );
          return;
        }

        app.use(basePath, router);
        logger.info(
          `Registered router from ${path.relative(featuresDir, fullPath)} at base path '${basePath}'.`
        );
      });
  };

  walk(featuresDir);
};

module.exports = { registerRoutes };
