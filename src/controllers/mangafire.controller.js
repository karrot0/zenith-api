import {extractPopularSections} from "../extractors/mangafire/popularSection.extractor.js";
import {extractMangaInfo} from "../extractors/mangafire/mangaInfo.extractor.js";
import {extractChapterPages} from "..//extractors/mangafire/chapterDetails.extractor.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getPopularManga = async (req) => {
  try {
    const page = req.query.page || 1;
    const cacheKey = `popularManga_page_${page}`;
    
    // Try to get data from cache first
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    // If not in cache, fetch fresh data
    const popularManga = await extractPopularSections(page);
    
    // Cache the results for 10 minutes (600,000 milliseconds)
    await setCachedData(cacheKey, popularManga, 10 * 60 * 1000);
    return popularManga;
  } catch (error) {
    console.error("Error fetching popular manga:", error);
    throw new Error("Failed to retrieve popular manga");
  }
};

export const getMangaInfo = async (req) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Manga ID is required");
    }

    const cacheKey = `mangaInfo_${id}`;
    
    // Try to get data from cache first
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    // If not in cache, fetch fresh data
    const mangaInfo = await extractMangaInfo(id);
    
    // Cache the results for 30 minutes
    await setCachedData(cacheKey, mangaInfo, 30 * 60 * 1000);
    return mangaInfo;
  } catch (error) {
    console.error("Error fetching manga info:", error);
    throw new Error("Failed to retrieve manga information");
  }
};

export const getMangaPages = async (req) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Manga ID is required");
    }

    const cacheKey = `mangaPages_${id}`;
    
    // Try to get data from cache first
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    // If not in cache, fetch fresh data
    const mangaPages = await extractChapterPages(id);
    
    // Cache the results for 30 minutes
    await setCachedData(cacheKey, mangaPages, 30 * 60 * 1000);
    return mangaPages;
  } catch (error) {
    console.error("Error fetching manga pages:", error);
    throw new Error("Failed to retrieve manga pages");
  }
}