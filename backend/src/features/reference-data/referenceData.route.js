const express = require('express');
const { getReferenceData } = require('./referenceData.service');

const router = express.Router();

router.get('/reference-data', (req, res) => {
  res.json({ referenceData: getReferenceData() });
});

module.exports = {
  basePath: '/api',
  router,
};
