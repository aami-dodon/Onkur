const express = require('express');
const { authenticate, authorizeRoles } = require('../auth/auth.middleware');
const {
  applyForSponsor,
  getSponsorProfile,
  updateProfile,
  listSponsorApplications,
  updateSponsorApproval,
  pledgeSponsorship,
  listSponsorSponsorships,
  updateSponsorshipApproval,
  getSponsorDashboard,
  getSponsorReports,
} = require('./sponsor.service');

const router = express.Router();
const authOnly = authenticate();
const adminOnly = authorizeRoles('ADMIN');
const uuidPattern = /^[0-9a-fA-F-]{36}$/;

router.post('/sponsors/apply', authOnly, async (req, res) => {
  try {
    const profile = await applyForSponsor({
      userId: req.user.id,
      orgName: req.body?.orgName,
      website: req.body?.website,
      logoUrl: req.body?.logoUrl,
      contactName: req.body?.contactName,
      contactEmail: req.body?.contactEmail,
      contactPhone: req.body?.contactPhone,
      brandAssets: req.body?.brandAssets,
    });
    res.status(201).json({ profile });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/sponsors/me', authOnly, async (req, res) => {
  try {
    const profile = await getSponsorProfile(req.user.id);
    res.json({ profile });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.patch('/sponsors/me', authOnly, async (req, res) => {
  try {
    const profile = await updateProfile({ userId: req.user.id, updates: req.body || {} });
    res.json({ profile });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/sponsors/me/sponsorships', authOnly, async (req, res) => {
  try {
    const sponsorships = await listSponsorSponsorships(req.user.id);
    res.json({ sponsorships });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/sponsors/me/dashboard', authOnly, async (req, res) => {
  try {
    const dashboard = await getSponsorDashboard({ sponsorId: req.user.id });
    res.json(dashboard);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/sponsors/me/reports', authOnly, async (req, res) => {
  try {
    const reports = await getSponsorReports({ sponsorId: req.user.id });
    res.json(reports);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/events/:eventId/sponsor', authOnly, async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const sponsorship = await pledgeSponsorship({
      sponsorId: req.user.id,
      eventId,
      type: req.body?.type,
      amount: req.body?.amount,
      notes: req.body?.notes,
    });
    res.status(201).json({ sponsorship });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/sponsors/applications', authOnly, adminOnly, async (_req, res) => {
  try {
    const applications = await listSponsorApplications({});
    res.json({ applications });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.patch('/sponsors/:sponsorId/status', authOnly, adminOnly, async (req, res) => {
  try {
    const { sponsorId } = req.params;
    if (!uuidPattern.test(sponsorId)) {
      return res.status(400).json({ error: 'Invalid sponsor identifier' });
    }
    const profile = await updateSponsorApproval({ sponsorId, status: req.body?.status });
    res.json({ profile });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.patch('/sponsorships/:sponsorshipId/status', authOnly, adminOnly, async (req, res) => {
  try {
    const { sponsorshipId } = req.params;
    if (!uuidPattern.test(sponsorshipId)) {
      return res.status(400).json({ error: 'Invalid sponsorship identifier' });
    }
    const sponsorship = await updateSponsorshipApproval({ sponsorshipId, status: req.body?.status });
    res.json({ sponsorship });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

module.exports = {
  basePath: '/api',
  router,
};
