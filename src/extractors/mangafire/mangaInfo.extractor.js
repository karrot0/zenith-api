/* 
This file is responsible for extracting specific manga details from the Mangafire website.
*/


import axios from "axios";
import {
    baseUrl,
    headers,
    convertToISO8601
} from "./utils.js";
import * as cheerio from "cheerio";

// Add ContentRating enum
const ContentRating = {
    EVERYONE: 'EVERYONE',
    TEEN: 'TEEN',
    MATURE: 'MATURE'
};

export async function extractMangaInfo(mangaId) {
    try {
        const response = await axios.get(`${baseUrl}/manga/${mangaId}`, { headers });
        const $ = cheerio.load(response.data);

        const title = $(".manga-detail .info h1").text().trim();
        const altTitleText = $(".manga-detail .info h6").text().trim();
        const altTitles = altTitleText ? altTitleText.split(';').map(title => title.trim()).filter(Boolean) : [];
        const image = $(".manga-detail .poster img").attr("src") || "";
        const description = $("#synopsis .modal-content").text().trim() || $(".manga-detail .info .description").text().trim();
        const authors = [];
        $("#info-rating .meta div").each((_, element) => {
          const label = $(element).find("span").first().text().trim();
          if (label === "Author:") {
            $(element)
              .find("a")
              .each((_, authorElement) => {
                authors.push($(authorElement).text().trim());
              });
          }
        });
        let status = "UNKNOWN";
        let statusText = "Unknown";
        $(".manga-detail .info p").each((_, element) => {
          const text = $(element).text().trim().toLowerCase();
          statusText = $(element).text().trim();
        });
        
        if (statusText.includes("Releasing")) {
          status = "ONGOING";
        } else if (statusText.includes("Completed")) {
          status = "COMPLETED";
        } else if (
          statusText.includes("hiatus") ||
          statusText.includes("discontinued") ||
          statusText.includes("not yet published") ||
          statusText.includes("completed")
        ) {
          status = statusText.toLocaleUpperCase().replace(/\s+/g, "_");
        }

        let type = null
        $(".manga-detail .info .min-info a").each((_, element) => {
          const text = $(element).text().trim();
          if (text && $(element).attr("href")?.includes("/type/")) {
            type = text.toUpperCase();
          }
        });

        let published = [];
        $("#info-rating .meta div").each((_, element) => {
            const label = $(element).find("span").first().text().trim();
            if (label === "Published:") {
                published = $(element).text().replace("Published:", "").trim();
            }
        });

        // If publication date format matches "Apr 05, 2021 to ?", parse it appropriately
        if (published) {
            // Extract publication date and convert using existing utility
            const match = published.match(/([A-Za-z]+\s\d{2},\s\d{4})/);
            if (match) {
            const publishedDate = match[1];
            published = {
                original: published,
                start: convertToISO8601(publishedDate),
                end: published.includes("?") ? null : null // Handle end date if present
            };
            }
        }

        const genres = [];
        let rating = 1;
    
        $("#info-rating .meta div").each((_, element) => {
          const label = $(element).find("span").first().text().trim();
          if (label === "Genres:") {
            $(element)
              .find("a")
              .each((_, genreElement) => {
                genres.push($(genreElement).text().trim());
              });
          }
        });
    
        const ratingValue = $("#info-rating .score .live-score").text().trim();
        if (ratingValue) {
          rating = parseFloat(ratingValue);
        }

        let mal_id = null;
        let anilist_id = null;
        const syncDataScript = $('#syncData').html();
        if (syncDataScript) {
            try {
            const syncData = JSON.parse(syncDataScript);
            mal_id = syncData.mal_id || null;
            anilist_id = syncData.anilist_id || null;
            } catch (e) {
            console.error("Error parsing syncData:", e);
            }
        }

        const related_manga = [];
        
        $(".m-related").each((_, section) => {
            const sectionType = $(section).find(".tab.active").data("name");
            
            if (sectionType) {
            $(section).find(".tab-content[data-name='" + sectionType + "'] li").each((_, item) => {
                const link = $(item).find("a").attr("href");
                const title = $(item).find("a").text().trim();
                
                if (link && title) {
                const id = link.split("/manga/")[1];
                
                related_manga.push({
                    id: id,
                    title: title,
                    type: sectionType.toUpperCase()
                });
                }
            });
            }
        });

        const similar_manga = [];
        
        $(".side-manga .original.card-sm .unit").each((_, element) => {
            const link = $(element).attr("href");
            const title = $(element).find("h6").text().trim();
            
            if (link && title) {
            const id = link.split("/manga/")[1];
            
            similar_manga.push({
                id: id,
                title: title
            });
            }
        });

        const [similar_data, chapters] = await Promise.all([
            getSimilarMangaInfo(similar_manga),
            getChapters(mangaId)
        ]);
        
        return {
          id: mangaId,
          primaryTitle: title,
          secondaryTitles: altTitles,
          cover: image,
          synopsis: description,
          type: type,
          published,
          rating: rating,
          contentRating: ContentRating.EVERYONE,
          status: status,
          genres: genres,
          mal_id: mal_id,
          anilist_id: anilist_id,
          related: related_manga,
          similar: similar_data,
          chapters,
        };
    } catch (error) {
        console.error("Error extracting manga info:", error);
        throw new Error("Failed to extract manga information");
    }
}

/*
 * This function retrieves only name, id, and image and genres of a similar manga
 */
export async function getSimilarMangaInfo(similar_manga) {
    if (!Array.isArray(similar_manga)) {
        throw new Error("Invalid similar_manga data");
    }

    // For every item in similar_manga, request the manga info and return only name, id, image and genres
    const similarMangaInfoPromises = similar_manga.map(async (manga) => {
        try {
            const response = await axios.get(`${baseUrl}/manga/${manga.id}`, { headers });
            const $ = cheerio.load(response.data);
            const title = $(".manga-detail .info h1").text().trim();
            const image = $(".manga-detail .poster img").attr("src") || "";

            let rating = 1;

            const ratingValue = $("#info-rating .score .live-score").text().trim();
            if (ratingValue) {
              rating = parseFloat(ratingValue);
            }

            const genres = [];

            $("#info-rating .meta div").each((_, element) => {
                const label = $(element).find("span").first().text().trim();
                if (label === "Genres:") {
                  $(element)
                    .find("a")
                    .each((_, genreElement) => {
                      genres.push($(genreElement).text().trim());
                    });
                }
            });

            return {
                id: manga.id,
                primaryTitle: title,
                cover: image,
                genres: genres,
                rating: rating || null
            };
        } catch (error) {
            console.error(`Error retrieving info for manga ID ${manga.id}:`, error);
            return null;
        }
    });

    return Promise.all(similarMangaInfoPromises).then((results) => {
        const filteredResults = results.filter(Boolean);
        return filteredResults;
    });
}

/*
Function to get chapters from a manga page
This function retrieves the chapters from a manga page and returns them in an array.
*/
export async function getChapters(manga_id) {
    try {
      // Extract the actual ID part (e.g., rl2vm from jujutsu-kaisenn.rl2vm)
      const formattedId = manga_id.includes('.') ? manga_id.split('.')[1] : manga_id;
  
      const requests = ["read", "manga"].map(type => ({
        url: `${baseUrl}/ajax/${type}/${formattedId}/chapter/en`
      }));

      let result1 = null;
      let result2 = null;
      try {
          [result1, result2] = await Promise.all(
              requests.map(req => axios.get(req.url, { headers }))
            ).then(responses => responses.map(response => response.data)
          );
      } catch (error) {
          console.error(`Failed to fetch one or both chapter lists for ${manga_id}: ${error.message}`);
      }
  
      let $1 = null;
      let $2 = null;
  
      if (result1) {
          let htmlContent1 = null;
          if (typeof result1 === 'object' && result1?.result?.html) {
              htmlContent1 = result1.result.html;
          } else if (typeof result1 === 'string') {
              try {
                  const parsedResult1 = JSON.parse(result1);
                  if (parsedResult1?.result?.html) {
                      htmlContent1 = parsedResult1.result.html;
                  } else {
                      console.log(`Unexpected JSON structure or missing HTML in first chapter response for ${manga_id}`);
                  }
              } catch (e) {
                  console.log(`Failed to parse first chapter response as JSON for ${manga_id}. Assuming it might be HTML. Error: ${e.message}`);
                  htmlContent1 = result1;
              }
          }
  
          if (htmlContent1) {
              try {
                  $1 = cheerio.load(htmlContent1);
                  if (!$1('li').length) {
                      $1 = null; // Treat as empty if no list items found
                  }
              } catch (htmlError) {
                   console.error(`Failed to load first response HTML content with Cheerio for ${manga_id}: ${htmlError.message}`);
                   $1 = null;
              }
          } else if (typeof result1 !== 'string' && typeof result1 !== 'object') {
               console.log(`First chapter response for ${manga_id} was not a string or expected object structure.`);
          }
      }
  
      if (result2) {
          let htmlContent2 = null;
          if (typeof result2 === 'object') {
              htmlContent2 = typeof result2?.result === 'string' ? result2.result : result2?.result?.html;
          } else if (typeof result2 === 'string') {
               try {
                  const parsedResult2 = JSON.parse(result2);
                  htmlContent2 = typeof parsedResult2?.result === 'string' ? parsedResult2.result : parsedResult2?.result?.html;
              } catch (e) {
                  console.log(`Failed to parse second chapter response as JSON for ${manga_id}. Assuming it might be HTML. Error: ${e.message}`);
                  htmlContent2 = result2;
              }
          }
  
          if (htmlContent2) {
               try {
                  $2 = cheerio.load(htmlContent2);
                   if (!$2('li').length) {
                      $2 = null; // Treat as empty if no list items found
                  }
               } catch (htmlError) {
                   console.error(`Failed to load second response HTML content with Cheerio for ${manga_id}: ${htmlError.message}`);
                   $2 = null;
               }
          }
      }
  
      const timestampMap = new Map();
      const titleMap = new Map(); // Store titles separately
  
      if ($2) {
        $2('li').each((_, el) => {
          const li = $2(el);
          const chapterNumber = li.attr('data-number') || '0';
          const dateText = li.find('span').last().text().trim();
          const chapterTitle = li.find('span').first().text().trim() || `Chapter ${chapterNumber}`; // Fallback title
          if (chapterNumber !== '0') { // Avoid storing default '0' if attr missing
              timestampMap.set(chapterNumber, dateText);
              titleMap.set(chapterNumber, chapterTitle);
          }
        });
      }
  
      const chapters = [];
  
      if ($1) {
        $1('li').each((_, el) => {
          const li = $1(el);
          const link = li.find('a');
          const chapterNumber = link.attr('data-number') || '0';
          const chapterId = link.attr('data-id'); // Get the specific chapter ID if available
          const chapterUrl = link.attr('href');
          const timestamp = timestampMap.get(chapterNumber);
  
          let title = titleMap.get(chapterNumber) || link.find('span').first().text().trim() || `Chapter ${chapterNumber}`;
  
          const titleFromFirstResponse = link.find('span').first().text().trim();
          if (titleFromFirstResponse && titleFromFirstResponse.length > title.length) {
              title = titleFromFirstResponse;
          }
  
          if (chapterUrl && chapterNumber !== '0') { // Ensure we have a URL and valid chapter number
            chapters.push({
              id: chapterId,
              chapter: parseFloat(chapterNumber), // Store as number for sorting
              title: title,
              publishedAt: timestamp ? convertToISO8601(timestamp) : new Date().toISOString(), // Use helper
              url: baseUrl + chapterUrl
            });
          }
        });
      }
  
  
      chapters.sort((a, b) => b.chapter - a.chapter);
  
      return chapters;
    } catch (error) {
      console.error(`Error getting chapters for manga ${manga_id}: ${error.message}`);
      throw new Error(`Failed to get chapters for ${manga_id}: ${error.message}`);
    }
}