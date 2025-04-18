import axios from 'axios';
import * as cheerio from "cheerio";
import { baseUrl, headers } from './utils.js';

// Animes Example
// {
//     "title": "Dr. Stone",
//     "id": "dr-stone-175",
//     "role": "Main",
//     "type": "TV",
//     "poster": ""
//   },
//   {
//     "title": "Dr. Stone: Stone Wars",
//     "id": "dr-stone-stone-wars-15691",
//     "role": "Main",
//     "type": "TV",
//     "poster": ""
// }

export const getCharacterByName = async (name, animes) => {
    try {
        // console.log(`[MAL] Searching for character: ${name}${animes ? `, in anime: ${animes}` : ''}`);
        const response = await axios.get(`${baseUrl}/character.php?q=${name}&cat=character`, {headers});

        const $ = cheerio.load(response.data);
        let character_url = "";
        let foundMatch = false;
        
        // console.log('[MAL] Found initial search results page');
        
        // Using for...of loop instead of map for early termination
        for (const element of $('.borderClass').toArray()) {
            if (foundMatch) break;
            
            const idx = $('.borderClass').index(element);
            if (idx % 3 === 0) {
                try {
                    const nameCell = $(element).next();
                    const animeCell = $(element).next().next();
                    
                    // Get character name and URL
                    const nameLink = nameCell.find('a').first();
                    const character_name = nameLink.text().trim();
                    const url = nameLink.attr('href') || '';
                    const id = url.split('/').pop() || '';
                    
                    // console.log(`[MAL] Processing character: ${character_name}`);

                    // Get anime/manga appearances
                    const animeList = [];
                    animeCell.find('a').each((i, anime) => {
                        const animeTitle = $(anime).text().trim();
                        animeList.push({
                            title: animeTitle,
                            url: $(anime).attr('href') || ''
                        });
                        //console.log(`[MAL] Found anime appearance: ${animeTitle}`);
                    });

                    // Fix anime matching logic
                    const matchedAnimes = [];

                    animeList.forEach(anime => {
                        const animeTitle = anime.title.toLowerCase();
                        const searchAnime = animes ? animes.toLowerCase() : '';
                        
                        // Normalize both strings by removing punctuation and whitespace
                        const normalizedSearchAnime = searchAnime.replace(/[^\w\s]|_/g, '').replace(/\s+/g, '');
                        const normalizedAnimeTitle = animeTitle.replace(/[^\w\s]|_/g, '').replace(/\s+/g, '');

                        if (!animes || normalizedAnimeTitle.includes(normalizedSearchAnime) || normalizedSearchAnime.includes(normalizedAnimeTitle)) {
                            //console.log(`[MAL] Matched anime: ${anime.title}`);
                            matchedAnimes.push({
                                title: anime.title,
                                url: anime.url
                            });
                        }
                    });

                    // Match character name more flexibly
                    const normalizedSearchName = name.toLowerCase().replace(/\s+/g, '');
                    const normalizedCharName = character_name.toLowerCase().replace(/\s+/g, '');
                    
                    const isNameMatch = normalizedCharName.includes(normalizedSearchName) || 
                                      normalizedSearchName.includes(normalizedCharName);
                    
                    if (!isNameMatch) {
                        // console.log(`[MAL] Skipping - name mismatch: ${character_name}`);
                        continue;
                    }

                    // Check if we have any anime matches when anime filter is provided
                    if (animes && matchedAnimes.length === 0) {
                        // console.log(`[MAL] Skipping - no matching anime found for: ${character_name}`);
                        continue;
                    }

                    // console.log(`[MAL] Fetching details for: ${character_name}`);
                    character_url = url;
                    foundMatch = true;
                    // console.log(character_url);
                } catch (err) {
                    console.warn(`[MAL] Error processing character at index ${idx}:`, err);
                }
            }
        }

        if (!character_url) {
            // console.log('[MAL] No matching character found');
            return null;
        }

        const response2 = await axios.get(character_url, {headers});

        const response3 = await axios.get(`${character_url}/pics`, {headers});

        const $response = cheerio.load(response2.data);
        const $pics = cheerio.load(response3.data);

        let pics = [];
        // Get character images from the character pictures page
        $pics('table tbody tr td div.picSurround a').each((i, elem) => {
            const imgHref = $pics(elem).attr('href');
            if (imgHref && imgHref.includes('myanimelist.net/images/characters/')) {
            pics.push(imgHref);
            } else {
            // Fallback to img src if href is not available
            const imgSrc = $pics(elem).find('img').attr('src');
            if (imgSrc && imgSrc.includes('myanimelist.net/images/characters/')) {
                pics.push(imgSrc);
            }
            }
        });
        
        // Make sure we have no duplicate images
        pics = [...new Set(pics)];
        
        // Log found images for debugging
        // console.log(`[MAL] Found ${pics.length} character images`);
        // Extract character details
        const nameElement = $response('h2.normal_header').first();
        const fullName = nameElement.text().trim();
        const englishName = fullName.replace(nameElement.find('small').text(), '').trim();
        const japaneseName = nameElement.find('small').text().replace(/[()]/g, '').trim();

        // Get the HTML content of the details section
        const detailsContainer = $response('h2.normal_header').parent();
        const detailsHtml = detailsContainer.html() || '';

        // Extract specific character details
        let characterDetails = {
            name: englishName,
            japaneseName: japaneseName,
            pics: pics
        };

        // Process details safely by checking if detailsHtml exists
        if (detailsHtml) {
            // Parse the details HTML to extract information
            // Use regex with non-greedy quantifiers for more accurate extraction
            
            // Process birthdate
            const birthdateMatch = detailsHtml.match(/Birthdate:([^<]*)/);
            if (birthdateMatch) {
            characterDetails.birthdate = birthdateMatch[1].trim();
            }
            
            // Process birthday (alternative format)
            if (!characterDetails.birthdate && detailsHtml.includes('Birthday')) {
            const birthdayMatch = detailsHtml.match(/Birthday[^:]*:([^<]*)/);
            if (birthdayMatch) {
                characterDetails.birthdate = birthdayMatch[1].trim();
            }
            }

            // Process age
            const ageMatch = detailsHtml.match(/Age:([^<]*)/);
            if (ageMatch) {
            characterDetails.age = ageMatch[1].trim();
            }

            // Process height
            const heightMatch = detailsHtml.match(/Height:([^<]*)/);
            if (heightMatch) {
            characterDetails.height = heightMatch[1].trim();
            }

            // Process weight
            const weightMatch = detailsHtml.match(/Weight:([^<]*)/);
            if (weightMatch) {
            characterDetails.weight = weightMatch[1].trim();
            }

            // Process blood type
            const bloodTypeMatch = detailsHtml.match(/Blood type:([^<]*)/);
            if (bloodTypeMatch) {
            characterDetails.bloodType = bloodTypeMatch[1].trim();
            }

            // Process hair color
            const hairColorMatch = detailsHtml.match(/Hair color:([^<]*)/);
            if (hairColorMatch) {
            characterDetails.hairColor = hairColorMatch[1].trim();
            }

            // Process eye color
            const eyeColorMatch = detailsHtml.match(/Eye color:([^<]*)/);
            if (eyeColorMatch) {
            characterDetails.eyeColor = eyeColorMatch[1].trim();
            }

            // Process sign
            const signMatch = detailsHtml.match(/Sign:([^<]*)/);
            if (signMatch) {
            characterDetails.sign = signMatch[1].trim();
            }

            // Process likes/favorites
            const likesMatch = detailsHtml.match(/Likes:([^<]*)/);
            if (likesMatch) {
            characterDetails.likes = likesMatch[1].trim();
            }

            // Extract bio text - looking for content between the last stat and the next div or section
            const bioRegex = /<br><br>([\s\S]*?)(?:<div|$)/;
            const bioMatch = detailsHtml.match(bioRegex);
            if (bioMatch && bioMatch[1]) {
            // Clean up the bio text by removing HTML tags
            const bioText = bioMatch[1].replace(/<[^>]*>/g, '').trim();
            if (bioText) {
                characterDetails.bio = bioText;
            }
            }
        } else {
            console.log('[MAL] Warning: Could not extract character details HTML');
        }
        
        // console.log(`[MAL] Successfully extracted data for: ${englishName}`);
        // console.log('[MAL] Character data:', characterDetails);

        return characterDetails;
    } catch (error) {
        console.error("[MAL] Main extraction error:", error);
        throw error;
    }
};
