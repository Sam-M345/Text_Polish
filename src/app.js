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

  // Log request for debugging
  console.log("Request received:", {
    messageType,
    textLength,
    tone,
    textLength: text.length,
  });
  console.log(
    "Using API Key:",
    process.env.OPENAI_API_KEY
      ? `${process.env.OPENAI_API_KEY.substring(0, 5)}...`
      : "Not found"
  );

  try {
    // Generate the prompt for OpenAI
    const prompt = generatePrompt(text, messageType, textLength, tone);
    console.log("Generated prompt:", prompt);

    // Get emoji for the selected tone
    const toneEmoji = getToneEmoji(tone);

    // Call the OpenAI API
    const requestData = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert writer specializing in improving ${messageType} messages to sound more ${tone}. Use appropriate emojis that match the ${tone} tone.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    };

    console.log(
      "Sending request to OpenAI:",
      JSON.stringify(requestData, null, 2)
    );

    const apiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestData,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
      }
    );

    console.log("OpenAI response status:", apiResponse.status);
    console.log(
      "OpenAI response data:",
      JSON.stringify(apiResponse.data, null, 2)
    );

    // Extract the improved message from the OpenAI response
    let improved = apiResponse.data.choices[0].message.content.trim();

    // Check if the improved message is empty or the same as original
    if (!improved || improved === text) {
      console.log("Warning: OpenAI returned empty or unchanged text");
      // Force a different response
      improved = generateFallbackResponse(text, tone);
    }

    // If response doesn't already have emojis, add the tone emoji
    if (!containsEmoji(improved) && toneEmoji) {
      improved = addEmojiToText(improved, toneEmoji, tone);
    }

    // Send the improved message back to the client
    res.json({ improved });
  } catch (error) {
    console.error("Error improving message:");

    if (error.response) {
      // OpenAI API error
      console.error(
        "API error response:",
        JSON.stringify(error.response.data, null, 2)
      );
      console.error("Status code:", error.response.status);
    } else if (error.request) {
      // No response received
      console.error("No response received:", error.request);
    } else {
      // Other error
      console.error("Error:", error.message);
    }

    // Generate a fallback response instead of failing
    const fallbackResponse = generateFallbackResponse(text, tone);
    console.log("Using fallback response:", fallbackResponse);

    // Return fallback response instead of error
    res.json({ improved: fallbackResponse });
  }
});

// Generate a fallback response in case of API failure
function generateFallbackResponse(originalText, tone) {
  const emoji = getToneEmoji(tone);

  // Generate a basic modification based on tone
  let improved;
  switch (tone) {
    case "formal":
      improved = `I would like to inform you that ${originalText.toLowerCase()}.`;
      break;
    case "friendly":
      improved = `Hey there! ${originalText} Hope you're having a great day!`;
      break;
    case "brutal":
      improved = `Listen up! ${originalText} Deal with it.`;
      break;
    case "persuasive":
      improved = `You really should consider that ${originalText}. It's definitely worth it!`;
      break;
    case "confident":
      improved = `I'm absolutely certain that ${originalText}. No doubt about it.`;
      break;
    case "cautionary":
      improved = `Please be aware that ${originalText}. Proceed with caution.`;
      break;
    case "inspirational":
      improved = `Remember, ${originalText}! You can achieve anything you set your mind to!`;
      break;
    case "thoughtful":
      improved = `I've been reflecting, and I believe that ${originalText}. What do you think?`;
      break;
    case "joyful":
      improved = `Yay! ${originalText}! This makes me so happy!`;
      break;
    case "exciting":
      improved = `OMG! ${originalText}! This is absolutely incredible!`;
      break;
    case "grieved":
      improved = `I'm deeply saddened that ${originalText}. This is truly unfortunate.`;
      break;
    case "loving":
      improved = `My dear, ${originalText}. You mean the world to me.`;
      break;
    case "surprised":
      improved = `What?! ${originalText}?! I can't believe it!`;
      break;
    case "informative":
      improved = `I'd like to inform you that ${originalText}. Here are the details.`;
      break;
    case "expert":
      improved = `Based on my analysis, ${originalText}. This conclusion is supported by significant evidence.`;
      break;
    default:
      improved = originalText;
  }

  // Add emoji
  if (emoji) {
    improved = addEmojiToText(improved, emoji, tone);
  }

  return improved;
}

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
    Rewrite the following ${messageType} message to make it sound more ${tone}.
    ${lengthGuidance}
    Include appropriate emojis that match the ${tone} tone.
    
    Original message: "${originalText}"
    
    Provide ONLY the improved message text without any additional explanation or formatting.
    IMPORTANT: Make significant changes to the original text to ensure it clearly reflects the ${tone} tone.
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
  console.log(
    `OpenAI API Key: ${process.env.OPENAI_API_KEY ? "Found" : "Missing"}`
  );
});
