const fs = require('fs');
const path = require('path');
const winston = require('winston');
const config = require('../config');

const transports = [
  new winston.transports.Console({
    level: config.logLevel,
  }),
];

if (config.logFile) {
  const resolvedPath = path.isAbsolute(config.logFile)
    ? config.logFile
    : path.join(process.cwd(), config.logFile);

  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  transports.push(
    new winston.transports.File({
      filename: resolvedPath,
      level: config.logLevel,
    })
  );
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level}] ${message}${metaString}`;
    })
  ),
  transports,
});

module.exports = logger;
