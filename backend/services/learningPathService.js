/**
 * AI Learning Path Service — Person 4
 *
 * Generates personalized learning paths using Gemini or a rule-based fallback.
 */
const https = require("https");
const pool = require("../db");

// Helper to query all lessons for a class sorted by lesson_order ASC
async function getLessonsForClass(classId) {
  try {
    const result = await pool.query(
      `SELECT id, title, description, lesson_order FROM lessons
       WHERE class_id = $1
       ORDER BY lesson_order ASC`,
      [classId]
    );
    return result.rows;
  } catch (err) {
    console.error("[LearningPathService] getLessonsForClass error:", err.message);
    return [];
  }
}

// Call Gemini API via direct Node.js HTTPS request (avoids dependency install)
function callGeminiAPI(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            const textResponse = parsed.candidates[0].content.parts[0].text;
            resolve(JSON.parse(textResponse));
          } catch (err) {
            reject(new Error(`Failed to parse Gemini JSON: ${err.message}. Raw: ${body}`));
          }
        } else {
          reject(new Error(`Gemini API returned status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", reject);
    req.write(requestData);
    req.end();
  });
}

/**
 * Generate learning path steps
 *
 * @param {string} classId
 * @param {string} studentId
 * @param {string} currentLevel
 * @param {string} targetLevel
 * @param {string} goal
 * @param {number} durationWeeks
 * @returns {Promise<{ steps: Array }>}
 */
async function generatePlan(classId, studentId, currentLevel, targetLevel, goal, durationWeeks) {
  const lessons = await getLessonsForClass(classId);
  const W = durationWeeks || 8;
  const current_level = currentLevel || "beginner";
  const target_level = targetLevel || "intermediate";
  
  let plan = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== "" && apiKey !== "your_gemini_api_key_here") {
    try {
      console.log("[LearningPathService] Gemini API key found. Attempting AI generation...");
      const prompt = `
You are an expert educational AI assistant.
Your task is to generate a personalized learning path for a student based on:
- Student Current Level: ${current_level}
- Student Target Level: ${target_level}
- Student Goal: ${goal}
- Duration: ${W} weeks
- Available Course Lessons: ${JSON.stringify(lessons)}

Please distribute the lessons over the ${W} weeks. Add weekly study recommendations, goals, and customized descriptions suited to a ${current_level} student aiming for ${target_level}.
For each step in the learning path, you must provide:
- step_order (integer, starting from 1)
- title (string, title of the step/lesson)
- description (string, customized advice or description for this week's study)
- estimated_week (integer, between 1 and ${W})
- lesson_id (string, UUID from the available course lessons that matches this step, or null if it's an extra recommendation)

Return the output strictly in the following JSON format:
{
  "steps": [
    {
      "step_order": 1,
      "title": "...",
      "description": "...",
      "estimated_week": 1,
      "lesson_id": "UUID_OR_NULL"
    }
  ]
}
Do not return any markdown code blocks (like \`\`\`json) outside the JSON text, return ONLY the raw JSON string.
`;
      plan = await callGeminiAPI(apiKey.trim(), prompt);
    } catch (err) {
      console.error("[LearningPathService] Gemini generation failed. Falling back to rule-based:", err.message);
      plan = null;
    }
  }

  // Rule-based Fallback generator
  if (!plan) {
    console.log("[LearningPathService] Generating rule-based fallback plan...");
    const steps = [];

    if (lessons.length > 0) {
      const N = lessons.length;
      const lessonsPerWeek = Math.max(1, Math.ceil(N / W));

      for (let i = 0; i < N; i++) {
        const lesson = lessons[i];
        const estimated_week = Math.min(W, Math.floor(i / lessonsPerWeek) + 1);
        steps.push({
          step_order: i + 1,
          title: lesson.title,
          description: lesson.description || `Study materials and details for ${lesson.title}. Custom recommendations for level ${current_level} to reach ${target_level}.`,
          estimated_week: estimated_week,
          lesson_id: lesson.id
        });
      }
    } else {
      // Create empty class fallback lessons
      for (let w = 1; w <= W; w++) {
        steps.push({
          step_order: w,
          title: `Week ${w}: Core Concepts & Materials`,
          description: `Explore class materials, assignments, and external references to progress your skills from ${current_level} towards ${target_level}.`,
          estimated_week: w,
          lesson_id: null
        });
      }
    }

    plan = { steps };
  }

  return plan;
}

module.exports = {
  generatePlan,
  getLessonsForClass
};
