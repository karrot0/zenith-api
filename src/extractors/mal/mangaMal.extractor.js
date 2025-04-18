/*
Script for extracting manga information from MyAnimeList (MAL)
*/
import axios from "axios";
import {
    baseUrl,
    headers
} from "./utils.js";
import * as cheerio from "cheerio";

export async function getPictures(mal_id, anime_title) {
    try {
        const response = await axios.get(`${baseUrl}/manga/${mal_id}/${anime_title}/pics`, { headers });
        const $ = cheerio.load(response.data);

        // Extract picture data from the container
        const pictures = [];
        const pictureElements = $('.picSurround');
        
        pictureElements.each((_, element) => {
            const linkElement = $(element).find('a.js-picture-gallery');
            const imgElement = $(element).find('img');
            
            // Get the full-size image URL from the link
            const fullSizeUrl = linkElement.attr('href');
            // Get the thumbnail image
            const thumbnailUrl = imgElement.attr('data-src') || imgElement.attr('src') || '';
            // Extract ID from the report link if needed
            const reportLink = $(element).next('.spaceit').find('a').attr('href') || '';
            const idMatch = reportLink.match(/id=(\d+)/);
            const id = idMatch ? idMatch[1] : '';
            
            if (fullSizeUrl || thumbnailUrl) {
            pictures.push({
                id,
                image: fullSizeUrl || thumbnailUrl,
                thumbnail: thumbnailUrl
            });
            }
        });

        return pictures;
    } catch (error) {
        console.error(`Error extracting manga pictures for MAL ID ${mal_id}: ${error.message}`);
        throw new Error(`Failed to extract manga pictures for MAL ID ${mal_id}: ${error.message}`);
    }
}

export async function extractMangaCharacters(mal_id, anime_title) {
    try {
        const response = await axios.get(`${baseUrl}/manga/${mal_id}/${anime_title}/characters`, { headers });
        const $ = cheerio.load(response.data);

        // Extract character data from the container
        const characters = [];
        const characterTables = $('.js-manga-character-table');
        
        characterTables.each((_, table) => {
            const element = $(table);
            
            // Extract character details
            const characterUrl = element.find('a.fw-n').attr('href') || '';
            const characterId = characterUrl.split('/').pop() || '';
            const name = element.find('h3.h3_character_name').text().trim();
            const role = element.find('small').text().trim();
            const image = element.find('img').attr('data-src') || element.find('img').attr('src') || '';
            const favorites = parseInt(element.find('.js-manga-character-favorites').text().trim()) || 0;
            
            characters.push({
            name,
            id: characterId,
            role,
            image,
            favorites
            });
        });

        // Sort characters - main characters first, then by favorites count
        characters.sort((a, b) => {
            if (a.role === 'Main' && b.role !== 'Main') return -1;
            if (a.role !== 'Main' && b.role === 'Main') return 1;
            return b.favorites - a.favorites;
        });
        
        return characters;

    } catch (error) {
        console.error(`Error extracting manga characters for MAL ID ${mal_id}: ${error.message}`);
        throw new Error(`Failed to extract manga characters for MAL ID ${mal_id}: ${error.message}`);
    }
}

export async function extractMangaInfo(mal_id) { 
    try {
        const response = await axios.get(`${baseUrl}/manga/${mal_id}`, { headers });
        const $ = cheerio.load(response.data);
        

        const title = $('span.h1-title span[itemprop="name"]').text().trim() || $('h1.title').text().trim();
        const cover = $('.leftside img').attr('data-src') || $('.leftside img').attr('src');
        const synopsisElement = $('.rightside span[itemprop="description"]');
        const synopsis = synopsisElement.length ? 
            synopsisElement.html()
            .replace(/<br>/g, '\n')
            .replace(/<\/?[^>]+(>|$)/g, '') // Remove any other HTML tags
            .trim() : 
            '';
        const genres = [];
        $('div.spaceit_pad span.dark_text:contains("Genres:")').parent().find('a').each((_, el) => {
            genres.push($(el).text().trim());
        });
        const [characters, pictures] = await Promise.all([
            extractMangaCharacters(mal_id, title.replace(/\s+/g, '-')),
            getPictures(mal_id, title.replace(/\s+/g, '-'))
        ]);

        return {
            id: mal_id,
            title,
            cover,
            synopsis,
            genres,
            characters,
            pictures
        };
    } catch (error) {
        console.error(`Error extracting manga info for MAL ID ${mal_id}: ${error.message}`);
        throw new Error(`Failed to extract manga info for MAL ID ${mal_id}: ${error.message}`);
    }
}