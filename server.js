import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createApiRoutes } from "./src/routes/apiRoutes.js";
import { handleError } from "./src/utils/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4444;
const __filename = fileURLToPath(import.meta.url);
const publicDir = path.join(dirname(__filename), "public");

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin ends with zenithme.ne
    if (origin.endsWith('zenithme.net')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Add CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' https://cdnjs.cloudflare.com data:; img-src 'self' data: https: http:;"
  );
  next();
});

app.use(express.static(publicDir, { redirect: false }));

// Track request timing
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Updated CORS policy middleware - removed the universal '*' origin
app.use((req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Bearer token verification middleware
const verifyBearerToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      responseTime: `${Date.now() - req.startTime}ms`
    });
  }
  
  if (token !== process.env.API_BEARER_TOKEN) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      responseTime: `${Date.now() - req.startTime}ms`
    });
  }
  
  next();
};

// Update jsonResponse to handle errors
const jsonResponse = (res, data, status = 200) => {
  const responseTime = Date.now() - res.req.startTime;
  
  // Check if data is an error response
  if (data && data.error) {
    return res.status(data.statusCode || status).json({
      success: false,
      error: data.error,
      details: data.details,
      responseTime: `${responseTime}ms`
    });
  }

  return res.status(status).json({ 
    success: true, 
    results: data,
    responseTime: `${responseTime}ms`
  });
};

// Add global error handler
app.use((err, req, res, next) => {
  const errorResponse = handleError(err, req, res);
  jsonResponse(res, errorResponse, errorResponse.statusCode);
});

// Apply bearer token verification to API routes
createApiRoutes(app, jsonResponse, verifyBearerToken);

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
});
