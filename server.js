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

// CORS configuration - this only controls which origins can connect
// It does NOT bypass authentication requirements
app.use(cors({
  origin: function(origin, callback) {
    // Even with allowed origins, bearer token is still required for API endpoints
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('https://localhost') ||
      origin.startsWith('https://127.0.0.1')
    ) {
      return callback(null, true);
    }

    // Check if origin ends with zenithme.net
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

// Log request IP address and path
app.use((req, res, next) => {
  // Get IP address - check for proxy forwarded IP first
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // Get request method and path
  const method = req.method;
  const path = req.originalUrl || req.url;
  
  // Get user agent
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  // Log the request information
  console.log(`[${new Date().toISOString()}] ${method} ${path} - IP: ${ip} - User-Agent: ${userAgent}`);
  
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
    console.log(`Authentication failed: No token provided - IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress} - Path: ${req.path}`);
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      responseTime: `${Date.now() - req.startTime}ms`
    });
  }
  
  if (token !== process.env.API_BEARER_TOKEN) {
    console.log(`Authentication failed: Invalid token - IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress} - Path: ${req.path}`);
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

app.use(verifyBearerToken);
createApiRoutes(app, jsonResponse);

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
