const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");
const { ensureAdminUser } = require("./features/auth/admin.bootstrap");

async function startServer() {
  try {
    await ensureAdminUser();
  } catch (error) {
    logger.error("Admin bootstrap failed", { error: error.message });
  }

  app.listen(config.port, () => {
    logger.info(`Backend running on port ${config.port}`);
  });
}

startServer();
