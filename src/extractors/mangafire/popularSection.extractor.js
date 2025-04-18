/* 
This file is responsible for extracting popular sections from the Mangafire website.
*/

import axios from "axios";
import {
    baseUrl,
    headers,
    convertToISO8601
} from "./utils.js";
import * as cheerio from "cheerio";

export async function extractPopularSections(page = 1) {
    try {
        const url = new URL(`${baseUrl}/filter?keyword=&language[]=en&sort=most_viewed&page=${page}`);
        const response = await axios.get(url.toString(), { headers });
        const $ = cheerio.load(response.data);

        const items = [];
        const collectedIds = []; // Initialize collectedIds array

        $(".unit .inner").each((_, element) => {
            const unit = $(element);
            const infoLink = unit.find(".info > a").last();
            const title = infoLink.text().trim();
            const image = unit.find(".poster img").attr("src") || "";
            const mangaId = infoLink.attr("href")?.replace("/manga/", "") || "";
            const type = unit.find(".info .type").text().trim();
            
            const chaptersData = [];
            unit.find(".content[data-name='chap'] li").each((_, chapterEl) => {
                const chapterLink = $(chapterEl).find('a');
                const chapterText = chapterLink.find('span:first-child').text().trim();
                const timeAgo = chapterLink.find('span:last-child').text().trim();
                
                chaptersData.push({
                    chapter: chapterText,
                    timeAgo: convertToISO8601(timeAgo),
                    url: chapterLink.attr('href') || ""
                });
            });
            
            const chapters = chaptersData.length > 0 ? chaptersData : [];
      
            if (title && mangaId && !collectedIds.includes(mangaId)) {
              collectedIds.push(mangaId);
              items.push({
                id: mangaId,
                cover: image,
                type: type,
                title: title,
                chapters: chapters,
              });
            }
        });
  
        const hasNextPage = !!$(".hpage .r").length;
  
        return {
            items: items,
            metadata: hasNextPage ? { page: page + 1, collectedIds } : undefined,
        };
    } catch (error) {
        console.error("Error extracting popular sections:", error);
        throw new Error("Failed to extract popular manga sections");
    }
}