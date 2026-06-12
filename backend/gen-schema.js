/**
 * gen-schema.js — Introspect DB Supabase thật → sinh schema_full.sql đầy đủ.
 * Chạy 1 lần: node gen-schema.js
 * Output: 1 file "cài từ đầu" (CREATE TABLE + constraint + index + trigger + seed),
 * an toàn chạy lại (IF NOT EXISTS / OR REPLACE / DROP IF EXISTS / DO guard).
 */
require("dotenv").config();
const fs = require("fs");
const pool = require("./db");

const q = (text, params) => pool.query(text, params).then(r => r.rows);

async function main() {
  // 1. Danh sách bảng
  const tables = (await q(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
  )).map(r => r.tablename);

  let out = `-- ════════════════════════════════════════════════════════════════════
-- EduX — SCHEMA ĐẦY ĐỦ (file schema DUY NHẤT, tự sinh từ DB thật bằng gen-schema.js)
-- Dựng lại toàn bộ DB từ đầu: mọi bảng + constraint + index + trigger + seed.
-- Chạy 1 lần trên DB TRỐNG (Supabase SQL Editor). An toàn chạy lại (idempotent).
-- Sinh lúc: ${new Date().toISOString()}
-- Tổng số bảng: ${tables.length}
-- ════════════════════════════════════════════════════════════════════

`;

  // ── 2. CREATE TABLE (cột + ràng buộc PK/UNIQUE/CHECK inline; FK tách riêng) ──
  out += `-- ─── BẢNG ───────────────────────────────────────────────────────────\n\n`;
  const fkStatements = [];

  for (const t of tables) {
    // Cột
    const cols = await q(
      `SELECT a.attname AS name,
              format_type(a.atttypid, a.atttypmod) AS type,
              a.attnotnull AS notnull,
              pg_get_expr(d.adbin, d.adrelid) AS dflt
       FROM pg_attribute a
       LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
       WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
       ORDER BY a.attnum`,
      [`public."${t}"`]
    );

    // Ràng buộc
    const cons = await q(
      `SELECT conname, contype, pg_get_constraintdef(oid) AS def
       FROM pg_constraint WHERE conrelid = $1::regclass
       ORDER BY CASE contype WHEN 'p' THEN 0 WHEN 'u' THEN 1 WHEN 'c' THEN 2 ELSE 3 END, conname`,
      [`public."${t}"`]
    );

    const lines = cols.map(c => {
      let l = `  ${c.name} ${c.type}`;
      if (c.dflt) l += ` DEFAULT ${c.dflt}`;
      if (c.notnull) l += ` NOT NULL`;
      return l;
    });

    // Inline PK/UNIQUE/CHECK; FK để riêng (tránh phụ thuộc thứ tự bảng)
    for (const c of cons) {
      if (c.contype === "f") {
        fkStatements.push({ table: t, name: c.conname, def: c.def });
      } else {
        lines.push(`  CONSTRAINT ${c.conname} ${c.def}`);
      }
    }

    out += `CREATE TABLE IF NOT EXISTS ${t} (\n${lines.join(",\n")}\n);\n\n`;
  }

  // ── 3. FOREIGN KEYS (sau khi mọi bảng đã tạo) ──
  out += `-- ─── KHÓA NGOẠI (FK) ────────────────────────────────────────────────\n`;
  for (const fk of fkStatements) {
    out += `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='${fk.name}' AND conrelid='${fk.table}'::regclass) THEN
    ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.name} ${fk.def};
  END IF;
END $$;\n`;
  }
  out += `\n`;

  // ── 4. INDEX (bỏ index backing PK/UNIQUE) ──
  out += `-- ─── INDEX ──────────────────────────────────────────────────────────\n`;
  const consNames = new Set(
    (await q(`SELECT conname FROM pg_constraint WHERE contype IN ('p','u')`)).map(r => r.conname)
  );
  for (const t of tables) {
    const idx = await q(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=$1`,
      [t]
    );
    for (const i of idx) {
      if (consNames.has(i.indexname)) continue; // index của PK/UNIQUE đã có trong constraint
      let def = i.indexdef
        .replace(/^CREATE INDEX /, "CREATE INDEX IF NOT EXISTS ")
        .replace(/^CREATE UNIQUE INDEX /, "CREATE UNIQUE INDEX IF NOT EXISTS ");
      out += def + ";\n";
    }
  }
  out += `\n`;

  // ── 5. FUNCTIONS + TRIGGERS ──
  out += `-- ─── FUNCTIONS & TRIGGERS ───────────────────────────────────────────\n`;
  // Lấy các function được trigger dùng (distinct)
  const trigs = await q(
    `SELECT t.tgname, c.relname AS tbl, t.tgfoid,
            pg_get_triggerdef(t.oid) AS def
     FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND NOT t.tgisinternal
     ORDER BY c.relname, t.tgname`
  );
  const fnOids = [...new Set(trigs.map(t => t.tgfoid))];
  for (const oid of fnOids) {
    const def = (await q(`SELECT pg_get_functiondef($1) AS def`, [oid]))[0].def;
    out += def + ";\n\n";
  }
  for (const tr of trigs) {
    out += `DROP TRIGGER IF EXISTS ${tr.tgname} ON ${tr.tbl};\n${tr.def};\n`;
  }
  out += `\n`;

  // ── 6. SEED: subjects ──
  const subs = await q(`SELECT name, category FROM subjects ORDER BY name`);
  if (subs.length) {
    out += `-- ─── SEED: môn học ──────────────────────────────────────────────────\n`;
    out += `INSERT INTO subjects (name, category) VALUES\n`;
    out += subs.map(s => `  ('${s.name.replace(/'/g, "''")}', ${s.category ? `'${s.category.replace(/'/g, "''")}'` : "NULL"})`).join(",\n");
    out += `\nON CONFLICT (name) DO NOTHING;\n\n`;
  }

  out += `-- ════════════════════════════════════════════════════════════════════\n-- HẾT SCHEMA\n-- ════════════════════════════════════════════════════════════════════\n`;

  fs.writeFileSync("schema_full.sql", out, "utf8");
  console.log(`✓ Đã sinh schema_full.sql — ${tables.length} bảng, ${fkStatements.length} FK, ${trigs.length} trigger, ${subs.length} môn seed`);
  console.log(`  Kích thước: ${(out.length / 1024).toFixed(1)} KB`);
  await pool.end();
}
main().catch(e => { console.error("LỖI:", e.message); process.exit(1); });
