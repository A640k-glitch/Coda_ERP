const { db } = require('../db');
const { generateId } = require('../utils');
const accounting = require('./accounting');

function importMockFeed(businessId) {
  // Generate a few random bank transactions for demonstration
  const txs = [
    { amount: 150000, desc: 'TRANSFER FROM CUSTOMER A', type: 'deposit' },
    { amount: -45000, desc: 'OFFICE SUPPLIES POS', type: 'withdrawal' },
    { amount: 320000, desc: 'INVOICE INV-1002 PAYMENT', type: 'deposit' },
    { amount: -15000, desc: 'MONTHLY SOFTWARE SUBSCRIPTION', type: 'withdrawal' },
  ];

  const stmt = db.prepare(
    `INSERT INTO bank_transactions (id, business_id, date, amount, description, reference)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const importedCount = db.transaction(() => {
    let count = 0;
    const now = new Date();
    for (const t of txs) {
      const id = generateId('btx');
      const date = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const ref = 'REF' + Math.floor(Math.random() * 100000);
      stmt.run(id, businessId, date, t.amount, t.desc, ref);
      count++;
    }
    return count;
  })();

  return importedCount;
}

function getUnreconciled(businessId) {
  // Fetch unreconciled bank transactions
  const bankTxs = db.prepare(
    `SELECT * FROM bank_transactions WHERE business_id = ? AND status = 'unreconciled' ORDER BY date DESC`
  ).all(businessId);

  // Look for potential matches in journal entries
  // A naive match: Exact amount.
  // In a real app, we would look at the specific bank ledger account, but here we just look at any JE that involves Bank.
  
  const matches = [];
  const getJeStmt = db.prepare(`
    SELECT je.*, jl.debit, jl.credit 
    FROM journal_entries je
    JOIN journal_lines jl ON je.id = jl.entry_id
    JOIN accounts a ON jl.account_id = a.id
    WHERE je.business_id = ? AND a.code = '1100' -- 1100 is Bank
  `);

  const allBankJes = getJeStmt.all(businessId);

  for (const btx of bankTxs) {
    let suggestedMatch = null;
    for (const je of allBankJes) {
      const jeBankAmount = je.debit - je.credit; // If debit > 0, it's a deposit. If credit > 0, withdrawal.
      if (Math.abs(jeBankAmount - btx.amount) < 0.01) {
        // Amount matches! Check if it's already reconciled to something else
        const alreadyMatched = db.prepare(`SELECT id FROM bank_transactions WHERE matched_journal_id = ?`).get(je.id);
        if (!alreadyMatched) {
          suggestedMatch = je;
          break;
        }
      }
    }
    
    matches.push({
      ...btx,
      suggestedMatch
    });
  }

  return matches;
}

function matchTransaction(businessId, userId, bankTxId, { journalEntryId, newTransaction }) {
  const btx = db.prepare(`SELECT * FROM bank_transactions WHERE id = ? AND business_id = ?`).get(bankTxId, businessId);
  if (!btx) throw new Error('Bank transaction not found');
  if (btx.status === 'reconciled') throw new Error('Transaction is already reconciled');

  let targetJournalId = journalEntryId;

  if (!targetJournalId) {
    if (!newTransaction) throw new Error('Must provide either journalEntryId or newTransaction payload');
    // Create new journal entry on the fly
    const je = accounting.recordTransaction(businessId, userId, newTransaction);
    targetJournalId = je.id;
  }

  // Update bank transaction to reconciled
  db.prepare(`
    UPDATE bank_transactions 
    SET status = 'reconciled', matched_journal_id = ? 
    WHERE id = ?
  `).run(targetJournalId, bankTxId);

  return { success: true, bankTxId, journalEntryId: targetJournalId };
}

module.exports = {
  importMockFeed,
  getUnreconciled,
  matchTransaction
};
