require('dotenv').config();
const pool = require('../src/config/database');

async function getResetToken() {
  try {
    const result = await pool.query(
      'SELECT email, password_reset_token, password_reset_expires FROM users WHERE email = $1',
      ['tursynhankarimhanov@gmail.com']
    );

    if (result.rows.length === 0) {
      console.log('No user found with that email');
      process.exit(0);
    }

    const user = result.rows[0];
    console.log('\n=== Password Reset Token Info ===');
    console.log('Email:', user.email);
    console.log('Token:', user.password_reset_token);
    console.log('Expires:', user.password_reset_expires);
    console.log('Token valid:', user.password_reset_expires && new Date(user.password_reset_expires) > new Date());
    console.log('\nReset URL: http://localhost:5173/reset-password/' + user.password_reset_token);
    console.log('==================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getResetToken();
