import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
});

app.use("/recipe", limiter);

// Recipe generation endpoint with timeout and streaming-like response
app.post("/recipe", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("🍳 Generating recipe...");

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are a professional chef. Create concise but complete recipes with: dish name, ingredients (with amounts), numbered steps, and one quick tip. Keep it under 500 words."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800, // Reduced for faster response
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API Error:", errorData);
      
      // Check for specific errors
      if (response.status === 429) {
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please wait a moment and try again." 
        });
      }
      
      if (response.status === 401) {
        return res.status(401).json({ 
          error: "Invalid API key. Please check your OpenAI API key in .env file." 
        });
      }
      
      return res.status(response.status).json({ 
        error: "Failed to generate recipe",
        details: errorData.error?.message 
      });
    }

    const data = await response.json();
    const recipe = data.choices[0].message.content;

    console.log("✅ Recipe generated successfully");
    res.json({ recipe });

  } catch (error) {
    console.error("Server Error:", error);
    
    if (error.name === 'AbortError') {
      return res.status(504).json({ 
        error: "Request timeout. OpenAI took too long to respond. Please try again." 
      });
    }
    
    res.status(500).json({ 
      error: "Something went wrong",
      message: error.message 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍳 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});