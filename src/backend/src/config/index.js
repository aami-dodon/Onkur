const dotenv = require("dotenv");

// Load environment variables once for the entire application.
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  logLevel: process.env.LOG_LEVEL || "info",
  logFile: process.env.LOG_FILE || "",
  databaseUrl: process.env.DATABASE_URL,
  app: {
    baseUrl: process.env.APP_BASE_URL || process.env.CORS_ORIGIN || "http://localhost:3000",
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || "1h",
    issuer: process.env.JWT_ISSUER || "onk ur-api",
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),
  },
  email: {
    from: process.env.EMAIL_FROM || "Onkur <no-reply@onkur.org>",
    smtpHost: process.env.EMAIL_SMTP_HOST,
    smtpPort: process.env.EMAIL_SMTP_PORT ? parseInt(process.env.EMAIL_SMTP_PORT, 10) : 587,
    smtpSecure: process.env.EMAIL_SMTP_SECURE === "true",
    smtpUser: process.env.EMAIL_SMTP_USER,
    smtpPass: process.env.EMAIL_SMTP_PASS,
  },
  minio: {
    endPoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : 9000,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET,
    useSSL: process.env.MINIO_USE_SSL === "true",
  },
  admin: {
    name: process.env.ADMIN_NAME || "",
    email: process.env.ADMIN_EMAIL || "",
    password: process.env.ADMIN_PASSWORD || "",
  },
};

module.exports = config;
