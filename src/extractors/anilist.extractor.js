import axios from "axios";

const ANILIST_API = "https://graphql.anilist.co";

export const getAnimeById = async (animeId) => {
    try {
        const formattedId = animeId.replace(/-\d+$/, "").replace(/-/g, " ");
        
        const query = `
            query ($search: String) {
                Media (search: $search, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    description
                    episodes
                    status
                    genres
                    averageScore
                    popularity
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    coverImage {
                        large
                    }
                    bannerImage
                    trailer {
                        id
                        site
                        thumbnail
                    }
                    externalLinks {
                        url
                        site
                        type
                    }
                }
            }
        `;

        const response = await axios.post(ANILIST_API, {
            query,
            variables: { search: formattedId }
        });

        return response.data.data.Media;
    } catch (error) {
        console.error("Anilist API Error:", error);
        throw error;
    }
};