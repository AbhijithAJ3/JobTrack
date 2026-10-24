
const express = require("express");
const multer = require("multer");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10,
    fileSize: 8 * 1024 * 1024, // 8 MB per screenshot
  },
  fileFilter: (req, file, callback) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)) {
      return callback(new Error("Upload PNG, JPG, or WebP screenshots only."));
    }
    callback(null, true);
  },
});

router.post("/", (req, res) => {
  upload.array("screenshots", 10)(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ message: uploadError.message });
    }

    try {
      if (!req.files?.length) {
        return res.status(400).json({
          message: "Select at least one screenshot.",
        });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          message: "GEMINI_API_KEY is missing from server/.env.",
        });
      }


const prompt = `
Analyze all uploaded screenshots together. They show the same job posting.

Extract the following information:
1. company: Company name
2. role: Job title
3. jobUrl: Job posting URL, only if visibly available
4. description: Complete job description, responsibilities, requirements,
   qualifications, and other relevant job details.

IMPORTANT RULES:
- Preserve the original meaning and important details.
- Do not invent or guess missing information.
- Combine information across screenshots and remove repeated text.
- Format the description as bullet points.
- Put each responsibility, requirement, qualification, or benefit
  in a separate bullet point.
- Keep section headings when useful, such as "Responsibilities",
  "Requirements", and "Benefits".
- Do not return the entire description as one paragraph.
- Return valid JSON only, using exactly these string fields:
  company, role, jobUrl, description.
- If a field is not visible, return an empty string.

Example description format:
"Responsibilities:
• Develop and maintain applications.
• Collaborate with cross-functional teams.

Requirements:
• Bachelor's degree in a relevant field.
• Strong communication and problem-solving skills."
`;


      const parts = [
        { text: prompt },
        ...req.files.map((file) => ({
          inline_data: {
            mime_type: file.mimetype,
            data: file.buffer.toString("base64"),
          },
        })),
      ];

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error("Gemini API error:", result);
        return res.status(502).json({
          message:
            result.error?.message ||
            "AI extraction failed. Check your Gemini API key and model access.",
        });
      }

      const text = result.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("");

      if (!text) {
        return res.status(502).json({
          message: "AI returned no extractable text. Try clearer screenshots.",
        });
      }

      let extracted;
      try {
        extracted = JSON.parse(text);
      } catch {
        return res.status(502).json({
          message: "AI returned an invalid response. Please try again.",
        });
      }

      res.json({
        company: typeof extracted.company === "string" ? extracted.company : "",
        role: typeof extracted.role === "string" ? extracted.role : "",
        jobUrl: typeof extracted.jobUrl === "string" ? extracted.jobUrl : "",
        description:
          typeof extracted.description === "string" ? extracted.description : "",
      });
    } catch (error) {
      console.error("Screenshot extraction failed:", error);
      res.status(500).json({
        message: "Could not process screenshots. Please try again.",
      });
    }
  });
});

module.exports = router;
