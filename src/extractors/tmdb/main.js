import axios from "axios";
import * as cheerio from "cheerio";
import { getCachedData, setCachedData } from "../../helper/cache.helper.js";

// 24 hours cache TTL in milliseconds
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function getAnimeDetails(title) {
    // Generate cache key
    const cacheKey = `tmdb:details:${title}`;
    
    // Check cache first
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
        console.log(`Using cached TMDB details for "${title}"`);
        return cachedData;
    }
    
    try {
        const encodedTitle = encodeURIComponent(title);
        const url = `https://www.themoviedb.org/search?language=en-US&query=${encodedTitle}`;
        const response = await axios.get(url);

        const $ = cheerio.load(response.data);
        
        let bestMatch = null;
        let highestMatchScore = 0;

        $('.search_results .card').each((_, el) => {
            const currentTitle = $(el).find('.title h2').text().trim();
            const href = $(el).find('.poster a').attr('href');
            const matchScore = calculateSimilarity(title, currentTitle);

            if (matchScore > highestMatchScore) {
                highestMatchScore = matchScore;
                bestMatch = href ? href.split('?')[0].replace('/tv/', '') : null;
            }
        });

        if (bestMatch) {
            bestMatch = bestMatch.toString();
        }

        function normalizeString(str) {
            return str.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                .replace(/[^\w\s]/g, '')        // Remove punctuation
                .replace(/\s+/g, ' ')           // Normalize whitespace
                .trim();
        }

        function calculateSimilarity(str1, str2) {
            const norm1 = normalizeString(str1);
            const norm2 = normalizeString(str2);
            
            const words1 = str1.toLowerCase().split(/\s+/);
            const words2 = str2.toLowerCase().split(/\s+/);
            const commonWords = words1.filter(word => words2.includes(word));
            const originalScore = commonWords.length / Math.max(words1.length, words2.length);
            
            const normWords1 = norm1.split(/\s+/);
            const normWords2 = norm2.split(/\s+/);
            const commonNormWords = normWords1.filter(word => normWords2.includes(word));
            const normalizedScore = commonNormWords.length / Math.max(normWords1.length, normWords2.length);
            
            return Math.max(originalScore, normalizedScore);
        }

        const [logos, backdrops, openings] = await Promise.all([
            getAnimeLogos(bestMatch),
            getAnimeBackdrops(bestMatch),
            getAnimeOpenings(bestMatch)
        ]);

        const details = {
            id: bestMatch,
            logos: logos,
            backdrops: backdrops,
            openings: openings
        };

        // Store in cache for 24 hours
        await setCachedData(cacheKey, details, CACHE_TTL);
        
        return details;
    } catch (error) {
        console.error(`Error fetching anime details for title "${title}":`, error.message);
        const errorResult = {
            id: null,
            logos: [],
            backdrops: []
        };
        
        // Cache error results too, to avoid hammering failed endpoints
        await setCachedData(cacheKey, errorResult, CACHE_TTL);
        return errorResult;
    }
}

export async function getAnimeLogos(id) {
    // Return empty array if id is invalid
    if (!id) return [];
    
    // Generate cache key
    const cacheKey = `tmdb:logos:${id}`;
    
    // Check cache first
    const cachedLogos = await getCachedData(cacheKey);
    if (cachedLogos) {
        console.log(`Using cached TMDB logos for id "${id}"`);
        return cachedLogos;
    }
    
    try {
        const response = await axios.get(`https://www.themoviedb.org/tv/${id}/images/logos?language=en-US`);
        const $ = cheerio.load(response.data);

        const logos = [];
        $('.image img').each((_, el) => {
            const logoUrl = $(el).attr('src');
            if (logoUrl) {
                logos.push(logoUrl);
            }
        });

        // Store in cache for 24 hours
        await setCachedData(cacheKey, logos, CACHE_TTL);
        
        return logos;
    } catch (error) {
        console.error(`Error fetching logos for id ${id}:`, error.message);
        // Cache empty results too
        await setCachedData(cacheKey, [], CACHE_TTL);
        return [];
    }
}

export async function getAnimeBackdrops(id) {
    // Return empty array if id is invalid
    if (!id) return [];
    
    // Generate cache key
    const cacheKey = `tmdb:backdrops:${id}`;
    
    // Check cache first
    const cachedBackdrops = await getCachedData(cacheKey);
    if (cachedBackdrops) {
        console.log(`Using cached TMDB backdrops for id "${id}"`);
        return cachedBackdrops;
    }
    
    try {
        const response = await axios.get(`https://www.themoviedb.org/tv/${id}/images/backdrops?language=en-US`);
        const $ = cheerio.load(response.data);

        const backdrops = [];

        $('.backdrop .image_content img, .backdrop img.backdrop, .card--image img').each((_, el) => {
            const backdropUrl = $(el).attr('src') || $(el).attr('data-src');
            if (backdropUrl) {
                backdrops.push(backdropUrl);
            }
        });
        
        // Store in cache for 24 hours
        await setCachedData(cacheKey, backdrops, CACHE_TTL);
        
        return backdrops;
    } catch (error) {
        console.error(`Error fetching backdrops for id ${id}:`, error.message);
        // Cache empty results too
        await setCachedData(cacheKey, [], CACHE_TTL);
        return [];
    }
}

export async function getAnimeOpenings(id) {
    try {
        const response = await axios.get(`https://www.themoviedb.org/tv/${id}/videos?active_nav_item=Opening%20Credits&language=en-US`);
        const $ = cheerio.load(response.data);

        const openings = [];
        $('.video.card.default').each((_, el) => {
            const $el = $(el);
            const a = $el.find('.wrapper a.play_trailer');
            const youtubeId = a.attr('data-id');
            const youtubeUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null;
            const title = a.attr('data-title') || $el.find('h2 a').text().trim();
            const thumbnail = $el.find('.wrapper').css('background-image');
            let thumbnailUrl = null;
            if (thumbnail) {
            // Extract URL from background-image: url('...')
            const match = thumbnail.match(/url\(['"]?(.*?)['"]?\)/);
            if (match) thumbnailUrl = match[1];
            }
            if (youtubeUrl) {
            openings.push({
                title,
                youtubeUrl,
                youtubeId,
                thumbnail: thumbnailUrl
            });
            }
        });

        return openings;
    } catch (error) {
        console.error(`Error fetching openings for id ${id}:`, error.message);
        return [];
    }
}