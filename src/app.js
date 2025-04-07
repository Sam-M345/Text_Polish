const express = require("express");
const cors = require("cors");
const path = require("path");
// We'll use axios if we need to call out to an external API like OpenAI
const axios = require("axios");

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
    // In a production environment, you would call out to an LLM API like OpenAI here
    // const prompt = generatePrompt(text, messageType, tone);
    // const apiResponse = await axios.post(
    //   'https://api.openai.com/v1/completions',
    //   {
    //     model: "text-davinci-003",
    //     prompt: prompt,
    //     max_tokens: 150
    //   },
    //   {
    //     headers: {
    //       'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //       'Content-Type': 'application/json'
    //     }
    //   }
    // );
    // const improved = apiResponse.data.choices[0].text.trim();

    // For now, we'll generate a mock response based on the tone
    let improved;
    switch (tone) {
      case "friendly":
        improved = `Hey there! ${text} 😊 Looking forward to hearing back from you!`;
        break;
      case "serious":
        improved = `I need to inform you that ${text.toLowerCase()}. Please acknowledge receipt of this message.`;
        break;
      case "professional":
        improved = `I would like to bring to your attention that ${text.toLowerCase()}. Please let me know if you require any further information.`;
        break;
      case "flirty":
        improved = `Hey you 😉 ${text} Can't wait to hear back from you! xoxo`;
        break;
      default:
        improved = text;
    }

    // Add a small delay to simulate API processing time
    setTimeout(() => {
      res.json({ improved });
    }, 500);
  } catch (error) {
    console.error("Error improving message:", error);
    res.status(500).json({ error: "Error improving message." });
  }
});

// Helper function to generate prompts for the LLM
function generatePrompt(originalText, messageType, tone) {
  return `
    You are an expert writer specializing in improving ${messageType} messages.
    Please improve the following message to make it sound more ${tone}.
    
    Original message: "${originalText}"
    
    Improved ${tone} message:
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
