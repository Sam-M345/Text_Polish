// Import required modules
const axios = require("axios");
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
  "surprised",
];

// Vercel serverless function handler
module.exports = async (req, res) => {
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

  try {
    // Generate the prompt for OpenAI
    const prompt = generatePrompt(text, messageType, textLength, tone);
    console.log("Generated prompt:", prompt);

    // Get emoji for the selected tone (only if we should include emojis)
    const toneEmoji = shouldIncludeEmojis ? getToneEmoji(tone) : "";

    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error("ERROR: OpenAI API key is missing");
      throw new Error("OpenAI API key not configured");
    }

    // Call the OpenAI API
    const requestData = {
      model: "gpt-4o",
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

    console.log(
      "Using API Key:",
      process.env.OPENAI_API_KEY
        ? "Found (starts with " +
            process.env.OPENAI_API_KEY.substring(0, 3) +
            ")"
        : "Not found"
    );

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

    console.log("OpenAI response status:", apiResponse.status);

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

    // Send the improved message back to the client
    return res.status(200).json({ improved });
  } catch (error) {
    console.error("Error improving message:", error);

    // Generate a fallback response instead of failing
    const fallbackResponse = generateFallbackResponse(text, tone, textLength);
    console.log("Using fallback response:", fallbackResponse);

    // Return fallback response instead of error
    return res.status(200).json({ improved: fallbackResponse });
  }
};

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
  } else {
    lengthGuidance = "Provide an appropriate length response.";
  }

  // Determine if this tone should include emojis
  const shouldIncludeEmojis = !noEmojiTones.includes(tone);

  return `
    Rewrite the following ${messageType} message to make it sound more ${tone}.
    ${lengthGuidance}
    ${
      shouldIncludeEmojis
        ? `Include appropriate emojis that match the ${tone} tone.`
        : `DO NOT include any emojis in your response.`
    }
    
    Original message: "${originalText}"
    
    Provide ONLY the improved message text without any additional explanation or formatting.
    IMPORTANT: Make significant changes to the original text to ensure it clearly reflects the ${tone} tone.
  `;
}

// Generate a fallback response in case of API failure
function generateFallbackResponse(originalText, tone, textLength) {
  // Check if this tone should include emojis
  const shouldIncludeEmojis = !noEmojiTones.includes(tone);

  // Get emoji for the tone only if we should include emojis
  const emoji = shouldIncludeEmojis ? getToneEmoji(tone) : "";

  // Determine base multiplier for text length - FIXED to prevent excessive repetition
  let lengthMultiplier = 1;
  if (textLength === "medium") {
    lengthMultiplier = 2; // Reduced from 3
  } else if (textLength === "long") {
    lengthMultiplier = 3; // Reduced from 8
  }

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

  // Add emoji only if this tone should have them
  if (emoji && shouldIncludeEmojis) {
    improved = addEmojiToText(improved, emoji, tone);
  }

  // Generate additional content based on length setting - FIXED to prevent repetition
  if (lengthMultiplier > 1) {
    const extraSentences = [];
    // Create an array of unique sentences for each tone
    const sentencesMap = {
      formal: [
        "Furthermore, this matter requires your attention.",
        "Please consider the implications carefully.",
        "I trust you will give this the consideration it deserves.",
      ],
      friendly: [
        "I was just thinking about this the other day!",
        "It's so nice to connect about these things.",
        "I'd love to hear your thoughts on this!",
      ],
      // ... other tones with unique sentences ...
    };

    // Get appropriate sentences for this tone or use defaults
    const sentencesForTone = sentencesMap[tone] || [
      "Let me elaborate further on this important topic.",
      "There are several important aspects to consider here.",
      "This deserves careful consideration.",
    ];

    // Add a maximum of lengthMultiplier sentences, but don't repeat if we run out
    for (let i = 0; i < lengthMultiplier; i++) {
      if (sentencesForTone[i % sentencesForTone.length]) {
        extraSentences.push(sentencesForTone[i % sentencesForTone.length]);
      }
    }

    improved += " " + extraSentences.join(" ");
  }

  return improved;
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
