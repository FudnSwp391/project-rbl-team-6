const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    const migrationPath = path.join(__dirname, '../migrations/instant_learning_v2_migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration ran successfully!');
    
    client.release();
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    pool.end();
  }
}

runMigration();
