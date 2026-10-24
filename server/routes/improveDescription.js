
const express = require("express");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : "";

    if (!description) {
      return res.status(400).json({
        message: "Please provide a job description.",
      });
    }

    if (description.length > 30000) {
      return res.status(400).json({
        message: "Description must be under 30,000 characters.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        message: "GEMINI_API_KEY is missing from server/.env.",
      });
    }

const prompt = `
Reformat the job description into clean, readable plain text.

STRICT FORMATTING RULES:
1. Headings must be plain text without **, ##, or other symbols.
   Example: Responsibilities
2. Put each heading on its own line.
3. Use the bullet character • for every bullet point.
4. Put each bullet point on a separate line.
5. Add one blank line before each new heading.
6. Do not use Markdown formatting, numbered lists, or code blocks.
7. Preserve all original information and meaning.
8. Do not invent or remove requirements, technologies, or details.
9. Return only the formatted job description.

Example format:

Responsibilities

• Assist in the design and development of software applications
• Write clean, efficient, and maintainable code
• Participate in code reviews

Requirements

• Knowledge of JavaScript
• Understanding of REST APIs

JOB DESCRIPTION:
${description}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", result);
      return res.status(502).json({
        message:
          result.error?.message ||
          "AI could not format the description.",
      });
    }

    const improvedDescription =
      result.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();

    if (!improvedDescription) {
      return res.status(502).json({
        message: "AI returned no description. Try again.",
      });
    }

    return res.json({
      description: improvedDescription,
    });
  } catch (error) {
    console.error("Description formatting failed:", error);

    return res.status(500).json({
      message: "Could not format the description.",
    });
  }
});

module.exports = router;
