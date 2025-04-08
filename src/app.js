const express = require("express");
const cors = require("cors");
const path = require("path");
// We'll use axios if we need to call out to an external API like OpenAI
const axios = require("axios");
// Load environment variables from .env file
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "../public")));

// API endpoint for improving messages
app.post("/api/improve", async (req, res) => {
  const { text, messageType, textLength, tone } = req.body;

  // If text is missing, return an error
  if (!text) {
    return res.status(400).json({ error: "No text provided." });
  }

  try {
    // Generate the prompt for OpenAI
    const prompt = generatePrompt(text, messageType, textLength, tone);

    // Get emoji for the selected tone
    const toneEmoji = getToneEmoji(tone);

    // Call the OpenAI API
    const apiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert writer specializing in improving ${messageType} messages to sound more ${tone}. Use appropriate emojis in your response to match the tone.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 400,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Extract the improved message from the OpenAI response
    let improved = apiResponse.data.choices[0].message.content.trim();

    // If response doesn't already have emojis, add the tone emoji
    if (!containsEmoji(improved) && toneEmoji) {
      improved = addEmojiToText(improved, toneEmoji, tone);
    }

    // Send the improved message back to the client
    res.json({ improved });
  } catch (error) {
    console.error(
      "Error improving message:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Error improving message." });
  }
});

// Helper function to generate prompts for the LLM
function generatePrompt(originalText, messageType, textLength, tone) {
  // Define desired output length based on textLength parameter
  let lengthGuidance;
  if (textLength === "short") {
    lengthGuidance = "Keep the response concise and brief (1-2 sentences).";
  } else if (textLength === "medium") {
    lengthGuidance = "Provide a moderate length response (2-4 sentences).";
  } else if (textLength === "long") {
    lengthGuidance = "Create a detailed response (4+ sentences).";
  } else {
    lengthGuidance = "Provide an appropriate length response.";
  }

  return `
    Polish the following ${messageType} message to make it sound more ${tone}.
    ${lengthGuidance}
    Include appropriate emojis that match the ${tone} tone.
    
    Original message: "${originalText}"
    
    Provide ONLY the improved message text without any additional explanation or formatting.
  `;
}

// Function to get an appropriate emoji for each tone
function getToneEmoji(tone) {
  const emojiMap = {
    formal: "🧐",
    friendly: "😊",
    brutal: "😡",
    persuasive: "🎯",
    confident: "🦁",
    cautionary: "⚠️",
    inspirational: "💡",
    thoughtful: "🤔",
    joyful: "😃",
    exciting: "🤩",
    grieved: "😔",
    loving: "😍",
    surprised: "😲",
    informative: "🤓",
    expert: "🔬",
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

// Catch-all route to serve the main HTML page for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
