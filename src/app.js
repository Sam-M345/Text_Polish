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

// Define lists of tones that should not include emojis
const noEmojiTones = [
  // Professional (Work) - All professional tones should have NO emojis
  "formal",
  "confident",
  "informative",
  "neutral",
  "urgent",
  // Reflective & Responsive - Thoughtful and Blunt should have NO emojis
  "thoughtful",
  "blunt",
  // Note: "surprised" and "supportive" tones can include emojis
  // Positive & Engaging - All can include emojis, but they will be limited by limitEmojiDensity function
];

// Function to remove car/automobile emojis from text
function removeCarEmojis(text) {
  // Regex for common vehicle emojis
  return text
    .replace(/[🚗🚙🚘🚖🚕🏎️🛻🚚🚛🚐🚜🛵🏍️🛺🚲🛴🚍🚔🚓🚑🚒]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// API endpoint for improving messages
app.post("/api/improve", async (req, res) => {
  const { text, messageType, textLength, tone } = req.body;

  // If text is missing, return an error
  if (!text) {
    return res.status(400).json({ error: "No text provided." });
  }

  // Check if this tone should include emojis
  const shouldIncludeEmojis = !noEmojiTones.includes(tone);

  // Log request for debugging
  console.log("Request received:", {
    messageType,
    textLength,
    tone,
    textLength: text.length,
    includeEmojis: shouldIncludeEmojis,
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

    // Get emoji for the selected tone (only if we should include emojis)
    const toneEmoji = shouldIncludeEmojis ? getToneEmoji(tone) : "";

    // Call the OpenAI API
    const requestData = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert writer specializing in improving ${messageType} messages. ${
            tone === "auto" || tone === "automatic"
              ? "When instructed to use automatic tone selection, you should determine the most appropriate tone based on the content of the original message. This refers to automatic tone detection only."
              : `Make the message sound more ${tone}.`
          } ${
            shouldIncludeEmojis
              ? `Use appropriate emojis that match the ${
                  tone === "auto" || tone === "automatic"
                    ? "automatically selected"
                    : tone
                } tone.`
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
        timeout: 60000, // 60 second timeout (increased from 10 seconds)
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
      improved = generateFallbackResponse(text, tone, textLength);
    }

    // If we should include emojis and response doesn't already have them, add the tone emoji
    if (shouldIncludeEmojis && !containsEmoji(improved) && toneEmoji) {
      improved = addEmojiToText(improved, toneEmoji, tone);
    } else if (!shouldIncludeEmojis) {
      // Remove any emojis if this tone shouldn't have them
      improved = removeEmojis(improved);
    }

    // Apply additional safety filter to remove any car emojis that might have slipped through
    improved = removeCarEmojis(improved);

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
    const fallbackResponse = generateFallbackResponse(text, tone, textLength);
    console.log("Using fallback response:", fallbackResponse);

    // Apply car emoji filter to fallback response as well
    const filteredResponse = removeCarEmojis(fallbackResponse);

    // Return fallback response instead of error
    res.json({ improved: filteredResponse });
  }
});

// Generate a fallback response in case of API failure
function generateFallbackResponse(originalText, tone, textLength) {
  // If tone is "auto" or "automatic", pick a reasonable default tone based on content
  if (tone === "auto" || tone === "automatic") {
    // Choose a neutral tone as default when in automatic mode
    tone = "neutral";
  }

  // Check if this tone should include emojis
  const shouldIncludeEmojis = !noEmojiTones.includes(tone);

  // Get emoji for the tone only if we should include emojis
  const emoji = shouldIncludeEmojis ? getToneEmoji(tone) : "";

  // Determine base multiplier for text length
  let lengthMultiplier = 1;
  // If textLength is "auto" or "automatic", use a reasonable default based on original text length
  if (textLength === "auto" || textLength === "automatic") {
    // Choose appropriate length based on input length for automatic mode
    if (originalText.length < 100) {
      textLength = "short";
    } else if (originalText.length < 300) {
      textLength = "medium";
      lengthMultiplier = 3;
    } else {
      textLength = "long";
      lengthMultiplier = 8;
    }
  } else if (textLength === "medium") {
    lengthMultiplier = 3; // Increased from 2
  } else if (textLength === "long") {
    lengthMultiplier = 8; // Increased from 4 to generate much longer content
  }

  // Generate a basic modification based on tone
  let improved;
  switch (tone) {
    // Professional (Work)
    case "formal":
      improved = `I would like to inform you that ${originalText.toLowerCase()}.`;
      break;
    case "confident":
      improved = `I'm absolutely certain that ${originalText}. No doubt about it.`;
      break;
    case "informative":
      improved = `I'd like to inform you that ${originalText}. Here are the details.`;
      break;
    case "neutral":
      improved = `${originalText}. This is a factual statement without emotional influence.`;
      break;
    case "urgent":
      improved = `URGENT: ${originalText}. Please attend to this matter immediately.`;
      break;

    // Positive & Engaging
    case "friendly":
      improved = `Hey there! ${originalText} Hope you're having a great day!`;
      break;
    case "exciting":
      improved = `OMG! ${originalText}! This is absolutely incredible!`;
      break;
    case "humorous":
      improved = `Haha! ${originalText} 😂 That's hilarious, right?`;
      break;
    case "inspirational":
      improved = `Remember, ${originalText}! You can achieve anything you set your mind to!`;
      break;
    case "loving":
      improved = `My dear, ${originalText}. You mean the world to me.`;
      break;

    // Reflective & Responsive
    case "blunt":
      improved = `${originalText}. That's it. No sugar coating.`;
      break;
    case "supportive":
      improved = `I understand that ${originalText}. I'm here for you and want to help.`;
      break;
    case "surprised":
      improved = `What?! ${originalText}?! I can't believe it! This is so unexpected!`;
      break;
    case "thoughtful":
      improved = `I've been reflecting, and I believe that ${originalText}. What do you think?`;
      break;

    default:
      improved = originalText;
  }

  // Add emoji only if this tone should have them
  if (emoji && shouldIncludeEmojis) {
    improved = addEmojiToText(improved, emoji, tone);
  }

  // Generate additional content based on length setting
  if (lengthMultiplier > 1) {
    const extraSentences = [];
    for (let i = 0; i < lengthMultiplier; i++) {
      if (tone === "formal") {
        extraSentences.push(
          `Furthermore, this matter requires your attention. Please consider the implications carefully.`
        );
      } else if (tone === "friendly") {
        extraSentences.push(
          `I was just thinking about this the other day! It's so nice to connect about these things.`
        );
      } else if (tone === "brutal") {
        extraSentences.push(
          `And don't even think about ignoring this. I need you to take this seriously right now.`
        );
      } else if (tone === "persuasive") {
        extraSentences.push(
          `When you think about the benefits, I'm sure you'll agree this is the right choice.`
        );
      } else if (tone === "confident") {
        extraSentences.push(
          `I've considered all the angles and this is definitely the optimal approach.`
        );
      } else if (tone === "cautionary") {
        extraSentences.push(
          `Make sure you consider all potential risks before proceeding.`
        );
      } else if (tone === "inspirational") {
        extraSentences.push(
          `Every challenge is just an opportunity in disguise. You've got this!`
        );
      } else if (tone === "thoughtful") {
        extraSentences.push(
          `I wonder how this relates to our previous conversations on this topic.`
        );
      } else if (tone === "joyful") {
        extraSentences.push(
          `This brings so much joy to my day! Let's celebrate this moment!`
        );
      } else if (tone === "exciting") {
        extraSentences.push(
          `This is going to change everything! I can hardly contain my excitement!`
        );
      } else if (tone === "grieved") {
        extraSentences.push(
          `It's difficult to express the depth of my disappointment regarding this situation.`
        );
      } else if (tone === "loving") {
        extraSentences.push(
          `You're always in my thoughts. I cherish our connection deeply.`
        );
      } else if (tone === "surprised") {
        extraSentences.push(
          `I never would have expected this in a million years! This is truly astonishing!`
        );
      } else if (tone === "informative") {
        extraSentences.push(
          `Additional research indicates this trend will continue into the foreseeable future.`
        );
      } else if (tone === "expert") {
        extraSentences.push(
          `According to recent studies, the data supports this conclusion with a high degree of confidence.`
        );
      } else {
        extraSentences.push(
          `Let me elaborate further on this important topic.`
        );
      }
    }
    improved += " " + extraSentences.join(" ");
  }

  return improved;
}

// Helper function to generate prompts for the LLM
function generatePrompt(originalText, messageType, textLength, tone) {
  // Define desired output length based on textLength parameter without strict limits
  let lengthGuidance;

  if (textLength === "short") {
    lengthGuidance = "Keep the response relatively brief.";
  } else if (textLength === "medium") {
    lengthGuidance = "Provide a moderate length response.";
  } else if (textLength === "long") {
    lengthGuidance =
      "Create an extensive, comprehensive, and detailed response. Include multiple paragraphs with thorough explanation and elaboration. Do not be concerned about length - longer is better for this option.";
  } else if (textLength === "auto" || textLength === "automatic") {
    lengthGuidance =
      "Automatically determine the appropriate length based on the original message content. This is for automatic length determination only.";
  } else {
    lengthGuidance = "Provide an appropriate length response.";
  }

  // Determine if this tone should include emojis
  const shouldIncludeEmojis = !noEmojiTones.includes(tone);

  // Handle tone instructions
  let toneInstruction;
  if (tone === "auto" || tone === "automatic") {
    toneInstruction =
      "Automatically select the most appropriate tone based on the content of the original message. This is for automatic tone detection only.";
  } else {
    toneInstruction = `Rewrite the following ${messageType} message to make it sound more ${tone}.`;
  }

  return `
    ${toneInstruction}
    ${lengthGuidance}
    ${
      shouldIncludeEmojis
        ? `Include appropriate emojis that match the ${
            tone === "auto" || tone === "automatic"
              ? "automatically selected"
              : tone
          } tone.`
        : `DO NOT include any emojis in your response.`
    }
    
    Original message: "${originalText}"
    
    Provide ONLY the improved message text without any additional explanation or formatting.
    IMPORTANT: Make significant changes to the original text to ensure it clearly reflects the ${
      tone === "auto" || tone === "automatic" ? "automatically selected" : tone
    } tone.
  `;
}

// Function to get an appropriate emoji for each tone
function getToneEmoji(tone) {
  // If tone is "auto" or "automatic", don't assign a specific emoji
  if (tone === "auto" || tone === "automatic") {
    return ""; // Return empty string for automatic tone selection - we'll let the system choose based on content
  }

  const emojiMap = {
    // Professional (Work)
    formal: "🧐",
    confident: "🦁",
    informative: "🤓",
    neutral: "🧊",
    urgent: "⏰",

    // Positive & Engaging
    friendly: "😊",
    exciting: "🤩",
    humorous: "😄",
    inspirational: "🙏🏻",
    loving: "♥️",

    // Reflective & Responsive
    blunt: "⚡",
    supportive: "🤝",
    surprised: "😲",
    thoughtful: "🤔",
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
  // Don't add emojis for automatic tone selection
  if (tone === "auto" || tone === "automatic") {
    return text;
  }

  // First check if this tone should have emojis at all
  if (noEmojiTones.includes(tone)) {
    return text; // Return text without emojis for professional tones
  }

  // For certain tones, add emoji at the beginning
  const beginningTones = [
    // Reflective & Responsive
    "thoughtful", // Actually shouldn't have emojis (in noEmojiTones)
    "blunt", // Actually shouldn't have emojis (in noEmojiTones)
    "surprised",
  ];

  if (beginningTones.includes(tone) && !noEmojiTones.includes(tone)) {
    return `${emoji} ${text}`;
  }

  // For other tones, add emoji to the end
  return `${text} ${emoji}`;
}

// Function to remove emojis from text
function removeEmojis(text) {
  return text
    .replace(
      /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
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
