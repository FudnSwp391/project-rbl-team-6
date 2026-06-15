/**
 * test_language.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Test AI question generation for language/script contamination issues.
 * Run: node test_language.js
 * Run specific topic: node test_language.js "tiếng nhật lớp 10"
 */

require('dotenv').config();
const { generateQuizQuestions } = require('./gemini');

// ─── Script detection ─────────────────────────────────────────────────────────
const SCRIPT_RANGES = {
  CJK:      /[\u4E00-\u9FFF]/,
  Hiragana: /[\u3040-\u309F]/,
  Katakana: /[\u30A0-\u30FF]/,
  Hangul:   /[\uAC00-\uD7AF]/,
  Arabic:   /[\u0600-\u06FF]/,
  Cyrillic: /[\u0400-\u04FF]/,
};

function detectScripts(text) {
  if (!text) return [];
  return Object.entries(SCRIPT_RANGES)
    .filter(([, regex]) => regex.test(text))
    .map(([name]) => name);
}

/**
 * Determine which scripts are ALLOWED for a given topic.
 * Mirrors the logic in gemini.js detectTopicLanguage().
 */
function getAllowedScripts(topic) {
  const t = topic.toLowerCase();
  if (/tiếng nhật|japanese/.test(t))     return ['CJK', 'Hiragana', 'Katakana']; // Kanji + kana
  if (/tiếng trung|chinese|mandarin/.test(t)) return ['CJK'];
  if (/tiếng hàn|korean/.test(t))        return ['Hangul'];
  if (/tiếng ả rập|arabic/.test(t))      return ['Arabic'];
  // English, French, German, Spanish, Vietnamese — Latin only, no special scripts
  return [];
}

/**
 * Audit a single question. Returns only UNEXPECTED script issues.
 */
function auditQuestion(q, topic) {
  const allowed = getAllowedScripts(topic);
  const fields = {
    question:         q.question,
    optionA:          q.optionA,
    optionB:          q.optionB,
    optionC:          q.optionC,
    optionD:          q.optionD,
    explanation:      q.explanation,
    suggested_answer: q.suggested_answer,
  };

  const issues = [];
  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;
    const found = detectScripts(value).filter(s => !allowed.includes(s));
    if (found.length > 0) {
      issues.push({ field, scripts: found, snippet: value.substring(0, 80) });
    }
  }
  return issues;
}

function printResult(topic, questions) {
  const allowed = getAllowedScripts(topic);
  const allowedNote = allowed.length > 0 ? `(allowed scripts: ${allowed.join(', ')})` : '(Latin/Vietnamese only)';

  console.log('\n' + '═'.repeat(70));
  console.log(`📚 Topic: "${topic}"  ${allowedNote}`);
  console.log('═'.repeat(70));

  let totalIssues = 0;

  questions.forEach((q, i) => {
    const issues = auditQuestion(q, topic);
    const status = issues.length === 0 ? '✅' : '❌';
    console.log(`\n  ${status} Q${i + 1} [${q.question_type}]: ${(q.question || '').substring(0, 65)}...`);

    if (issues.length > 0) {
      issues.forEach(issue => {
        console.log(`     ⚠️  Field "${issue.field}" has UNEXPECTED script [${issue.scripts.join(', ')}]`);
        console.log(`        → "${issue.snippet}"`);
      });
      totalIssues += issues.length;
    } else {
      if (q.question_type !== 'essay') {
        ['A','B','C','D'].forEach(l => {
          const opt = q[`option${l}`];
          if (opt) console.log(`     ${l}) ${opt.substring(0, 65)}`);
        });
      }
    }
  });

  const icon = totalIssues === 0 ? '✅ PASS' : `❌ FAIL (${totalIssues} issue(s))`;
  console.log(`\n  Result: ${icon}`);
  return totalIssues;
}

// ─── Test cases ───────────────────────────────────────────────────────────────
const TEST_CASES = [
  // These were the original problematic ones
  { topic: 'Ngữ văn lớp 11',       difficulty: 'medium', type: 'multiple_choice' },
  { topic: 'Lịch sử lớp 9',        difficulty: 'easy',   type: 'multiple_choice' },
  { topic: 'GDCD lớp 10',          difficulty: 'medium', type: 'multiple_choice' },
  // Foreign language topics — should use their own scripts correctly
  { topic: 'Tiếng Anh lớp 10',     difficulty: 'medium', type: 'multiple_choice' },
  { topic: 'Tiếng Nhật cơ bản',    difficulty: 'easy',   type: 'multiple_choice' },
  { topic: 'Tiếng Trung lớp 6',    difficulty: 'easy',   type: 'multiple_choice' },
  { topic: 'Tiếng Hàn giao tiếp',  difficulty: 'easy',   type: 'multiple_choice' },
  { topic: 'Tiếng Pháp cơ bản',    difficulty: 'easy',   type: 'multiple_choice' },
];

async function runTests(topics) {
  let totalFailed = 0;
  const summary = [];

  for (const tc of topics) {
    try {
      console.log(`\n⏳ Generating 3 questions for "${tc.topic}"...`);
      const questions = await generateQuizQuestions(tc.topic, 3, tc.difficulty, tc.type);
      const issues = printResult(tc.topic, questions);
      const passed = issues === 0;
      summary.push({ topic: tc.topic, passed, issues });
      if (!passed) totalFailed++;
    } catch (err) {
      console.error(`\n💥 Error for "${tc.topic}": ${err.message}`);
      summary.push({ topic: tc.topic, passed: false, issues: -1 });
      totalFailed++;
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));
  summary.forEach(s => {
    const icon = s.passed ? '✅' : '❌';
    const detail = s.issues === -1 ? 'ERROR' : s.issues === 0 ? 'PASS' : `${s.issues} unexpected script issue(s)`;
    console.log(`  ${icon} ${s.topic.padEnd(35)} → ${detail}`);
  });
  console.log(`\n  Total: ${summary.length - totalFailed}/${summary.length} passed`);
  if (totalFailed === 0) {
    console.log('  🎉 All tests passed!');
  } else {
    console.log(`  ⚠️  ${totalFailed} topic(s) had issues — check output above.`);
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────
const customTopic = process.argv[2];

if (customTopic) {
  const diff  = process.argv[3] || 'medium';
  const count = parseInt(process.argv[4]) || 5;
  console.log(`\n🔍 Quick test: "${customTopic}" | difficulty: ${diff} | count: ${count}`);
  generateQuizQuestions(customTopic, count, diff, 'multiple_choice')
    .then(questions => printResult(customTopic, questions))
    .catch(err => console.error('Error:', err.message));
} else {
  console.log('🧪 Running full language contamination test suite...');
  console.log('   (3 questions per topic to keep it fast)\n');
  runTests(TEST_CASES);
}
