const { db } = require('./db');
const TenantDB = require('./tenant-db');

const TIER_MODULES = {
  starter: ['overview', 'accounting', 'reconciliation', 'tax', 'reports'],
  professional: ['overview', 'accounting', 'reconciliation', 'tax', 'reports', 'crm', 'hr'],
  enterprise: ['overview', 'accounting', 'reconciliation', 'inventory', 'crm', 'hr', 'tax', 'reports', 'integrations'],
};

// Map add-on keys to the modules they unlock
const ADDON_MODULES = {
  starter_automated_payroll: ['hr'],
  starter_vat_wht: ['tax'],
  starter_multi_depot: ['inventory'],
  pro_multi_entity: ['accounting', 'reports'],
  pro_api_access: [],
  pro_success_manager: [],
  enterprise_on_prem: [],
  enterprise_bespoke_modules: [],
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

function getBusinessAddonModules(businessId) {
  try {
    const tdb = new TenantDB(businessId);
    const rows = tdb.prepare("SELECT addon_key FROM business_addons WHERE business_id = ? AND status = 'active'").all(businessId);
    const modules = new Set();
    for (const row of rows) {
      const unlocked = ADDON_MODULES[row.addon_key];
      if (unlocked) unlocked.forEach(m => modules.add(m));
    }
    return modules;
  } catch (e) {
    return new Set();
  }
}

function getBusinessTier(businessId) {
  const row = db.prepare('SELECT tier FROM businesses WHERE id = ?').get(businessId);
  return normalizeTier(row?.tier);
}

function businessAllows(businessId, moduleName) {
  const tierRow = db.prepare('SELECT tier FROM businesses WHERE id = ?').get(businessId);
  const tier = normalizeTier(tierRow?.tier);
  if (TIER_MODULES[tier]?.includes(moduleName)) return true;
  return getBusinessAddonModules(businessId).has(moduleName);
}

function requireTierModule(moduleName) {
  return (req, res, next) => {
    const tierRow = db.prepare('SELECT tier FROM businesses WHERE id = ?').get(req.businessId);
    const tier = normalizeTier(tierRow?.tier);
    if (TIER_MODULES[tier]?.includes(moduleName)) return next();
    const addonModules = getBusinessAddonModules(req.businessId);
    if (addonModules.has(moduleName)) return next();
    return res.status(403).json({
      error: `${moduleName} is not available on the ${tier} tier and no add-on grants access`,
      code: 'TIER_RESTRICTED',
      requiredModule: moduleName,
      currentTier: tier,
    });
  };
}

module.exports = {
  TIER_MODULES,
  ADDON_MODULES,
  modulesForTier,
  tierAllows,
  getBusinessTier,
  businessAllows,
  getBusinessAddonModules,
  requireTierModule,
};
