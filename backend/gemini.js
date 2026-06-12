/**
 * gemini.js — EduX AI Quiz Generator
 * Primary:  Google Gemini (gemini-2.0-flash)
 * Fallback: Groq (llama-3.3-70b-versatile) — auto-activates when Gemini quota exceeded
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const dotenv = require("dotenv");
dotenv.config();

// ─── AI Clients ────────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const GEMINI_MODEL = "gemini-2.0-flash";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
const GROQ_MODEL = "llama-3.3-70b-versatile";

const hasGroq = !!process.env.GROQ_API_KEY;

// ─── Error helpers ─────────────────────────────────────────────────────────────
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

// ─── Quota notice (last resort when both AIs fail) ────────────────────────────
function generateQuotaNotice(topic, count) {
  const notices = [];
  for (let i = 0; i < count; i++) {
    notices.push({
      question: `⚠️ AI Quota Exceeded — Không thể tạo câu hỏi cho "${topic}" lúc này. Vui lòng thử lại sau hoặc sử dụng mục "Đề thi có sẵn". (Câu ${i + 1}/${count})`,
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

// ─── Vietnamese Curriculum Context Builder ────────────────────────────────────
function buildCurriculumContext(topic) {
  const gradeMatch = topic.match(/l[oớ]p\s*(\d+)/i);
  const grade = gradeMatch ? parseInt(gradeMatch[1]) : null;
  const coreTopic = topic.replace(/l[oớ]p\s*\d+/gi, "").trim();

  let context = "";
  if (grade) {
    const level =
      grade <= 5 ? "Tiểu học" : grade <= 9 ? "THCS" : "THPT";
    context = `This is for Vietnamese students in Grade ${grade} (${level} level) following the 2018 Vietnamese National Curriculum (Chương trình GDPT 2018). `;

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

// ─── Build prompt ──────────────────────────────────────────────────────────────
function buildQuizPrompt(topic, count, difficulty) {
  const difficultyMap = {
    easy: "simple, straightforward questions suitable for beginners",
    medium: "moderately challenging questions requiring good understanding",
    hard: "complex, analytical questions requiring deep knowledge",
  };

  const { context, coreTopic, grade } = buildCurriculumContext(topic);

  return `You are an expert Vietnamese educator. ${context}

Generate exactly ${count} multiple-choice quiz questions about "${topic}".
Difficulty level: ${difficultyMap[difficulty] || difficultyMap.medium}.

CRITICAL RULES:
- Questions must test actual knowledge of "${coreTopic}" content, NOT meta-questions about how to study it
- Questions must have SPECIFIC, MEANINGFUL answer options — NOT generic phrases like "systematic analysis" or "passive reading"
- Each option must be a real, distinct answer related to the subject matter
- If Mathematics: include actual calculations or mathematical concepts
- If Physics/Chemistry/Biology: include real scientific facts and formulas
- If English: include actual grammar, vocabulary or reading questions in English
- If History/Geography: include real historical events, dates, places
${grade ? `- Content must be appropriate for Grade ${grade} Vietnamese students` : ""}
- Questions should be in Vietnamese if the subject is Vietnamese (Toán, Ngữ văn, Lịch sử, etc.)
- Questions in English for Tiếng Anh subject

IMPORTANT: Return ONLY a valid JSON array. No markdown, no code blocks, no extra text.

Each object must have exactly these fields:
{
  "question": "The question text",
  "optionA": "Option A text",
  "optionB": "Option B text",
  "optionC": "Option C text",
  "optionD": "Option D text",
  "correctAnswer": "A" or "B" or "C" or "D",
  "explanation": "Brief explanation of why the correct answer is right"
}

Generate ${count} diverse questions covering different aspects of "${topic}".`;
}

// ─── Normalize AI response to standard format ──────────────────────────────────
function normalizeQuestions(questions) {
  return questions.map((q, i) => ({
    question: q.question || `Question ${i + 1}`,
    optionA: q.optionA || q.option_a || "Option A",
    optionB: q.optionB || q.option_b || "Option B",
    optionC: q.optionC || q.option_c || "Option C",
    optionD: q.optionD || q.option_d || "Option D",
    correctAnswer: (q.correctAnswer || q.correct_answer || "A")
      .toString()
      .toUpperCase()
      .charAt(0),
    explanation: q.explanation || "No explanation provided.",
  }));
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

// ─── Gemini generator ──────────────────────────────────────────────────────────
async function generateWithGemini(prompt) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(prompt);
  return parseJsonResponse(result.response.text().trim());
}

// ─── Groq generator ───────────────────────────────────────────────────────────
async function generateWithGroq(prompt) {
  const completion = await groq.chat.completions.create({
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
}

// ─── Groq chat (for chatWithAI fallback) ──────────────────────────────────────
async function chatWithGroq(messages, systemInstruction) {
  const groqMessages = [
    { role: "system", content: systemInstruction },
    ...messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    })),
  ];

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: groqMessages,
    temperature: 0.7,
    max_tokens: 1024,
  });

  return completion.choices[0]?.message?.content?.trim() || "";
}

/**
 * Generate quiz questions.
 * Tries Gemini first → auto-falls back to Groq → last resort: quota notice.
 */
async function generateQuizQuestions(topic, count = 10, difficulty = "medium") {
  const prompt = buildQuizPrompt(topic, count, difficulty);

  // ── 1. Try Gemini ──
  try {
    console.log(`🤖 Generating quiz [Gemini]: "${topic}" (${count}q, ${difficulty})`);
    const questions = await generateWithGemini(prompt);
    console.log(`✅ Gemini success: ${questions.length} questions`);
    return normalizeQuestions(questions);
  } catch (geminiErr) {
    if (isQuotaError(geminiErr)) {
      console.warn(`⚠️  Gemini quota exceeded — trying Groq fallback for "${topic}"`);
    } else {
      console.error("❌ Gemini error:", geminiErr.message, "— trying Groq fallback");
    }
  }

  // ── 2. Try Groq fallback ──
  if (hasGroq) {
    try {
      console.log(`🔄 Generating quiz [Groq]: "${topic}" (${count}q, ${difficulty})`);
      const questions = await generateWithGroq(prompt);
      console.log(`✅ Groq success: ${questions.length} questions`);
      return normalizeQuestions(questions);
    } catch (groqErr) {
      console.error("❌ Groq error:", groqErr.message);
    }
  }

  // ── 3. Last resort: quota notice ──
  console.error(`💀 Both Gemini and Groq failed for "${topic}"`);
  return generateQuotaNotice(topic, count);
}

/**
 * Chat with AI for quiz parameter discovery.
 * Tries Gemini → Groq → signals client to use local parser.
 */
async function chatWithAI(messages) {
  const systemInstruction = `You are a helpful AI tutor assistant for EduX learning platform.
Your job is to understand what practice quiz the student wants to create.

Extract these parameters from the conversation:
- topic: the subject/topic to study (required)
- count: number of questions (default 10, max 30)
- difficulty: "easy", "medium", or "hard" (default "medium")

When you have enough information, end your response with a JSON block like this:
<QUIZ_PARAMS>{"topic":"...", "count":10, "difficulty":"medium"}</QUIZ_PARAMS>

Be friendly, encouraging, and help the student clarify their needs.
If the message is in Vietnamese, respond in Vietnamese.
If the message is in English, respond in English.`;

  // ── 1. Try Gemini ──
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

  // ── 2. Try Groq for chat ──
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

  // ── 3. Signal client to use local parser ──
  console.warn("💀 Both Gemini and Groq chat failed — using local intent parser");
  return { reply: null, params: null, ai_unavailable: true };
}

module.exports = { generateQuizQuestions, chatWithAI };
