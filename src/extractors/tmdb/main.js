import axios from "axios";
import * as cheerio from "cheerio";

export async function getAnimeDetails(title) {
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
            const matchScore = calculateSimilarity(title.toLowerCase(), currentTitle.toLowerCase());

            if (matchScore > highestMatchScore) {
                highestMatchScore = matchScore;
                bestMatch = href ? href.split('?')[0].replace('/tv/', '') : null;
            }
        });

        if (bestMatch) {
            bestMatch = bestMatch.toString();
        }

        function calculateSimilarity(str1, str2) {
            const words1 = str1.split(/\s+/);
            const words2 = str2.split(/\s+/);
            const commonWords = words1.filter(word => words2.includes(word));
            return commonWords.length / Math.max(words1.length, words2.length);
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
        }

        return details;
    } catch (error) {
        console.error(`Error fetching anime details for title "${title}":`, error.message);
        return {
            id: null,
            logos: [],
            backdrops: []
        };
    }
}

export async function getAnimeLogos(id) {
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

        return logos;
    } catch (error) {
        console.error(`Error fetching logos for id ${id}:`, error.message);
        return [];
    }
}

export async function getAnimeBackdrops(id) {
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
        
        return backdrops;
    } catch (error) {
        console.error(`Error fetching backdrops for id ${id}:`, error.message);
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