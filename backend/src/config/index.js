const dotenv = require("dotenv");

// Load environment variables once for the entire application.
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  logLevel: process.env.LOG_LEVEL || "info",
  logFile: process.env.LOG_FILE || "",
  databaseUrl: process.env.DATABASE_URL,
  minio: {
    endPoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : 9000,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET,
    useSSL: process.env.MINIO_USE_SSL === "true",
  },
};

module.exports = config;
