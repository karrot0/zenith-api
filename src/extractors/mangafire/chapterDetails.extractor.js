/* 
This file is responsible for extracting specific manga details from the Mangafire website.
*/


import axios from "axios";
import { baseUrl, headers } from "./utils.js";
import { cacheImage } from "../../helper/imageCache.helper.js";
import * as cheerio from "cheerio";

export async function extractChapterPages(chapter_id) {
    try {
        console.log("Extracting chapter pages for chapter ID:", chapter_id);
        const response = await axios.get(`${baseUrl}/ajax/read/chapter/${chapter_id}`, { headers });
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        const { data: responseData } = data;
        
        const pages = [];
        if (responseData?.status === 200 && responseData?.result?.images) {
            const images = responseData.result.images;
            
            if (Array.isArray(images)) {
                for (const imageData of images) {
                    const imageUrl = Array.isArray(imageData) ? imageData[0] : imageData;
                    if (typeof imageUrl === 'string') {
                        try {
                            const cachedUrl = await cacheImage(imageUrl);
                            pages.push(cachedUrl);
                        } catch (err) {
                            console.error("Failed to cache image:", imageUrl, err);
                            pages.push(imageUrl);
                        }
                    }
                }
            }
        }

        return {
            pages: pages,
        };
    } catch (error) {
        console.error("Error extracting chapter pages:", error);
        throw error;
    }
}