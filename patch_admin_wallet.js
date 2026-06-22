const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const regex = /user\.login_logs = logsResult\.rows;[\s\S]*?return res\.json\(user\);/;
const replacement = `user.login_logs = logsResult.rows;

    const walletRes = await pool.query(
      \`SELECT balance, held_balance FROM wallets WHERE user_id = $1 LIMIT 1\`,
      [id]
    );
    user.wallet = walletRes.rows[0] || { balance: 0, held_balance: 0 };

    return res.json(user);`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('backend/server.js', code, 'utf8');
  console.log('Patched admin user details in server.js');
} else {
  console.log('Regex not found!');
}
