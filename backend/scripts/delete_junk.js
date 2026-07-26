require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT id, full_name FROM users
      WHERE full_name ILIKE '%thầy to cu%' 
         OR full_name ILIKE '%a trai say hi%';
    `);
    console.log("Users to delete:", res.rows);
    if (res.rows.length > 0) {
      const ids = res.rows.map(r => r.id);
      const idsStr = ids.map(id => `'${id}'`).join(',');
      
      await pool.query(`DELETE FROM wallets WHERE user_id IN (${idsStr})`).catch(e=>console.log('wallets:', e.message));
      await pool.query(`DELETE FROM wishlists WHERE user_id IN (${idsStr}) OR item_id::text IN (${idsStr})`).catch(e=>console.log('wishlists:', e.message));
      await pool.query(`DELETE FROM wishlist_items WHERE user_id IN (${idsStr}) OR item_id::text IN (${idsStr})`).catch(e=>console.log('wishlist_items:', e.message));
      await pool.query(`DELETE FROM tutor_profiles WHERE user_id IN (${idsStr})`).catch(e=>console.log('tutor_profiles:', e.message));
      await pool.query(`DELETE FROM users WHERE id IN (${idsStr})`).catch(e=>console.log('users:', e.message));
      console.log('Deleted completely.');
    } else {
      console.log('No matching users found.');
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}
run();
