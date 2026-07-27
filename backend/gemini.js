const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const dotenv = require("dotenv");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const GEMINI_MODEL = "gemini-2.5-flash-lite";

function getGroqKeys() {
  const keysStr = [process.env.GROQ_API_KEYS, process.env.GROQ_API_KEY]
    .filter(Boolean)
    .join(",");
  return Array.from(new Set(keysStr.split(",").map((k) => k.trim()).filter(Boolean)));
}

const GROQ_KEYS = getGroqKeys();
const GROQ_MODEL = "llama-3.3-70b-versatile";

const hasGroq = GROQ_KEYS.length > 0;
let groqKeyIndex = 0;

/**
 * Executes a function with Groq SDK, rotating through available API keys on error.
 */
async function callGroqWithRetry(actionFn) {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    throw new Error("No Groq API keys configured");
  }

  let lastErr = null;
  const maxAttempts = keys.length;

  for (let i = 0; i < maxAttempts; i++) {
    const key = keys[groqKeyIndex];
    groqKeyIndex = (groqKeyIndex + 1) % keys.length;
    const client = new Groq({ apiKey: key });

    try {
      return await actionFn(client);
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️ Groq API key (ending ...${key.slice(-6)}) failed: ${err.message || err}. Retrying next key...`);
    }
  }

  throw lastErr || new Error("All Groq API keys failed");
}

function isQuotaError(err) {
  const msg = err?.message || "";
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("rate limit") ||
    msg.includes("Rate limit")
  );
}

function generateQuotaNotice(topic, count) {
  const notices = [];
  for (let i = 0; i < count; i++) {
    notices.push({
      question: `⚠️ AI Quota Exceeded — Không thể tạo câu hỏi cho ${topic} lúc này. Vui lòng thử lại sau hoặc sử dụng mục "Đề thi có sẵn". (Câu ${i + 1}/${count})`,
      optionA: "Thử lại sau ít phút",
      optionB: "Chọn số câu ít hơn",
      optionC: "Chuyển sang mục Đề thi có sẵn",
      optionD: "Liên hệ gia sư để được hỗ trợ",
      correctAnswer: "C",
      explanation:
        'Khi AI API đạt giới hạn, bạn có thể sử dụng tính năng "Đề thi có sẵn" (do gia sư upload) để tiếp tục luyện tập.',
    });
  }
  return notices;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Language detection helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect which foreign language the topic is about.
 * Returns an object describing how the quiz should handle scripts/language.
 */
function detectTopicLanguage(topic) {
  const t = topic.toLowerCase();

  // English — questions/answers should be in English (Latin script, fine)
  if (/tiếng anh|english|grammar|vocabulary|ielts|toeic|toefl/.test(t)) {
    return {
      lang: 'english',
      nativeName: 'Tiếng Anh',
      script: 'latin',
      questionLang: 'English',
      allowForeignScript: false, // Latin script is always fine
      promptRule: `Since this is an English language quiz:
- Write ALL questions and answer options IN ENGLISH (not Vietnamese).
- Explanations may be bilingual (English + Vietnamese) to help learners.
- Use proper English grammar, vocabulary, and sentence structure.`,
    };
  }

  // French — Latin script, questions/answers in French
  if (/tiếng pháp|french|français|le français/.test(t)) {
    return {
      lang: 'french',
      nativeName: 'Tiếng Pháp',
      script: 'latin',
      questionLang: 'French',
      allowForeignScript: false,
      promptRule: `Since this is a French language quiz:
- Write ALL questions and answer options IN FRENCH.
- Explanations should be in Vietnamese to help learners understand.
- Use proper French grammar, vocabulary, and sentence structure.`,
    };
  }

  // German — Latin script
  if (/tiếng đức|german|deutsch/.test(t)) {
    return {
      lang: 'german',
      nativeName: 'Tiếng Đức',
      script: 'latin',
      questionLang: 'German',
      allowForeignScript: false,
      promptRule: `Since this is a German language quiz:
- Write ALL questions and answer options IN GERMAN.
- Explanations should be in Vietnamese to help learners understand.`,
    };
  }

  // Spanish — Latin script
  if (/tiếng tây ban nha|spanish|español/.test(t)) {
    return {
      lang: 'spanish',
      nativeName: 'Tiếng Tây Ban Nha',
      script: 'latin',
      questionLang: 'Spanish',
      allowForeignScript: false,
      promptRule: `Since this is a Spanish language quiz:
- Write ALL questions and answer options IN SPANISH.
- Explanations should be in Vietnamese to help learners understand.`,
    };
  }

  // Japanese — uses Hiragana, Katakana, Kanji
  if (/tiếng nhật|japanese|日本語|nihongo/.test(t)) {
    return {
      lang: 'japanese',
      nativeName: 'Tiếng Nhật',
      script: 'japanese', // Hiragana U+3040-309F, Katakana U+30A0-30FF, Kanji U+4E00-9FFF
      allowForeignScript: true,
      promptRule: `Since this is a Japanese language quiz:
- Questions should be in Vietnamese, asking about Japanese words/grammar/vocabulary.
- Japanese words, phrases, or example sentences MUST be written using proper Japanese script (Hiragana/Katakana/Kanji) — do NOT romanize them unless specifically testing romaji.
- Explanations should be in Vietnamese.
- Example format: "Từ '日本語' (nihongo) có nghĩa là gì?" with options in Vietnamese.`,
    };
  }

  // Chinese — uses Hanzi
  if (/tiếng trung|chinese|mandarin|hán ngữ|trung quốc|中文|汉语/.test(t)) {
    return {
      lang: 'chinese',
      nativeName: 'Tiếng Trung',
      script: 'chinese', // CJK U+4E00-9FFF
      allowForeignScript: true,
      promptRule: `Since this is a Chinese language quiz:
- Questions should be in Vietnamese, asking about Chinese words/characters/grammar.
- Chinese words, characters, or example sentences MUST use proper Chinese characters (汉字).
- Explanations should be in Vietnamese.
- Example format: "Từ '你好' có nghĩa là gì?" with options in Vietnamese.`,
    };
  }

  // Korean — uses Hangul
  if (/tiếng hàn|korean|hangul|한국어/.test(t)) {
    return {
      lang: 'korean',
      nativeName: 'Tiếng Hàn',
      script: 'korean', // Hangul U+AC00-D7AF
      allowForeignScript: true,
      promptRule: `Since this is a Korean language quiz:
- Questions should be in Vietnamese, asking about Korean words/grammar/vocabulary.
- Korean words or example sentences MUST be written in Hangul — do NOT romanize them unless testing romanization.
- Explanations should be in Vietnamese.
- Example format: "Từ '안녕하세요' được dùng để làm gì?" with options in Vietnamese.`,
    };
  }

  // Arabic
  if (/tiếng ả rập|arabic|عربي/.test(t)) {
    return {
      lang: 'arabic',
      nativeName: 'Tiếng Ả Rập',
      script: 'arabic', // Arabic U+0600-06FF
      allowForeignScript: true,
      promptRule: `Since this is an Arabic language quiz:
- Questions should be in Vietnamese, asking about Arabic words/grammar/vocabulary.
- Arabic words or example sentences should use proper Arabic script.
- Explanations should be in Vietnamese.`,
    };
  }

  // Default: pure Vietnamese topic — no foreign script allowed
  return {
    lang: 'vietnamese',
    nativeName: 'Tiếng Việt',
    script: 'latin',
    allowForeignScript: false,
    promptRule: null, // will use strict Vietnamese-only rule
  };
}

/**
 * Check if a text field contains unexpected foreign script.
 * Takes the topic language info to know what IS expected.
 */
function containsUnexpectedForeignScript(text, topicLang) {
  if (!text || typeof text !== 'string') return false;

  // For pure Vietnamese topics: no CJK, no Arabic, no Japanese kana allowed
  if (topicLang.lang === 'vietnamese') {
    return /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0600-\u06FF]/.test(text);
  }

  // For Japanese topic: Chinese-only characters could still slip in unexpectedly,
  // but Hiragana/Katakana/Kanji are all expected — skip check
  if (topicLang.lang === 'japanese') return false;

  // For Chinese topic: Hanzi is expected — skip check
  if (topicLang.lang === 'chinese') return false;

  // For Korean topic: Hangul is expected — skip check
  if (topicLang.lang === 'korean') return false;

  // For Arabic topic: Arabic script is expected — skip check
  if (topicLang.lang === 'arabic') return false;

  // For Latin-script foreign languages (English/French/German/Spanish):
  // CJK, Japanese kana, Hangul, Arabic would all be unexpected
  return /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0600-\u06FF]/.test(text);
}

function hasBadScriptInQuestion(q, topicLang) {
  const fields = [q.question, q.optionA, q.optionB, q.optionC, q.optionD,
                  q.option_a, q.option_b, q.option_c, q.option_d,
                  q.explanation, q.suggested_answer];
  return fields.some(f => containsUnexpectedForeignScript(f, topicLang));
}

function buildCurriculumContext(topic) {
  const gradeMatch = topic.match(/l[oớ]p\s*(\d+)/i);
  const grade = gradeMatch ? parseInt(gradeMatch[1]) : null;
  const coreTopic = topic.replace(/l[oớ]p\s*\d+/gi, "").trim();

  let context = "";
  if (grade) {
    const level =
      grade <= 5 ? "Tiểu học" : grade <= 9 ? "THCS" : "THPT";
    context = `This is for Vietnamese students in Grade ${grade} (${level} level) following the 2018 Vietnamese National Curriculum (Chương trình GDPT 2018).`;

    const subjectContexts = {
      "toán": "Focus on algebra, geometry, statistics topics taught at this grade level in Vietnamese textbooks.",
      "ngữ văn": "Focus on Vietnamese literature, grammar, reading comprehension and writing skills at this grade level.",
      "tiếng anh": "Focus on English grammar, vocabulary, reading comprehension and communication skills appropriate for this grade level.",
      "vật lí": "Focus on physics concepts: mechanics, electricity, optics, thermodynamics as covered in Vietnamese curriculum.",
      "hoá học": "Focus on chemistry: atomic structure, chemical reactions, organic chemistry as per Vietnamese curriculum.",
      "sinh học": "Focus on biology: cells, genetics, ecology, human body systems as per Vietnamese curriculum.",
      "lịch sử": "Focus on Vietnamese and world history topics covered at this grade level.",
      "địa lí": "Focus on geography: Vietnam geography, world geography, economic geography at this level.",
      "tin học": "Focus on computer science: programming, data structures, office applications at this grade level.",
      "gdcd": "Focus on civic education: ethics, law, economics as covered in Vietnamese curriculum.",
    };

    const lower = coreTopic.toLowerCase();
    for (const [key, ctx] of Object.entries(subjectContexts)) {
      if (lower.includes(key)) {
        context += ctx;
        break;
      }
    }
  }

  return { context, coreTopic: coreTopic || topic, grade };
}

function buildQuizPrompt(topic, count, difficulty, questionType = 'multiple_choice') {
  const difficultyMap = {
    easy: "simple, straightforward questions suitable for beginners",
    medium: "moderately challenging questions requiring good understanding",
    hard: "complex, analytical questions requiring deep knowledge",
  };

  const { context, coreTopic, grade } = buildCurriculumContext(topic);
  const topicLang = detectTopicLanguage(topic);

  let typeRules = "";
  let jsonFormat = "";

  if (questionType === 'essay') {
    typeRules = "- Generate ONLY ESSAY (Tự luận) questions. No multiple choice options. Important: Follow the format of the 2018 Vietnamese National Curriculum. For example, if the topic is Literature (Ngữ văn), structure it with 1 Reading Comprehension (Đọc hiểu) question and 1 Writing (Làm văn) question.";
    jsonFormat = `{
  "question": "The essay question text. E.g. 'Phần I. Đọc hiểu: ...' or 'Phần II. Làm văn: ...'",
  "question_type": "essay",
  "suggested_answer": "A detailed suggested answer or grading criteria (Đáp án gợi ý/Thang điểm) for this essay question",
  "explanation": "Brief explanation of the core concept being tested"
}`;
  } else if (questionType === 'mixed') {
    typeRules = "- Generate a MIX of multiple-choice and essay questions (roughly 50/50).";
    jsonFormat = `{
  "question": "The question text",
  "question_type": "multiple_choice or essay",
  "optionA": "Option A text (if multiple_choice)",
  "optionB": "Option B text (if multiple_choice)",
  "optionC": "Option C text (if multiple_choice)",
  "optionD": "Option D text (if multiple_choice)",
  "correctAnswer": "A, B, C, or D (if multiple_choice)",
  "suggested_answer": "A detailed suggested answer (if essay)",
  "explanation": "Brief explanation"
}`;
  } else {
    typeRules = "- Generate ONLY MULTIPLE CHOICE (Trắc nghiệm) questions with 4 options.";
    jsonFormat = `{
  "question": "The question text",
  "question_type": "multiple_choice",
  "optionA": "Option A text",
  "optionB": "Option B text",
  "optionC": "Option C text",
  "optionD": "Option D text",
  "correctAnswer": "A, B, C, or D",
  "explanation": "Brief explanation of the correct answer"
}`;
  }

  // Build the language rule section based on detected topic language
  let languageRule;
  if (topicLang.promptRule) {
    // Foreign language topic — use its specific rule
    languageRule = `LANGUAGE RULES FOR THIS TOPIC (${topicLang.nativeName.toUpperCase()}):
${topicLang.promptRule}
- IMPORTANT: Even for foreign language topics, do NOT mix unrelated foreign scripts. For example, do not include Chinese characters in a Japanese quiz unless the question is specifically about borrowed kanji.`;
  } else {
    // Pure Vietnamese topic — strict no-foreign-script rule
    languageRule = `LANGUAGE RULES (STRICTLY ENFORCED):
- ALL content (questions, answer options, explanations) MUST be written in PURE Vietnamese (Chữ Quốc Ngữ only).
- ABSOLUTELY FORBIDDEN: Chinese characters (汉字), Japanese Hiragana/Katakana/Kanji, Korean Hangul, Arabic script, or any other non-Latin script.
- This applies to EVERY field: question, optionA, optionB, optionC, optionD, explanation, suggested_answer.
- NO EXCEPTIONS — even if a concept has a foreign name, write it using Vietnamese alphabet transliteration.
- Before returning each question, verify every single option contains only Vietnamese text.`;
  }

  return `You are an expert Vietnamese educator. ${context}

Generate exactly ${count} questions about "${topic}".
Difficulty level: ${difficultyMap[difficulty] || difficultyMap.medium}.

CRITICAL RULES:
${typeRules}
- Questions must test actual knowledge of "${coreTopic}", NOT meta-questions about how to study it.
- ABSOLUTELY NO UNSEEN IMAGE REFERENCES:
  Do NOT generate questions that refer to unseen images, figures, diagrams, or drawings (e.g., "trong hình sau", "ở hình bên", "xem hình dưới đây", "sơ đồ sau", "bức tranh bên", "đếm số hình trong hình dưới").
  The test system is TEXT-ONLY. ALL questions MUST be 100% self-contained using text, numbers, formulas, or explicit word-problem descriptions. For math or geometry, describe all shapes, counts, and dimensions explicitly in words so students can solve without needing an image!
- If Multiple Choice: Questions must have SPECIFIC, MEANINGFUL answer options.
- If Essay: Questions must require students to write sentences, paragraphs or solve problems with steps.
- If Mathematics: include actual calculations or mathematical concepts.
- If Physics/Chemistry/Biology: include real scientific facts and formulas.
- If History/Geography: include real historical events, dates, places.
${grade ? `- Content must be appropriate for Grade ${grade} Vietnamese students.` : ""}

${languageRule}

IMPORTANT: Return ONLY a valid JSON array. No markdown, no code blocks, no extra text.

Each object must have exactly these fields depending on question_type:
${jsonFormat}

Generate ${count} diverse questions covering different aspects of "${topic}".`;
}

function sanitizeQuestionText(text) {
  if (!text) return text;
  return text
    .replace(/\b(trong|ở|xem|xem qua|theo|dựa vào)\s+hình\s+(sau|bên|dưới|dưới đây|vẽ sau)\b/gi, "bài toán")
    .replace(/\bhình\s+(sau|bên|dưới|dưới đây|vẽ sau)\b/gi, "đề bài")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuestions(questions) {
  return questions.map((q, i) => {
    const isEssay = q.question_type === 'essay';
    const rawQuestion = q.question || 'Question ' + (i + 1);
    const normalized = {
      question: sanitizeQuestionText(rawQuestion),
      question_type: q.question_type || 'multiple_choice',
      explanation: q.explanation || "No explanation provided.",
    };

    if (isEssay) {
      normalized.suggested_answer = q.suggested_answer || q.suggestedAnswer || "No suggested answer provided.";
    } else {
      normalized.optionA = q.optionA || q.option_a || "Option A";
      normalized.optionB = q.optionB || q.option_b || "Option B";
      normalized.optionC = q.optionC || q.option_c || "Option C";
      normalized.optionD = q.optionD || q.option_d || "Option D";
      normalized.correctAnswer = (q.correctAnswer || q.correct_answer || "A")
        .toString()
        .toUpperCase()
        .charAt(0);
    }
    return normalized;
  });
}

function parseJsonResponse(text) {
  const clean = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed)) throw new Error("AI did not return an array");
  return parsed;
}

async function generateWithGemini(prompt) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(prompt);
  return parseJsonResponse(result.response.text().trim());
}

async function generateWithGroq(prompt) {
  return await callGroqWithRetry(async (groqClient) => {
    const completion = await groqClient.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert Vietnamese educator. Always respond with ONLY a valid JSON array. No markdown, no explanation, no code blocks.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "[]";
    return parseJsonResponse(text);
  });
}

async function chatWithGroq(messages, systemInstruction) {
  const groqMessages = [
    { role: "system", content: systemInstruction },
    ...messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    })),
  ];

  return await callGroqWithRetry(async (groqClient) => {
    const completion = await groqClient.chat.completions.create({
      model: GROQ_MODEL,
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content?.trim() || "";
  });
}

async function generateQuizQuestions(topic, count = 10, difficulty = "medium", questionType = "multiple_choice") {
  const prompt = buildQuizPrompt(topic, count, difficulty, questionType);
  const topicLang = detectTopicLanguage(topic);

  async function tryGenerate(generatorFn, label) {
    console.log(`🤖 Generating quiz [${label}]: "${topic}" (${count}q, ${difficulty}, lang: ${topicLang.lang})`);
    let questions = await generatorFn(prompt);
    console.log(`✅ ${label} success: ${questions.length} questions`);

    // Validate: check for unexpected foreign script
    const dirty = questions.filter(q => hasBadScriptInQuestion(q, topicLang));
    if (dirty.length > 0) {
      console.warn(`⚠️  ${label}: ${dirty.length}/${questions.length} questions have unexpected script — retrying once`);
      questions = await generatorFn(prompt);
      const stillDirty = questions.filter(q => hasBadScriptInQuestion(q, topicLang));
      if (stillDirty.length > 0) {
        console.warn(`⚠️  ${label} retry: still ${stillDirty.length} dirty — filtering out bad questions`);
        const clean = questions.filter(q => !hasBadScriptInQuestion(q, topicLang));
        if (clean.length === 0) throw new Error('All generated questions failed script validation');
        questions = clean;
      }
    }

    return normalizeQuestions(questions);
  }

  try {
    return await tryGenerate(generateWithGemini, 'Gemini');
  } catch (geminiErr) {
    if (isQuotaError(geminiErr)) {
      console.warn(`⚠️  Gemini quota exceeded — trying Groq fallback for "${topic}"`);
    } else {
      console.error("❌ Gemini error:", geminiErr.message, "— trying Groq fallback");
    }
  }

  if (hasGroq) {
    try {
      return await tryGenerate(generateWithGroq, 'Groq');
    } catch (groqErr) {
      console.error("❌ Groq error:", groqErr.message);
    }
  }

  console.error(`💀 Both Gemini and Groq failed for "${topic}"`);
  return generateQuotaNotice(topic, count);
}

async function chatWithAI(messages) {
  const systemInstruction = `You are a helpful Vietnamese AI Tutor assisting a student.
...
If the user wants to take a test/quiz, ask them:
1. Topic?
2. Number of questions? (Max 30)
3. Difficulty? (Easy/Medium/Hard)
Once they provide these, output exactly this XML block (and nothing else after it):
<QUIZ_PARAMS>{"topic":"...", "count":10, "difficulty":"medium"}</QUIZ_PARAMS>

Be friendly, encouraging, and help the student clarify their needs.
If the message is in Vietnamese, respond in Vietnamese.
If the message is in English, respond in English.`;

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction,
    });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    const chat = model.startChat({ history });
    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMsg.text);
    const reply = result.response.text();

    const paramsMatch = reply.match(/<QUIZ_PARAMS>([\s\S]*?)<\/QUIZ_PARAMS>/);
    let params = null;
    if (paramsMatch) {
      try { params = JSON.parse(paramsMatch[1]); } catch (_) {}
    }

    const cleanReply = reply
      .replace(/<QUIZ_PARAMS>[\s\S]*?<\/QUIZ_PARAMS>/g, "")
      .trim();
    return { reply: cleanReply, params, ai_unavailable: false };

  } catch (geminiErr) {
    if (isQuotaError(geminiErr)) {
      console.warn("⚠️  Gemini chat quota exceeded — trying Groq");
    } else {
      console.error("❌ Gemini chat error:", geminiErr.message, "— trying Groq");
    }
  }

  if (hasGroq) {
    try {
      const reply = await chatWithGroq(messages, systemInstruction);

      const paramsMatch = reply.match(/<QUIZ_PARAMS>([\s\S]*?)<\/QUIZ_PARAMS>/);
      let params = null;
      if (paramsMatch) {
        try { params = JSON.parse(paramsMatch[1]); } catch (_) {}
      }

      const cleanReply = reply
        .replace(/<QUIZ_PARAMS>[\s\S]*?<\/QUIZ_PARAMS>/g, "")
        .trim();
      return { reply: cleanReply, params, ai_unavailable: false };

    } catch (groqErr) {
      console.error("❌ Groq chat error:", groqErr.message);
    }
  }

  console.warn("💀 Both Gemini and Groq chat failed — using local intent parser");
  return { reply: null, params: null, ai_unavailable: true };
}

async function gradeEssayAnswer(questionText, suggestedAnswer, studentAnswer) {
  if (!studentAnswer || studentAnswer.trim().length === 0) {
    return { score: 0, feedback: "Học sinh không có câu trả lời." };
  }

  const prompt = `You are an expert Vietnamese educator grading an essay question.

Question: ${questionText}
Suggested Answer/Criteria: ${suggestedAnswer || "No criteria provided. Grade based on general knowledge."}
Student's Answer: ${studentAnswer}

INSTRUCTIONS:
1. Grade the student's answer based on the suggested criteria. Give a score from 0 to 100.
2. Provide a constructive, encouraging feedback in Vietnamese explaining what the student did well and what needs improvement.
3. INAPPROPRIATE CONTENT: If the student's answer contains profanity, inappropriate language, or is completely disrespectful/nonsensical, give a score of 0 and provide a strict but professional reminder to maintain proper educational etiquette. DO NOT provide any AI detection warnings in this case.
4. CRITICAL - AI DETECTION: Evaluate the naturalness of the student's answer. Does it sound like it was written by an AI (ChatGPT/Gemini)?
   - ONLY IF you strongly suspect AI usage (highly robotic structure, unnatural transitions, excessively perfect but soulless vocabulary), append this EXACT reminder at the end of your feedback: "Lưu ý: Bài viết của em rất tốt, tuy nhiên cách hành văn có vẻ giống với văn mẫu hoặc công cụ AI. Thầy cô khuyến khích em tự diễn đạt bằng lời văn của mình để hiểu bài sâu sắc hơn nhé!"
   - DO NOT use that phrase or mention "tự diễn đạt bằng lời văn của mình" if you do not suspect AI usage or if the answer is just short/poor.

IMPORTANT: Return ONLY a valid JSON object. No markdown, no extra text.
{
  "score": <integer 0-100>,
  "feedback": "Your detailed feedback and (if applicable) AI usage reminder here in Vietnamese"
}`;

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const clean = jsonMatch ? jsonMatch[0] : "{}";
    const parsed = JSON.parse(clean);
    return {
      score: parsed.score || 0,
      feedback: parsed.feedback || "Không thể tải nhận xét từ AI."
    };
  } catch (e) {
    console.error("AI grading failed:", e);
    if (hasGroq) {
        try {
          const parsed = await callGroqWithRetry(async (groqClient) => {
            const completion = await groqClient.chat.completions.create({
              model: GROQ_MODEL,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.3,
              max_tokens: 1024,
            });
            const text = completion.choices[0]?.message?.content?.trim() || "{}";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const clean = jsonMatch ? jsonMatch[0] : "{}";
            return JSON.parse(clean);
          });
          return { score: parsed.score || 0, feedback: parsed.feedback || "Không thể tải nhận xét." };
        } catch (err) {
            console.error("Groq fallback grading failed:", err);
        }
    }
    return { score: 0, feedback: "Lỗi hệ thống khi chấm điểm tự luận." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  AI Gợi ý Gia sư (TV3) — nhận prompt + danh sách gia sư đã duyệt → chọn phù hợp
// ─────────────────────────────────────────────────────────────────────────────

// Parse 1 JSON OBJECT (khác parseJsonResponse vốn ép mảng)
function parseObjectResponse(text) {
  let clean = (text || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
    if (a !== -1 && b > a) return JSON.parse(clean.slice(a, b + 1));
    throw new Error("AI không trả JSON object hợp lệ");
  }
}

function normalizeSuggest(o) {
  return {
    reply: typeof o?.reply === "string" ? o.reply : "",
    tutorIds: Array.isArray(o?.tutorIds) ? o.tutorIds.map(String) : [],
  };
}

/**
 * suggestTutors — chọn tối đa 3 gia sư phù hợp với yêu cầu người dùng.
 * @param {string} userPrompt
 * @param {Array}  tutorList  danh sách gia sư ĐÃ DUYỆT (status='approved')
 * @returns {Promise<{reply:string, tutorIds:string[]}|null>} null nếu AI lỗi → caller tự fallback
 */
async function suggestTutors(userPrompt, tutorList) {
  const compact = (tutorList || []).map((t) => ({
    id: t.id,
    name: t.full_name || t.name,
    subjects: t.subjects,
    methods: t.teaching_methods || t.methods,
    pricePerHour: t.hourly_rate,
    location: t.city || t.location,
    experience: t.experience_years,
    rating: t.avg_r ?? t.avg_rating,
    bio: t.bio,
  }));

  const prompt = `Bạn là trợ lý AI của EduX giúp học sinh tìm gia sư. Dựa trên YÊU CẦU của người dùng và DANH SÁCH GIA SƯ (đã được duyệt) bên dưới:
- Nếu là chào hỏi/trò chuyện phiếm: trả lời thân thiện 1-2 câu, "tutorIds": [].
- Nếu mô tả nhu cầu tìm gia sư (môn, cấp lớp, giá, hình thức...): xác nhận ngắn gọn (1-2 câu) rồi chọn TỐI ĐA 3 gia sư phù hợp nhất.
- Nếu không có gia sư phù hợp: nói nhẹ nhàng và gợi ý nới tiêu chí, "tutorIds": [].
Luôn trả lời bằng tiếng Việt, ấm áp, KHÔNG dùng markdown.
CHỈ trả về JSON thuần dạng: {"reply":"câu trả lời","tutorIds":["<id gia sư>", "..."]}

DANH SÁCH GIA SƯ:
${JSON.stringify(compact, null, 1)}

YÊU CẦU CỦA NGƯỜI DÙNG: "${userPrompt}"`;

  async function viaGemini() {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const r = await model.generateContent(prompt);
    return parseObjectResponse(r.response.text().trim());
  }
  async function viaGroq() {
    return await callGroqWithRetry(async (groqClient) => {
      const c = await groqClient.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "Bạn là trợ lý tìm gia sư. CHỈ trả về 1 JSON object hợp lệ, không markdown, không giải thích." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 1024,
      });
      return parseObjectResponse((c.choices[0]?.message?.content || "{}").trim());
    });
  }

  try {
    return normalizeSuggest(await viaGemini());
  } catch (e) {
    if (isQuotaError(e)) console.warn("⚠️  suggestTutors: Gemini hết quota — thử Groq");
    else if (e.message && e.message.includes("401")) console.error("❌ suggestTutors Gemini: API key không hợp lệ (401 Unauthorized).");
    else console.error("❌ suggestTutors Gemini:", e.message);
  }
  if (hasGroq) {
    try {
      return normalizeSuggest(await viaGroq());
    } catch (e) {
      if (e.message && e.message.includes("401")) console.error("❌ suggestTutors Groq: API key không hợp lệ (401 Unauthorized).");
      else console.error("❌ suggestTutors Groq:", e.message);
    }
  }
  return null;
}

module.exports = { generateQuizQuestions, chatWithAI, gradeEssayAnswer, suggestTutors };
