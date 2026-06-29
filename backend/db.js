const { Pool } = require("pg");
const dotenv = require("dotenv");
const dns = require("dns");

dotenv.config();
dns.setDefaultResultOrder("ipv4first");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

// Test kết nối khi khởi động
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Database connection error:", err.message);
  } else {
    console.log("✅ Connected to Supabase PostgreSQL");
    release();
  }
});

module.exports = pool;
