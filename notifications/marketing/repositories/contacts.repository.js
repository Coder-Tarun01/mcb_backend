const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../utils/sequelize');

const EMAIL_REGEX =
  /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;

function createContactsRepository({ sequelize = getSequelize() } = {}) {
  async function fetchContacts() {
    const rows = await sequelize.query(
      `
        SELECT
          id,
          full_name,
          email,
          mobile_no,
          branch,
          experience,
          created_at
        FROM marketing_contacts
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    const deduped = new Map();
    for (const row of rows) {
      const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
      if (!email || !EMAIL_REGEX.test(email)) {
        continue;
      }

      const fullName = normalizeName(row.full_name);
      if (!fullName) {
        continue;
      }

      if (!deduped.has(email)) {
        deduped.set(email, {
          id: row.id,
          fullName,
          email,
          mobileNo: row.mobile_no || null,
          branch: row.branch || null,
          experience: row.experience || null,
          createdAt: row.created_at ? new Date(row.created_at) : null,
        });
      }
    }

    return Array.from(deduped.values());
  }

  return {
    fetchContacts,
  };
}

function normalizeName(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

module.exports = {
  createContactsRepository,
  EMAIL_REGEX,
};


