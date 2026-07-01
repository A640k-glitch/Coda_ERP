// Add-ons routes
const express = require('express');
const router = express.Router();
const addons = require('../modules/addons');
const { requireAuth, requireBusiness, requireAdmin, logAudit } = require('../auth');
const { modulesForTier, getBusinessTier, ADDON_MODULES } = require('../entitlements');
const config = require('../config');

// ── Admin endpoints (declared FIRST to avoid /:key collision) ──────────────

// Full addon catalog for admin use (no requireBusiness needed)
router.get('/admin/catalog', requireAuth, requireAdmin, (req, res) => {
  res.json({ addons: config.addons });
});

// List all pending add-on requests (admin only)
router.get('/admin/pending', requireAuth, requireAdmin, (req, res) => {
  res.json({ requests: addons.getPendingAddons() });
});

// Approve a pending add-on request
router.post('/admin/:id/approve', requireAuth, requireAdmin, (req, res) => {
  try {
    const a = addons.approveAddon(req.params.id);
    logAudit(null, req.user.id, 'addon.approve', { addon_id: a.id, addon_key: a.addon_key, business_id: a.business_id });
    res.json({ addon: a });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reject a pending add-on request
router.post('/admin/:id/reject', requireAuth, requireAdmin, (req, res) => {
  try {
    const a = addons.rejectAddon(req.params.id);
    logAudit(null, req.user.id, 'addon.reject', { addon_id: a.id, addon_key: a.addon_key, business_id: a.business_id });
    res.json({ addon: a });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Business endpoints (all require auth + business) ──────────────────────
router.use(requireAuth, requireBusiness);

// List available add-ons (ALL tiers shown, not just the business's tier)
// so users can see what's available to upgrade to
router.get('/available', (req, res) => {
  const tier = getBusinessTier(req.businessId);
  res.json({ addons: config.addons, currentTier: tier });
});

// List business's add-ons (all statuses)
router.get('/', (req, res) => {
  res.json({ addons: addons.getBusinessAddons(req.businessId) });
});

// Request an add-on (creates a pending request)
router.post('/:key/request', (req, res) => {
  const key = req.params.key;
  console.log('Addon request - key:', key, 'businessId:', req.businessId, 'userId:', req.user?.id);
  // Validate key is a known addon
  if (!config.addons[key]) {
    console.log('Unknown addon key:', key);
    return res.status(400).json({ error: 'Unknown add-on: ' + key });
  }
  try {
    const a = addons.requestAddon(req.businessId, key);
    logAudit(req.businessId, req.user.id, 'addon.request', { addon_key: key, id: a.id });
    console.log('Addon request successful:', a);
    res.status(201).json({ addon: a });
  } catch (err) {
    console.error('Addon request error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Cancel an approved add-on
router.post('/:key/cancel', (req, res) => {
  const key = req.params.key;
  if (!config.addons[key]) {
    return res.status(400).json({ error: 'Unknown add-on: ' + key });
  }
  try {
    const result = addons.cancelAddon(req.businessId, key);
    logAudit(req.businessId, req.user.id, 'addon.cancel', { addon_key: key });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Check if a specific add-on is active (must be LAST generic route)
router.get('/:key', (req, res) => {
  const key = req.params.key;
  if (!config.addons[key]) {
    return res.status(404).json({ error: 'Unknown add-on' });
  }
  res.json({ active: addons.businessHasAddon(req.businessId, key) });
});

module.exports = router;
