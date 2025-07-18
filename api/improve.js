// Import required modules
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Define lists of tones that should not include emojis
const noEmojiTones = [
  // Professional & Authoritative
  "formal",
  "confident",
  "persuasive",
  "expert",
  "informative",
  // Reflective & Reactive
  "thoughtful",
  "cautionary",
  "grieved",
  "brutal",
  // "surprised" - Removed to enable emojis for Surprised tone
];

// Create the improveHandler function that will be used by both serverless and Express
async function improveHandler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle OPTIONS request (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, messageType, tone } = req.body;

  // If text is missing, return an error
  if (!text) {
    return res.status(400).json({ error: "No text provided." });
  }

  // Check if this tone should include emojis
  const shouldIncludeEmojis = !noEmojiTones.includes(tone);

  // Log request for debugging
  /* // Removed for cleaner logs
  console.log("Request received:", {
    messageType,
    tone,
    includeEmojis: shouldIncludeEmojis,
  });
  */

  try {
    // Generate the prompt for OpenAI
    const prompt = generatePrompt(text, messageType, tone);
    // console.log("Generated prompt:", prompt); // Removed for cleaner logs

    // Get emoji for the selected tone (only if we should include emojis)
    const toneEmoji = shouldIncludeEmojis ? getToneEmoji(tone) : "";

    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error("ERROR: OpenAI API key is missing");
      return res.status(500).json({
        error:
          "OpenAI API key not configured. Please check server configuration.",
      });
    }

    // Call the OpenAI API
    const requestData = {
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are an expert writer specializing in improving ${messageType} messages to sound more ${tone}. ${
            shouldIncludeEmojis
              ? `Use appropriate emojis that match the ${tone} tone.`
              : "Do not include any emojis in your response."
          }`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    };

    // console.log( // Removed for cleaner logs
    //   "Using API Key:",
    //   process.env.OPENAI_API_KEY
    //     ? "Found (starts with " +
    //         process.env.OPENAI_API_KEY.substring(0, 3) +
    //         ")"
    //     : "Not found"
    // );

    const apiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestData,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000, // 60 second timeout
      }
    );

    // Log the raw content immediately after receiving
    const rawApiResponseContent = apiResponse.data.choices[0].message.content;
    // console.log(
    //   ">>> BACKEND LOG (RAW): OpenAI API Response Content:\n",
    //   JSON.stringify(rawApiResponseContent)
    // ); // REMOVED

    let improved = rawApiResponseContent.trim();
    // console.log(
    //   ">>> BACKEND LOG: Content after initial trim:",
    //   JSON.stringify(improved)
    // );

    // If we're expecting JSON for an email, parse it
    if (messageType === "email") {
      try {
        // console.log("Received response for email, parsing JSON:", improved); // Removed for cleaner logs
        // Try to parse as JSON
        const parsed = JSON.parse(improved);

        // Validate shape
        if (parsed.subject && parsed.body) {
          /* // Removed for cleaner logs
          console.log(
            "Successfully parsed email response with subject and body"
          );
          console.log("Subject:", parsed.subject);
          console.log("Body preview:", parsed.body.substring(0, 50) + "...");
          */
          // Replace `improved` with your structured object
          improved = parsed;
        } else {
          console.error("JSON missing 'subject' or 'body'");
          throw new Error("JSON missing 'subject' or 'body'");
        }
      } catch (err) {
        console.error("Could not parse JSON for email:", err);
        console.log("Raw response:", improved);
        // Return error or fallback
        return res.status(500).json({
          error: "The AI response was not valid JSON for an email.",
          details: err.message,
        });
      }
    } else {
      // Strip surrounding quotation marks if present - apply multiple times to handle nested quotes
      /* // Removed debug logs
      console.log(
        ">>> BACKEND LOG: Before quote stripping:",
        JSON.stringify(improved)
      );
      */
      // First attempt with multiline support
      improved = improved.replace(/^["'](.*)["']$/s, "$1").trim();
      // Second attempt to catch any remaining quotes
      improved = improved.replace(/^["'](.*)["']$/s, "$1").trim();
      // Handle any remaining double or single quotes that completely wrap the text
      if (
        (improved.startsWith('"') && improved.endsWith('"')) ||
        (improved.startsWith("'") && improved.endsWith("'"))
      ) {
        improved = improved.substring(1, improved.length - 1).trim();
      }
      /* // Removed debug logs
      console.log(
        ">>> BACKEND LOG: After quote stripping and final trim:",
        JSON.stringify(improved)
      );
      */

      // Check if the improved message is empty or the same as original
      if (!improved || improved === text) {
        console.log("Warning: OpenAI returned empty or unchanged text");
        return res.status(500).json({
          error:
            "AI couldn't improve the text. Please try again with different content.",
        });
      }

      // If we should include emojis and response doesn't already have them, add the tone emoji
      if (shouldIncludeEmojis && !containsEmoji(improved) && toneEmoji) {
        improved = addEmojiToText(improved, toneEmoji, tone);
      } else if (!shouldIncludeEmojis) {
        // Remove any emojis if this tone shouldn't have them
        improved = removeEmojis(improved);
      }
      /* // Removed debug logs
      console.log(
        ">>> BACKEND LOG: After potential emoji processing:",
        JSON.stringify(improved)
      );
      */

      // --- START: Explicitly remove specific unwanted symbols ---
      if (typeof improved === "string") {
        // Only apply to string responses
        improved = improved.replace(/♂️|♂/g, "").trim(); // Remove the specific symbols and re-trim
      }
      // --- END: Explicitly remove specific unwanted symbols ---

      // --- START: Merge lone emoji lines into previous paragraph ---
      if (typeof improved === "string") {
        // Regex breakdown:
        // (\S)          : Capture the last non-whitespace character of the preceding line.
        // \s*\n\n\s*   : Match optional whitespace, double newline, optional whitespace.
        // (             : Start capturing group for emojis.
        //   [\p{Emoji_Presentation}|\p{Extended_Pictographic}]+
        //               : Match one or more emoji characters.
        // )             : End capturing group for emojis.
        // \s*\n\n      : Match optional whitespace and the *following* double newline.
        // The 'gu' flags ensure global search and full unicode emoji support.
        const loneEmojiLineRegex =
          /(\S)\s*\n\n\s*([\p{Emoji_Presentation}|\p{Extended_Pictographic}]+)\s*\n\n/gu;
        improved = improved.replace(loneEmojiLineRegex, "$1 $2\n\n"); // Replace with: last char + space + emoji + double newline

        // Optional: Add a check for emojis at the VERY beginning of the string preceded by newlines?
        // improved = improved.replace(/^\s*\n\n\s*([\p{Emoji_Presentation}|\p{Extended_Pictographic}]+)\s*\n\n/gu, '$1\n\n');
      }
      // --- END: Merge lone emoji lines into previous paragraph ---
    }

    // Log the final content before sending to client
    // console.log(
    //   ">>> BACKEND LOG (FINAL): Content sent to client:\n",
    //   JSON.stringify(improved)
    // ); // REMOVED
    return res.status(200).json({ improved });
  } catch (error) {
    console.error("Error improving message:", error);

    // Return honest error message instead of fallback response
    return res.status(500).json({
      error:
        "OpenAI API call failed. Please try again later or check your connection.",
      details: error.message,
    });
  }
}

// Set up Express server if this file is run directly
if (require.main === module) {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Add simple request logging middleware
  app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    next();
  });

  // Serve static files from the 'public' directory
  const staticPath = path.join(__dirname, "../public");
  console.log(`Serving static files from: ${staticPath}`); // Log the static path
  app.use(express.static(staticPath));

  // API endpoint
  app.post("/api/improve", improveHandler);

  // Explicit routes for core static files (before catch-all)
  app.get("/", (req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
  app.get("/style.css", (req, res) => {
    res.sendFile(path.join(staticPath, "style.css"));
  });
  app.get("/script.js", (req, res) => {
    res.sendFile(path.join(staticPath, "script.js"));
  });

  /* // Commenting out catch-all again as it seems to interfere
  // Catch-all route MUST BE LAST to serve the main HTML page for client-side routing
  // Handles any other GET request not matched above or by express.static
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  });
  */

  // Start the server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(
      `OpenAI API Key: ${process.env.OPENAI_API_KEY ? "Found" : "Missing"}`
    );
  });
} else {
  // Export for serverless use
  module.exports = improveHandler;
}

// Helper function to generate prompts for the LLM
function generatePrompt(originalText, messageType, tone) {
  // Determine if this tone should include emojis
  const shouldIncludeEmojis = !noEmojiTones.includes(tone);

  // --- START: Define Standardized Instructions ---
  const universalEmojiInstructions = `
    **Emoji Usage Guidelines (Apply ONLY if emojis are used):**
    - Use emojis sparingly (e.g., 0-3 relevant emojis per message or per major point).
    - Integrate emojis naturally within sentences as a light enhancement.
    - Choose common, easily understood, and contextually relevant emojis.
    - **Do NOT** place emojis on their own lines or add extra blank lines around them.
    - **Strictly AVOID** obscure symbols or random characters used as emojis (e.g., \`♂️\` )
  `;

  const humorSpecificInstructions = `
    **Humor Tone Guidance (Apply ONLY for Humor Tone):**
    - Humor should primarily come from clever wordplay, relatable observations, or lighthearted exaggeration relevant to the original text.
    - The humor should feel natural, not forced.
  `;
  // --- END: Define Standardized Instructions ---

  // --- START: Prioritize Email JSON Format ---
  // If message type is email, always return JSON with separate subject and body
  if (messageType === "email") {
    let emailExtraInstructions = "";
    if (shouldIncludeEmojis) {
      emailExtraInstructions += universalEmojiInstructions;
    }
    if (tone === "humor") {
      emailExtraInstructions += humorSpecificInstructions;
    }

    return `
      You are rewriting the following text as a polished email.
      Please output valid JSON with exactly two keys: "subject" and "body".
      1) "subject": a concise, compelling subject line for the email
      2) "body": the main email text itself

      Do not include any other text, and do not wrap it in backticks or code fences.
      The original text to improve is: "${originalText}"

      Requirements:
      - Apply the "${tone}" tone to the subject and body content.
      ${emailExtraInstructions}
      - "subject" must be short (one line, no extra punctuation)
      - "body" MUST follow this EXACT structure:
          [Formal Greeting on its own line],

          [Main content paragraphs with improved text]

          [Professional closing],
          [Name placeholder or signature]
      - The greeting MUST be the first element of the body on its own line (e.g., "Dear Team," or "Hello,")
      - The closing MUST be separated from content by a blank line and MUST include both a closing phrase AND signature
      - Responses without proper greeting and closing will be rejected
      - Fix grammar and spelling.
    `;
  }
  // --- END: Prioritize Email JSON Format ---

  // Handle tone instructions for non-email types
  let toneInstruction;
  if (tone === "auto" || tone === "automatic") {
    toneInstruction =
      "Automatically select the most appropriate tone based on the content of the original message. This is for automatic tone detection only.";
  } else {
    toneInstruction = `Rewrite the following ${messageType} message to make it sound more ${tone}.`;
  }

  // --- START: Specific Prompt for Humor Tone (Non-Email) ---
  if (tone === "humor") {
    // This block is now only reached if messageType is NOT email
    // Humor tone implies emojis are allowed, so include both sets of instructions.
    return `
${toneInstruction}

${humorSpecificInstructions}

${universalEmojiInstructions}

**Original Message:**
"${originalText}"

Provide ONLY the improved message text without any additional explanation or formatting. Fix any spelling or grammar errors in the original text. Structure the response into logical paragraphs separated by double newlines (\n\n) where appropriate for clarity and readability.
    `;
  }
  // --- END: Specific Prompt for Humor Tone (Non-Email) ---

  // Standard prompt for other non-email messages (including social posts)
  let socialContext = "";
  if (messageType === "social") {
    socialContext = `
      Consider the context: this could be a new post or a reply on platforms like Facebook, Instagram, LinkedIn, or group chats (e.g., WhatsApp).
      Adapt the formality and style based on the likely platform and interaction (e.g., friendly/fun for Facebook, professional for LinkedIn, informative/engaging for group chats).
      Keep social media best practices in mind, such as encouraging engagement and maintaining appropriate length for the platform.
    `;
  }

  // Include universal emoji instructions only if applicable for the tone
  const emojiInstructionsForStandard = shouldIncludeEmojis
    ? universalEmojiInstructions
    : "DO NOT include any emojis in your response."; // Explicitly disallow if needed

  return `
    ${toneInstruction}
    ${socialContext}

    ${emojiInstructionsForStandard}

    Original message: "${originalText}"

    Provide ONLY the improved message text without any additional explanation or formatting.
    IMPORTANT: Make significant changes to the original text to ensure it clearly reflects the ${
      tone === "auto" || tone === "automatic" ? "automatically selected" : tone
    } tone.
    Fix any spelling or grammar errors in the original text.
    Structure the response into logical paragraphs separated by double newlines (\n\n) where appropriate for clarity and readability, especially if the response is long.
  `;
}

// Function to get emoji for a tone
function getToneEmoji(tone) {
  const emojiMap = {
    exciting: "🤩",
    friendly: "😄",
    humor: "😆",
    congrats: "👏🏻",
    loving: "💖",
    thankful: "🙏🏻",
    formal: "",
    informative: "",
    motivational: "",
    urgent: "",
    blunt: "⚡",
    surprised: "😲",
  };

  return emojiMap[tone] || "";
}

// Function to check if text contains emoji
function containsEmoji(text) {
  // Simple regex to detect common emoji patterns
  const emojiRegex =
    /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(text);
}

// Function to strategically add emoji to text
function addEmojiToText(text, emoji, tone) {
  // For certain tones, add emoji at the beginning
  const beginningTones = [
    "formal",
    "brutal",
    "cautionary",
    "thoughtful",
    "grieved",
    "informative",
    "expert",
  ];

  if (beginningTones.includes(tone)) {
    return `${emoji} ${text}`;
  }

  // For most other tones, add emoji to the end
  return `${text} ${emoji}`;
}

// Function to remove emojis from text
function removeEmojis(text) {
  return (
    text
      .replace(
        /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        ""
      )
      // Only replace multiple spaces with a single space, preserve newlines
      .replace(/ +/g, " ")
      .trim()
  );
}
