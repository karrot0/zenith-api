import { getAnimeById } from "../extractors/anilist.extractor.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getAnilistInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `anilist:${id}`;

        // Try to get from cache first
        const cachedData = await getCachedData(cacheKey);
        if (cachedData) {
            return res.json({ data: cachedData });
        }

        const anilistData = await getAnimeById(id);
        
        if (!anilistData) {
            return res.status(404).json({ error: "Anime not found on Anilist" });
        }

        // Cache for 12 hours
        await setCachedData(cacheKey, anilistData, 12 * 60 * 60 * 1000);
        res.json({ success: true, data: anilistData });
    } catch (error) {
        console.error("Anilist Controller Error:", error);
        res.status(500).json({ error: "Failed to fetch Anilist data" });
    }
};