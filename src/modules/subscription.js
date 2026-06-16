// Subscription module — tiers, billing history
const { db } = require('../db');
const { generateId } = require('../utils');
const config = require('../config');

function listTiers() {
  return Object.entries(config.subscriptionTiers).map(([key, t]) => ({ id: key, ...t }));
}

function getSubscription(businessId) {
  return db
    .prepare("SELECT * FROM subscriptions WHERE business_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(businessId);
}

function createSubscription(businessId, tierName) {
  const tier = config.subscriptionTiers[tierName];
  if (!tier) throw new Error(`Invalid subscription tier: ${tierName}`);
  const id = generateId('sub');
  const start = new Date().toISOString();
  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + 1);
  db.prepare(
    `INSERT INTO subscriptions (id, business_id, tier, status, start_date, next_billing_date)
     VALUES (?, ?, ?, 'active', ?, ?)`
  ).run(id, businessId, tierName, start, nextBilling.toISOString());
  db.prepare("UPDATE businesses SET tier = ?, subscription_status = 'active' WHERE id = ?").run(tierName, businessId);
  return db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
}

function upgradeSubscription(businessId, newTierName) {
  const tier = config.subscriptionTiers[newTierName];
  if (!tier) throw new Error(`Invalid tier: ${newTierName}`);
  const current = getSubscription(businessId);
  if (!current) return createSubscription(businessId, newTierName);
  if (current.tier === newTierName) return current;
  const oldPrice = config.subscriptionTiers[current.tier]?.price || 0;
  const newPrice = tier.price;
  // Simple prorate: difference in monthly price (caller can adjust)
  const prorated = newPrice - oldPrice;
  db.prepare("UPDATE subscriptions SET tier = ? WHERE id = ?").run(newTierName, current.id);
  db.prepare("UPDATE businesses SET tier = ? WHERE id = ?").run(newTierName, businessId);
  if (prorated > 0) recordPayment(businessId, { amount: prorated, method: 'card', status: 'pending', reference: `UPG-${current.id}` });
  return db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(current.id);
}

function recordPayment(businessId, data) {
  const id = generateId('pay');
  const sub = getSubscription(businessId);
  db.prepare(
    `INSERT INTO payments (id, business_id, subscription_id, amount, currency, method, status, reference)
     VALUES (?, ?, ?, ?, 'NGN', ?, ?, ?)`
  ).run(id, businessId, sub?.id || null, Number(data.amount || 0), data.method || 'card', data.status || 'completed', data.reference || null);
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
}

function listPayments(businessId, { limit = 50 } = {}) {
  return db
    .prepare("SELECT * FROM payments WHERE business_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(businessId, limit);
}

module.exports = {
  listTiers,
  getSubscription,
  createSubscription,
  upgradeSubscription,
  recordPayment,
  listPayments,
};
