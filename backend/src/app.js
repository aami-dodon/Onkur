const express = require('express');
const cors = require('cors');
const config = require('./config');
const { registerRoutes } = require('./routes');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

registerRoutes(app);

module.exports = app;
