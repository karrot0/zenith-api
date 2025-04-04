import axios from "axios";
import * as cheerio from "cheerio";
import baseUrl from "../utils/baseUrl.js";
import { getCharacterByName } from "./mal.extractor.js";

// Function to fetch MAL data for a character
async function fetchMalData(characterName, animeTitle) {
  try {
    console.log(`[Character Extractor] Fetching MAL data for: ${characterName} from ${animeTitle || 'any anime'}`);
    const malData = await getCharacterByName(characterName, animeTitle);
    return malData;
  } catch (error) {
    console.error("[Character Extractor] Error fetching MAL data:", error);
    return null;
  }
}

export async function extractCharacter(id) {
  try {
    const response = await axios.get(`${baseUrl}/character/${id}`);
    const $ = cheerio.load(response.data);

    // Extract basic information
    const name = $(".apw-detail .name").text().trim();
    const japaneseName = $(".apw-detail .sub-name").text().trim();
    
    // Extract profile image
    const profile = $(".avatar-circle img").attr("src");

    // Extract about information
    const bioText = $("#bio .bio").text().trim();
    const bioHtml = $("#bio .bio").html();
    const about = {
      description: bioText,
      style: bioHtml
    };

    // Extract voice actors
    const voiceActors = [];
    $("#voiactor .per-info").each((_, element) => {
      const voiceActorElement = $(element);
      
      const voiceActor = {
        name: voiceActorElement.find(".pi-name a").text().trim(),
        profile: voiceActorElement.find(".pi-avatar img").attr("src")
          ?.replace(/\/thumbnail\/\d+x\d+\//, '/thumbnail/1920x1080/'),
        language: voiceActorElement.find(".pi-cast").text().trim(),
        id: voiceActorElement.find(".pi-name a").attr("href")?.split("/").pop()
      };
      
      if (voiceActor.name && voiceActor.id) {
        voiceActors.push(voiceActor);
      }
    });

    // Extract animeography
    const animeography = [];
    console.log("Extracting animeography...");
    $(".anif-block-ul li").each((_, el) => {
      const item = $(el);
      const title = item.find(".film-name a").text().trim();
      const id = item.find(".film-name a").attr("href")?.split("/").pop();
      const role = item.find(".fdi-item").first().text().trim();
      const type = item.find(".fdi-item").last().text().trim();
      const poster = (item.find(".film-poster img").attr("data-src") || "")
        .replace(/\/thumbnail\/\d+x\d+\//, '/thumbnail/1920x1080/');
      
      if (title && id) {
        animeography.push({
          title,
          id,
          role: role.replace(" (Role)", ""), 
          type,
          poster
        });
      }
    });

    console.log(`Found ${animeography.length} animeography items`);

    // Get MAL data if we have a name and at least one anime title
    let malData = null;
    if (name && animeography.length > 0) {
      // Use the first anime title as a reference for MAL search
      const primaryAnime = animeography[0].title;
      malData = await fetchMalData(name, primaryAnime);
    }

    // Construct the final response
    const characterData = {
      success: true,
      results: {
        data: [{
          id,
          name,
          profile,
          japaneseName,
          about,
          voiceActors,
          animeography,
          mal: malData
        }]
      }
    };

    return characterData;

  } catch (error) {
    console.error("Error extracting character data:", error);
    throw new Error("Failed to extract character information");
  }
}

// Add a standalone function to get MAL character data directly
export async function getMalCharacterData(name, anime) {
  try {
    return await getCharacterByName(name, anime);
  } catch (error) {
    console.error("Error getting MAL character data:", error);
    throw new Error("Failed to retrieve MAL character data");
  }
}

export default extractCharacter;