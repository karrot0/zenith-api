import { getAnimeDetails } from "../extractors/tmdb/main.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getTmdbAnimeDetails = async (req, res) => {
    try {
        let { title } = req.params;
        if (!title) {
            return res.status(400).json({ error: "Title parameter is required" });
        }
        
        // Decode the title if it's URL-encoded
        title = decodeURIComponent(title);

        const cacheKey = `tmdb:animeDetails:${title}`;
        const cachedData = await getCachedData(cacheKey);
        if (cachedData) {
            return res.status(200).json(cachedData);
        }

        const animeDetails = await getAnimeDetails(title);

        // Cache for 12 hours
        await setCachedData(cacheKey, animeDetails, 12 * 60 * 60 * 1000);

        return res.json({ success: true, data: animeDetails });
    } catch (error) {
        console.error("Error fetching TMDB anime details:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
