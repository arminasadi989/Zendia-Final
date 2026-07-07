import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: "15mb" }));

  // Helper function to validate Gemini API key formats
  function isValidApiKey(key: string): boolean {
    if (!key) return false;
    const trimmed = key.trim();
    // Support legacy AIza format
    if (trimmed.startsWith("AIza")) return true;
    // Support new AQ. dotted format
    if (trimmed.startsWith("AQ.")) return true;
    // Fallback: allow flexible custom keys of reasonable length without spaces
    return trimmed.length >= 20 && !/\s/.test(trimmed);
  }

  // Secure backend proxy endpoint for Gemini API
  app.post("/api/gemini/generateContent", async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      
      // Determine the API key to use
      // Prioritize custom API key passed in headers by the client
      const customKey = req.headers["x-api-key"] as string;
      const serverKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      
      const apiKey = customKey && isValidApiKey(customKey) ? customKey.trim() : serverKey;

      if (!apiKey) {
        return res.status(401).json({
          error: {
            message: "کلید API یافت نشد. لطفا کلید اختصاصی خود را در کادر تنظیمات وارد کنید یا کلید عمومی سرور را بررسی نمایید.",
            status: "UNAUTHORIZED"
          }
        });
      }

      // Initialize the Gemini SDK on the backend
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model,
        contents,
        config
      });

      res.json(response);
    } catch (error: any) {
      console.error("Gemini Backend Proxy Error:", error);
      
      // Extract status and detailed error information safely
      const status = error.status || error.statusCode || 500;
      let errMessage = error.message || "خطا در ارتباط با سرور گوگل جیمینی";
      
      if (error.error && typeof error.error === "object") {
        errMessage = error.error.message || errMessage;
      }

      res.status(status).json({
        error: {
          message: errMessage,
          status: error.status || "INTERNAL_SERVER_ERROR",
          code: status,
          details: error.details || []
        }
      });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", serverTime: new Date().toISOString() });
  });

  // Vite middleware for development or static file serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
