const User = require('../models/User');

// Creates the first admin from env vars if no admin exists (idempotent).
module.exports = async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  const exists = await User.exists({ role: 'admin' });
  if (exists) return;
  await User.create({ name: ADMIN_NAME || 'Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
  console.log(`Admin created: ${ADMIN_EMAIL}`);
};
