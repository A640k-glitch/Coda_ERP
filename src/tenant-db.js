const { db } = require('./db');

/**
 * TenantDB
 * 
 * A wrapper for better-sqlite3 that scopes database operations to a specific tenant (businessId)
 * and logs execution times for monitoring.
 * 
 * Usage:
 * const tdb = new TenantDB(req.user.business_id);
 * const products = tdb.all('SELECT * FROM products WHERE business_id = ?', [req.user.business_id]);
 */
class TenantDB {
  constructor(businessId) {
    if (!businessId) {
      throw new Error('TenantDB requires a valid businessId to instantiate.');
    }
    this.businessId = businessId;
    this.db = db;
  }

  /**
   * Monitor execution time of a query
   */
  _monitor(queryName, sql, fn) {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      if (process.env.NODE_ENV !== 'production' || duration > 50) {
        console.log(`[DB Monitor] ${queryName} (${duration.toFixed(2)}ms) | Tenant: ${this.businessId} | SQL: ${sql}`);
      }
      return result;
    } catch (err) {
      const duration = performance.now() - start;
      console.error(`[DB Error] ${queryName} (${duration.toFixed(2)}ms) | Tenant: ${this.businessId} | SQL: ${sql}`);
      throw err;
    }
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);
    
    return {
      get: (...params) => this._monitor('get', sql, () => stmt.get(...params)),
      all: (...params) => this._monitor('all', sql, () => stmt.all(...params)),
      run: (...params) => this._monitor('run', sql, () => stmt.run(...params)),
      iterate: (...params) => stmt.iterate(...params),
    };
  }
  
  // Shortcuts
  get(sql, ...params) {
    return this.prepare(sql).get(...params);
  }

  all(sql, ...params) {
    return this.prepare(sql).all(...params);
  }

  run(sql, ...params) {
    return this.prepare(sql).run(...params);
  }

  transaction(fn) {
    return this.db.transaction(fn);
  }
}

module.exports = TenantDB;
