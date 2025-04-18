/* 
Utils for mangafire extractor
*/

export const baseUrl = 'https://mangafire.to';

export const headers = {
    'referer': 'https://mangafire.to/',
    'origin': 'https://mangafire.to',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
}

export function convertToISO8601(dateText) {
    const now = new Date();
  
    if (!dateText?.trim()) return now.toISOString();
  
    if (/^yesterday$/i.test(dateText)) {
      now.setDate(now.getDate() - 1);
      return now.toISOString();
    }
  
    const relativeMatch = dateText.match(
      /(\d+)\s+(second|minute|hour|day)s?\s+ago/i,
    );
    if (relativeMatch) {
      const [_, value, unit] = relativeMatch;
      switch (unit.toLowerCase()) {
        case "second":
          now.setSeconds(now.getSeconds() - +value);
          break;
        case "minute":
          now.setMinutes(now.getMinutes() - +value);
          break;
        case "hour":
          now.setHours(now.getHours() - +value);
          break;
        case "day":
          now.setDate(now.getDate() - +value);
          break;
      }
      return now.toISOString();
    }
  
    const parsedDate = new Date(dateText);
    return isNaN(parsedDate.getTime())
      ? now.toISOString()
      : parsedDate.toISOString();
  }