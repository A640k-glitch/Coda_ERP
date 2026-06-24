const { db } = require('../db');
const { generateId } = require('../utils');
const accounting = require('./accounting');

function getUnreconciled(businessId) {
  const bankTxs = db.prepare(
    `SELECT * FROM bank_transactions WHERE business_id = ? AND status = 'unreconciled' ORDER BY date DESC`
  ).all(businessId);

  const getJeStmt = db.prepare(`
    SELECT je.id, je.date, je.description, jl.debit, jl.credit
    FROM journal_entries je
    JOIN journal_lines jl ON je.id = jl.entry_id
    JOIN accounts a ON jl.account_id = a.id
    WHERE je.business_id = ? AND a.code = '1100'
  `);

  const allBankJes = getJeStmt.all(businessId);

  const alreadyMatchedIds = new Set(
    db.prepare(`SELECT matched_journal_id FROM bank_transactions WHERE business_id = ? AND matched_journal_id IS NOT NULL`)
      .all(businessId)
      .map(r => r.matched_journal_id)
  );

  return bankTxs.map(btx => {
    let suggestedMatch = null;
    for (const je of allBankJes) {
      const jeBankAmount = je.debit - je.credit;
      if (Math.abs(jeBankAmount - btx.amount) < 0.01 && !alreadyMatchedIds.has(je.id)) {
        suggestedMatch = { id: je.id, date: je.date, description: je.description, amount: jeBankAmount };
        break;
      }
    }
    return { ...btx, suggestedMatch };
  });
}

function getSummary(businessId) {
  const unreconciled = db.prepare(
    `SELECT COUNT(*) as count FROM bank_transactions WHERE business_id = ? AND status = 'unreconciled'`
  ).get(businessId);

  const reconciled = db.prepare(
    `SELECT COUNT(*) as count FROM bank_transactions WHERE business_id = ? AND status = 'reconciled'`
  ).get(businessId);

  const unreconciledAmount = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM bank_transactions WHERE business_id = ? AND status = 'unreconciled'`
  ).get(businessId);

  const matchedJes = db.prepare(
    `SELECT COUNT(DISTINCT matched_journal_id) as count FROM bank_transactions WHERE business_id = ? AND matched_journal_id IS NOT NULL`
  ).get(businessId);

  return {
    unreconciledCount: unreconciled.count,
    reconciledCount: reconciled.count,
    unreconciledAmount: unreconciledAmount.total,
    matchedJournalEntries: matchedJes.count
  };
}

function matchTransaction(businessId, userId, bankTxId, { journalEntryId, newTransaction }) {
  const btx = db.prepare(`SELECT * FROM bank_transactions WHERE id = ? AND business_id = ?`).get(bankTxId, businessId);
  if (!btx) throw new Error('Bank transaction not found');
  if (btx.status === 'reconciled') throw new Error('Transaction is already reconciled');

  let targetJournalId = journalEntryId;

  if (!targetJournalId) {
    if (!newTransaction) throw new Error('Must provide either journalEntryId or newTransaction payload');
    const je = accounting.recordTransaction(businessId, userId, newTransaction);
    targetJournalId = je.id;
  }

  db.prepare(`
    UPDATE bank_transactions
    SET status = 'reconciled', matched_journal_id = ?
    WHERE id = ?
  `).run(targetJournalId, bankTxId);

  return { success: true, bankTxId, journalEntryId: targetJournalId };
}

function unreconcile(businessId, bankTxId) {
  const btx = db.prepare(`SELECT * FROM bank_transactions WHERE id = ? AND business_id = ?`).get(bankTxId, businessId);
  if (!btx) throw new Error('Bank transaction not found');
  if (btx.status === 'unreconciled') throw new Error('Transaction is already unreconciled');

  db.prepare(`
    UPDATE bank_transactions
    SET status = 'unreconciled', matched_journal_id = NULL
    WHERE id = ?
  `).run(bankTxId);

  return { success: true, bankTxId };
}

async function syncTransactions(businessId, accountId) {
  const mono = require('../integrations/mono');
  const syncResult = await mono.syncBankStatement(accountId, 'last30days');
  
  if (syncResult && syncResult.success && syncResult.data && syncResult.data.transactions) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO bank_transactions (id, business_id, date, amount, description, reference, status)
      VALUES (?, ?, ?, ?, ?, ?, 'unreconciled')
    `);
    
    const insertTx = db.transaction((txs) => {
      let count = 0;
      for (const tx of txs) {
        const finalAmount = tx.type === 'debit' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
        const txDate = tx.date.substring(0, 10);
        const result = stmt.run(
          `${businessId}_${tx.id}`,
          businessId,
          txDate,
          finalAmount,
          tx.narration,
          tx.id
        );
        if (result.changes > 0) count++;
      }
      return count;
    });
    
    const insertedCount = insertTx(syncResult.data.transactions);
    return { success: true, count: insertedCount };
  } else {
    throw new Error('Failed to retrieve transactions from bank provider');
  }
}

module.exports = {
  getUnreconciled,
  getSummary,
  matchTransaction,
  unreconcile,
  syncTransactions
};

