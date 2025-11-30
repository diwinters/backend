// Script to create the first admin user
// Run with: npx ts-node scripts/create-admin.ts

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'raceef',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n🔐 Create Admin User\n');

  try {
    // Check if admin_users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'admin_users'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ admin_users table does not exist. Run the migration first.');
      console.log('   psql -U postgres -d raceef -f db/migrations/002_admin_dashboard.sql');
      process.exit(1);
    }

    const email = await question('Email: ');
    const password = await question('Password: ');
    const name = await question('Name: ');

    if (!email || !password) {
      console.log('❌ Email and password are required');
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO admin_users (email, password_hash, name, role) 
       VALUES ($1, $2, $3, 'superadmin') 
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = $2, name = $3, updated_at = NOW()
       RETURNING id, email, name, role`,
      [email.toLowerCase(), passwordHash, name || email.split('@')[0]]
    );

    console.log('\n✅ Admin user created successfully!');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Name: ${result.rows[0].name}`);
    console.log(`   Role: ${result.rows[0].role}`);
    console.log('\n   You can now login at /admin/login\n');
  } catch (error: any) {
    if (error.code === '23505') {
      console.log('❌ An admin with this email already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    rl.close();
    await pool.end();
  }
}

main();
