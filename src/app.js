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
  const { text, messageType, tone } = req.body;

  // If text is missing, return an error
  if (!text) {
    return res.status(400).json({ error: "No text provided." });
  }

  try {
    // Generate the prompt for OpenAI
    const prompt = generatePrompt(text, messageType, tone);

    // Call the OpenAI API
    const apiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert writer specializing in improving ${messageType} messages to sound more ${tone}.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 300,
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
    const improved = apiResponse.data.choices[0].message.content.trim();

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
function generatePrompt(originalText, messageType, tone) {
  return `
    Please improve the following ${messageType} message to make it sound more ${tone}.
    
    Original message: "${originalText}"
    
    Provide ONLY the improved message text without any additional explanation or formatting.
  `;
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
