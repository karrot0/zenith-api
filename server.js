import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createApiRoutes } from "./src/routes/apiRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4444;
const __filename = fileURLToPath(import.meta.url);
const publicDir = path.join(dirname(__filename), "public");

// Get allowed origins from environment variables only
// If not provided, default to allow all origins by using "*"
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",").map(origin => origin.trim())
  : ["*"];

console.log("Allowed origins:", allowedOrigins);

// Improved CORS setup with better origin handling
app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`Origin ${origin} not allowed by CORS policy`);
        callback(null, false);
      }
    },
    methods: ["GET", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400 // 24 hours
  })
);

// Enhanced CORS middleware for better debugging and flexibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Log the origin for debugging
  console.log(`Request received from origin: ${origin || 'unknown'}`);
  
  if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    // For preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return next();
  }
  
  console.error(`Blocked request from non-allowed origin: ${origin}`);
  res
    .status(403)
    .json({ success: false, message: "Forbidden: Origin not allowed" });
});

app.use(express.static(publicDir, { redirect: false }));

const jsonResponse = (res, data, status = 200) =>
  res.status(status).json({ success: true, results: data });

const jsonError = (res, message = "Internal server error", status = 500) =>
  res.status(status).json({ success: false, message });

createApiRoutes(app, jsonResponse, jsonError);

app.get("*", (req, res) => {
  const filePath = path.join(publicDir, "404.html");
  if (fs.existsSync(filePath)) {
    res.status(404).sendFile(filePath);
  } else {
    res.status(500).send("Error loading 404 page.");
  }
});

app.listen(PORT, () => {
  console.info(`Zenith API server listening on port ${PORT}`);
  console.info(`Allowed origins: ${allowedOrigins.join(", ")}`);
});
