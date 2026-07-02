// Add-ons module — manage business add-on requests and subscriptions
const TenantDB = require('../tenant-db');
const { generateId } = require('../utils');
const config = require('../config');
const { db } = require('../db');

function getAvailableAddons() {
  return config.addons;
}

function getAddonsForTier(tier) {
  const all = config.addons;
  const result = {};
  for (const [key, a] of Object.entries(all)) {
    if (a.tier === tier) result[key] = a;
  }
  return result;
}

function getBusinessAddons(businessId, status) {
  const tdb = new TenantDB(businessId);
  
  // Auto-ensure tier-included add-ons are approved in DB
  const biz = db.prepare('SELECT tier FROM businesses WHERE id = ?').get(businessId);
  if (biz) {
    const tier = biz.tier;
    const addonsToApprove = [];
    if (tier === 'professional') {
      addonsToApprove.push('starter_vat_wht', 'starter_automated_payroll');
    } else if (tier === 'enterprise') {
      addonsToApprove.push('starter_vat_wht', 'starter_automated_payroll', 'starter_multi_depot', 'pro_multi_entity');
    }
    for (const addonKey of addonsToApprove) {
      const existing = tdb.prepare("SELECT id, status FROM business_addons WHERE business_id = ? AND addon_key = ?").get(businessId, addonKey);
      if (existing) {
        if (existing.status !== 'approved') {
          tdb.prepare("UPDATE business_addons SET status = 'approved', updated_at = datetime('now'), cancelled_at = NULL WHERE id = ?").run(existing.id);
        }
      } else {
        const addonId = 'addon_' + require('crypto').randomUUID();
        tdb.prepare("INSERT INTO business_addons (id, business_id, addon_key, status) VALUES (?, ?, ?, 'approved')").run(addonId, businessId, addonKey);
      }
    }
  }

  const where = ['business_id = ?'];
  const params = [businessId];
  if (status) {
    if (Array.isArray(status)) {
      where.push(`status IN (${status.map(() => '?').join(',')})`);
      params.push(...status);
    } else {
      where.push('status = ?');
      params.push(status);
    }
  }
  return tdb.prepare(
    `SELECT * FROM business_addons WHERE ${where.join(' AND ')} ORDER BY created_at DESC`
  ).all(...params);
}

function addAdminNotification(businessId, title, message, targetItemId = null) {
  const notifId = require('crypto').randomUUID();
  db.prepare(`
    INSERT INTO notifications (id, business_id, title, message, type, is_admin, target_view, target_item_id)
    VALUES (?, ?, ?, ?, 'info', 1, 'addons', ?)
  `).run(notifId, businessId, title, message, targetItemId);
}

function addUserNotification(businessId, title, message, type = 'info') {
  const notifId = require('crypto').randomUUID();
  db.prepare(`
    INSERT INTO notifications (id, business_id, title, message, type, is_admin)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(notifId, businessId, title, message, type);
}

function requestAddon(businessId, addonKey) {
  const available = config.addons;
  if (!available[addonKey]) {
    throw new Error('Unknown add-on: ' + addonKey);
  }
  const tdb = new TenantDB(businessId);
  const biz = db.prepare('SELECT name, tier FROM businesses WHERE id = ?').get(businessId);
  if (!biz) throw new Error('Business not found');
  const bizName = biz.name;
  const addonName = available[addonKey].name;

  // Check no existing active/pending entry
  const existing = tdb.prepare(
    "SELECT id, status FROM business_addons WHERE business_id = ? AND addon_key = ?"
  ).get(businessId, addonKey);
  if (existing) {
    if (existing.status === 'approved') throw new Error('Add-on is already active');
    if (existing.status === 'requested') throw new Error('A pending request already exists for this add-on');
    // If rejected or cancelled — allow re-requesting by resetting the row
    if (existing.status === 'rejected' || existing.status === 'cancelled') {
      tdb.prepare(
        "UPDATE business_addons SET status = 'requested', updated_at = datetime('now'), cancelled_at = NULL WHERE id = ?"
      ).run(existing.id);
      addAdminNotification(businessId, 'Add-on Request', `Business ${bizName} has requested the ${addonName} add-on.`, existing.id);
      return tdb.prepare('SELECT * FROM business_addons WHERE id = ?').get(existing.id);
    }
  }
  
  // Tier hierarchy: enterprise > professional > starter
  const tierHierarchy = { starter: 1, professional: 2, enterprise: 3 };
  const addonTierLevel = tierHierarchy[available[addonKey].tier];
  const businessTierLevel = tierHierarchy[biz.tier];
  
  if (!addonTierLevel || !businessTierLevel) {
    throw new Error('Invalid tier configuration');
  }
  
  if (addonTierLevel > businessTierLevel) {
    throw new Error('This add-on is not available on your plan tier. Upgrade to ' + available[addonKey].tier + ' to access this add-on.');
  }
  const id = generateId('addon');
  tdb.prepare(
    "INSERT INTO business_addons (id, business_id, addon_key, status) VALUES (?, ?, ?, 'requested')"
  ).run(id, businessId, addonKey);
  addAdminNotification(businessId, 'Add-on Request', `Business ${bizName} has requested the ${addonName} add-on.`, id);
  return tdb.prepare('SELECT * FROM business_addons WHERE id = ?').get(id);
}


function approveAddon(addonId) {
  const row = db.prepare('SELECT * FROM business_addons WHERE id = ? AND status = ?').get(addonId, 'requested');
  if (!row) throw new Error('No pending request found with that id');
  db.prepare(
    "UPDATE business_addons SET status = 'approved', updated_at = datetime('now') WHERE id = ?"
  ).run(addonId);
  db.prepare(
    "UPDATE notifications SET is_read = 1 WHERE target_item_id = ? AND is_admin = 1"
  ).run(addonId);
  const available = config.addons;
  const addonName = available[row.addon_key]?.name || row.addon_key;
  addUserNotification(row.business_id, 'Add-on Approved', `Your request for the ${addonName} add-on has been approved and is now active.`, 'success');
  return db.prepare('SELECT * FROM business_addons WHERE id = ?').get(addonId);
}

function rejectAddon(addonId) {
  const row = db.prepare('SELECT * FROM business_addons WHERE id = ? AND status = ?').get(addonId, 'requested');
  if (!row) throw new Error('No pending request found with that id');
  db.prepare(
    "UPDATE business_addons SET status = 'rejected', updated_at = datetime('now') WHERE id = ?"
  ).run(addonId);
  db.prepare(
    "UPDATE notifications SET is_read = 1 WHERE target_item_id = ? AND is_admin = 1"
  ).run(addonId);
  const available = config.addons;
  const addonName = available[row.addon_key]?.name || row.addon_key;
  addUserNotification(row.business_id, 'Add-on Rejected', `Your request for the ${addonName} add-on was not approved.`, 'error');
  return db.prepare('SELECT * FROM business_addons WHERE id = ?').get(addonId);
}

function cancelAddon(businessId, addonKey) {
  const tdb = new TenantDB(businessId);
  const existing = tdb.prepare(
    "SELECT id FROM business_addons WHERE business_id = ? AND addon_key = ? AND status = 'approved'"
  ).get(businessId, addonKey);
  if (!existing) {
    throw new Error('No active subscription for add-on: ' + addonKey);
  }
  tdb.prepare(
    "UPDATE business_addons SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(existing.id);
  const biz = db.prepare('SELECT name FROM businesses WHERE id = ?').get(businessId);
  const bizName = biz?.name || businessId;
  const available = config.addons;
  const addonName = available[addonKey]?.name || addonKey;
  addAdminNotification(businessId, 'Add-on Cancelled', `Business ${bizName} has cancelled their subscription to the ${addonName} add-on.`, existing.id);
  addUserNotification(businessId, 'Add-on Cancelled', `You have cancelled your subscription to the ${addonName} add-on.`, 'warning');
  return { id: existing.id, status: 'cancelled' };
}

function businessHasAddon(businessId, addonKey) {
  const tdb = new TenantDB(businessId);
  const row = tdb.prepare(
    "SELECT id FROM business_addons WHERE business_id = ? AND addon_key = ? AND status = 'approved'"
  ).get(businessId, addonKey);
  return !!row;
}

function getPendingAddons() {
  return db.prepare(`
    SELECT ba.*, b.name AS business_name, b.email AS business_email, b.tier AS business_tier
    FROM business_addons ba
    LEFT JOIN businesses b ON b.id = ba.business_id
    WHERE ba.status = 'requested'
    ORDER BY ba.created_at DESC
  `).all();
}

module.exports = {
  getAvailableAddons,
  getAddonsForTier,
  getBusinessAddons,
  requestAddon,
  approveAddon,
  rejectAddon,
  cancelAddon,
  businessHasAddon,
  getPendingAddons,
};
