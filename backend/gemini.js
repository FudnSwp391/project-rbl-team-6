const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const dotenv = require("dotenv");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const GEMINI_MODEL = "gemini-2.0-flash";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
const GROQ_MODEL = "llama-3.3-70b-versatile";

const hasGroq = !!process.env.GROQ_API_KEY;

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

  return `You are an expert Vietnamese educator. ${context}

Generate exactly ${count} questions about "${topic}".
Difficulty level: ${difficultyMap[difficulty] || difficultyMap.medium}.

CRITICAL RULES:
${typeRules}
- Questions must test actual knowledge of "${coreTopic}" content, NOT meta-questions about how to study it
- If Multiple Choice: Questions must have SPECIFIC, MEANINGFUL answer options
- If Essay: Questions must require students to write sentences, paragraphs or solve problems with steps.
- If Mathematics: include actual calculations or mathematical concepts
- If Physics/Chemistry/Biology: include real scientific facts and formulas
- If English: include actual grammar, vocabulary or reading questions in English
- If History/Geography: include real historical events, dates, places
${grade ? `- Content must be appropriate for Grade ${grade} Vietnamese students` : ""}
- CRITICAL LANGUAGE RULE: When generating content in Vietnamese, use ONLY standard Vietnamese alphabet (Chữ Quốc Ngữ). ABSOLUTELY DO NOT mix Chinese/Kanji/Hanja characters into Vietnamese sentences.
- EXCEPTION: You may use foreign languages and characters ONLY IF the quiz topic is explicitly about that specific foreign language.
- Questions should be in Vietnamese for all general subjects (Toán, Ngữ văn, Lịch sử, GDCD, etc.).

IMPORTANT: Return ONLY a valid JSON array. No markdown, no code blocks, no extra text.

Each object must have exactly these fields depending on question_type:
${jsonFormat}

Generate ${count} diverse questions covering different aspects of "${topic}".`;
}

function normalizeQuestions(questions) {
  return questions.map((q, i) => {
    const isEssay = q.question_type === 'essay';
    const normalized = {
      question: q.question || 'Question ' + (i + 1),
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

async function generateQuizQuestions(topic, count = 10, difficulty = "medium", questionType = "multiple_choice") {
  const prompt = buildQuizPrompt(topic, count, difficulty, questionType);

  try {
    console.log('🤖 Generating quiz [Gemini]: "' + topic + '" (' + count + 'q, ' + difficulty + ')');
    const questions = await generateWithGemini(prompt);
    console.log('✅ Gemini success: ' + questions.length + ' questions');
    return normalizeQuestions(questions);
  } catch (geminiErr) {
    if (isQuotaError(geminiErr)) {
      console.warn('⚠️  Gemini quota exceeded — trying Groq fallback for "' + topic + '"');
    } else {
      console.error("❌ Gemini error:", geminiErr.message, "— trying Groq fallback");
    }
  }

  if (hasGroq) {
    try {
      console.log('🔄 Generating quiz [Groq]: "' + topic + '" (' + count + 'q, ' + difficulty + ')');
      const questions = await generateWithGroq(prompt);
      console.log('✅ Groq success: ' + questions.length + ' questions');
      return normalizeQuestions(questions);
    } catch (groqErr) {
      console.error("❌ Groq error:", groqErr.message);
    }
  }

  console.error('💀 Both Gemini and Groq failed for "' + topic + '"');
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
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(clean);
    return {
      score: parsed.score || 0,
      feedback: parsed.feedback || "Không thể tải nhận xét từ AI."
    };
  } catch (e) {
    console.error("AI grading failed:", e);
    if (hasGroq) {
        try {
          const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 1024,
          });
          const text = completion.choices[0]?.message?.content?.trim() || "{}";
          const clean = text.replace(/^ + "`" + (?:json)?\s*/i, "").replace(/\s* + "`" + $/i, "").trim();
          const parsed = JSON.parse(clean);
          return { score: parsed.score || 0, feedback: parsed.feedback || "Không thể tải nhận xét." };
        } catch (err) {
            console.error("Groq fallback grading failed:", err);
        }
    }
    return { score: 0, feedback: "Lỗi hệ thống khi chấm điểm tự luận." };
  }
}

module.exports = { generateQuizQuestions, chatWithAI, gradeEssayAnswer };
