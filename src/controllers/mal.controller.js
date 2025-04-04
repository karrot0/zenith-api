import { getCharacterByName } from "../extractors/mal.extractor.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const searchCharacter = async (req, res) => {
    try {
        const { name, animes } = req.query;
        if (!name) {
            return res.status(400).json({ error: "Character name is required" });
        }

        const cacheKey = `mal:character:${name}`;
        const cachedData = await getCachedData(cacheKey);
        if (cachedData) {
            return res.json({ data: cachedData });
        }

        const characters = await getCharacterByName(name, animes);
        
        // Cache for 24 hours
        await setCachedData(cacheKey, characters, 24 * 60 * 60 * 1000);
        res.json({ success: true, data: characters });
    } catch (error) {
        console.error("MAL Controller Error:", error);
        res.status(500).json({ error: "Failed to fetch MAL data" });
    }
};
