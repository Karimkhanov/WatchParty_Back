const pool = require('../src/config/database');

async function addPasswordResetColumns() {
  try {
    console.log('Adding password reset columns to users table...');

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
    `);

    console.log('✅ Password reset columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
}

addPasswordResetColumns();
