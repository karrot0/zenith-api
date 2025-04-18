/* 
Utils for mangafire extractor
*/

export const baseUrl = 'https://mangafire.to';

export const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Referer': 'https://mangafire.to/',
  'Sec-Ch-Ua': '"Brave";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-GPC': '1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
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