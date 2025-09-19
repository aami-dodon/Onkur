const { Pool } = require("pg");
const config = require("../../config");

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: false,
});

module.exports = pool;
