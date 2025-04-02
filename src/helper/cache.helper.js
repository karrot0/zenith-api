import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const CACHE_SERVER_URL = process.env.CACHE_URL || null;

// In-memory cache as fallback when no cache server is available
const memoryCache = new Map();
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Gets cached data from either external cache server or in-memory cache
 * @param {string} key Cache key
 * @returns {Promise<any>} Cached data or undefined if not found
 */
export const getCachedData = async (key) => {
  try {
    // Try external cache server if configured
    if (CACHE_SERVER_URL) {
      try {
        const response = await axios.get(`${CACHE_SERVER_URL}/${key}`);
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          return null;
        }
        console.warn("Error accessing external cache server:", error.message);
        // Fall through to in-memory cache if external cache fails
      }
    }

    // Use in-memory cache as fallback
    const entry = memoryCache.get(key);
    if (!entry) return null;

    // Check if the entry has expired
    if (entry.expiry <= Date.now()) {
      memoryCache.delete(key);
      return null;
    }

    console.log(`Cache HIT (memory): ${key}`);
    return entry.value;
  } catch (error) {
    console.error("Cache error:", error);
    return null;
  }
};

/**
 * Sets cached data in either external cache server or in-memory cache
 * @param {string} key Cache key
 * @param {any} value Data to cache
 * @param {number} ttl Time-to-live in milliseconds (defaults to 10 minutes)
 */
export const setCachedData = async (key, value, ttl = DEFAULT_TTL) => {
  try {
    // Try external cache server if configured
    if (CACHE_SERVER_URL) {
      try {
        await axios.post(CACHE_SERVER_URL, { key, value });
        return;
      } catch (error) {
        console.warn("Error setting data in external cache server:", error.message);
        // Fall through to in-memory cache if external cache fails
      }
    }

    // Use in-memory cache as fallback
    const expiry = Date.now() + ttl;
    memoryCache.set(key, { value, expiry });
    console.log(`Cache SET (memory): ${key} (expires in ${ttl/1000}s)`);

    // Schedule cleanup for expired items every minute
    if (!cleanupScheduled) {
      setInterval(cleanupExpiredEntries, 60 * 1000);
      cleanupScheduled = true;
    }
  } catch (error) {
    console.error("Error setting cache:", error);
  }
};

// Flag to ensure we only schedule cleanup once
let cleanupScheduled = false;

/**
 * Clean up expired cache entries
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  let expiredCount = 0;
  
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiry <= now) {
      memoryCache.delete(key);
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    console.log(`Cache cleanup: removed ${expiredCount} expired entries. Current size: ${memoryCache.size}`);
  }
}

/**
 * Returns cache statistics
 * @returns {Object} Cache statistics
 */
export const getCacheStats = () => {
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys())
  };
};
