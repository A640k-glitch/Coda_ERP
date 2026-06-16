// HR module — employees, attendance, payroll
const { db } = require('../db');
const { generateId } = require('../utils');
const tax = require('./tax');

function addEmployee(businessId, data) {
  if (!data.name) throw new Error('Employee name is required');
  const id = generateId('emp');
  db.prepare(
    `INSERT INTO employees (business_id, id, name, email, phone, role, salary, hire_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    businessId,
    id,
    data.name,
    data.email || null,
    data.phone || null,
    data.role || null,
    Number(data.salary || 0),
    data.hire_date || null,
    data.status || 'active'
  );
  return getEmployee(businessId, id);
}

function updateEmployee(businessId, id, data) {
  const existing = getEmployee(businessId, id);
  if (!existing) return null;
  db.prepare(
    `UPDATE employees
     SET name = ?, email = ?, phone = ?, role = ?, salary = ?, hire_date = ?, status = ?
     WHERE id = ? AND business_id = ?`
  ).run(
    data.name ?? existing.name,
    data.email ?? existing.email,
    data.phone ?? existing.phone,
    data.role ?? existing.role,
    data.salary != null ? Number(data.salary) : existing.salary,
    data.hire_date ?? existing.hire_date,
    data.status ?? existing.status,
    id,
    businessId
  );
  return getEmployee(businessId, id);
}

function getEmployee(businessId, id) {
  return db.prepare('SELECT * FROM employees WHERE id = ? AND business_id = ?').get(id, businessId);
}

function listEmployees(businessId, { status, limit = 100, offset = 0 } = {}) {
  const where = ['business_id = ?'];
  const params = [businessId];
  if (status) { where.push('status = ?'); params.push(status); }
  return db
    .prepare(`SELECT * FROM employees WHERE ${where.join(' AND ')} ORDER BY name LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
}

function deleteEmployee(businessId, id) {
  const r = db.prepare('DELETE FROM employees WHERE id = ? AND business_id = ?').run(id, businessId);
  return r.changes > 0;
}

function recordAttendance(businessId, { employee_id, date, check_in, check_out }) {
  if (!employee_id) throw new Error('employee_id required');
  const emp = getEmployee(businessId, employee_id);
  if (!emp) throw new Error('Employee not found');
  const day = date || new Date().toISOString().split('T')[0];
  // If there's an open attendance for this employee+date, update checkout
  const existing = db
    .prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = ? AND check_out IS NULL ORDER BY created_at DESC LIMIT 1")
    .get(employee_id, day);
  if (existing && check_out) {
    db.prepare("UPDATE attendance SET check_out = ?, status = 'completed' WHERE id = ?").run(check_out, existing.id);
    return db.prepare('SELECT * FROM attendance WHERE id = ?').get(existing.id);
  }
  const id = generateId('att');
  db.prepare(
    `INSERT INTO attendance (id, business_id, employee_id, date, check_in, check_out, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, businessId, employee_id, day, check_in || new Date().toISOString(), check_out || null, check_out ? 'completed' : 'active');
  return db.prepare('SELECT * FROM attendance WHERE id = ?').get(id);
}

function listAttendance(businessId, { employee_id, date, limit = 100 } = {}) {
  const where = ['a.business_id = ?'];
  const params = [businessId];
  if (employee_id) { where.push('a.employee_id = ?'); params.push(employee_id); }
  if (date)        { where.push('a.date = ?'); params.push(date); }
  return db
    .prepare(
      `SELECT a.*, e.name AS employee_name
       FROM attendance a
       LEFT JOIN employees e ON e.id = a.employee_id
       WHERE ${where.join(' AND ')}
       ORDER BY a.date DESC, a.created_at DESC
       LIMIT ?`
    )
    .all(...params, limit);
}

function payrollSummary(businessId) {
  const employees = listEmployees(businessId, { status: 'active' });
  let totalGross = 0, totalNet = 0, totalPAYE = 0;
  const rows = employees.map(e => {
    const annual = e.salary * 12;
    const annualPAYE = tax.calculatePAYE(annual);
    const monthlyPAYE = annualPAYE / 12;
    const monthlyNet = e.salary - monthlyPAYE;
    totalGross += e.salary;
    totalNet += monthlyNet;
    totalPAYE += monthlyPAYE;
    return {
      id: e.id,
      name: e.name,
      role: e.role,
      monthlyGross: e.salary,
      monthlyPAYE: +monthlyPAYE.toFixed(2),
      monthlyNet: +monthlyNet.toFixed(2),
    };
  });
  return {
    count: employees.length,
    totalMonthlyGross: +totalGross.toFixed(2),
    totalMonthlyPAYE: +totalPAYE.toFixed(2),
    totalMonthlyNet: +totalNet.toFixed(2),
    employees: rows,
  };
}

module.exports = {
  addEmployee, updateEmployee, getEmployee, listEmployees, deleteEmployee,
  recordAttendance, listAttendance, payrollSummary,
};
