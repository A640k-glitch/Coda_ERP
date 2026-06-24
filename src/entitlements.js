const { db } = require('./db');

const TIER_MODULES = {
  starter: ['overview', 'accounting', 'reconciliation', 'tax', 'reports'],
  professional: ['overview', 'accounting', 'reconciliation', 'tax', 'reports', 'crm', 'hr'],
  enterprise: ['overview', 'accounting', 'reconciliation', 'inventory', 'crm', 'hr', 'tax', 'reports', 'integrations'],
};

function normalizeTier(tier) {
  return String(tier || 'starter').toLowerCase();
}

function modulesForTier(tier) {
  return TIER_MODULES[normalizeTier(tier)] || TIER_MODULES.starter;
}

function tierAllows(tier, moduleName) {
  return modulesForTier(tier).includes(moduleName);
}

function getBusinessTier(businessId) {
  const row = db.prepare('SELECT tier FROM businesses WHERE id = ?').get(businessId);
  return normalizeTier(row?.tier);
}

function requireTierModule(moduleName) {
  return (req, res, next) => {
    const tier = getBusinessTier(req.businessId);
    if (!tierAllows(tier, moduleName)) {
      return res.status(403).json({
        error: `${moduleName} is not available on the ${tier} tier`,
        code: 'TIER_RESTRICTED',
        requiredModule: moduleName,
        currentTier: tier,
      });
    }
    next();
  };
}

module.exports = {
  TIER_MODULES,
  modulesForTier,
  tierAllows,
  getBusinessTier,
  requireTierModule,
};
