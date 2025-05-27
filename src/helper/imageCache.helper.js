import axios from 'axios';
import { getCachedData, setCachedData } from './cache.helper.js';
import { API_CONFIG } from '../configs/api.config.js';

// Headers specifically for image requests
const IMAGE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://mangafire.to/',
  'Sec-Fetch-Dest': 'image',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'cross-site',
  'Pragma': 'no-cache',
  'Cache-Control': 'no-cache'
};

export async function cacheImage(imageUrl) {
  try {
    const urlHash = Buffer.from(imageUrl).toString('base64url');
    const cacheKey = `img_${urlHash}`;
    
    const cachedImage = await getCachedData(cacheKey);
    if (cachedImage) {
      return `${API_CONFIG.BASE_URL}/api/image/${urlHash}`;
    }

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: IMAGE_HEADERS,
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: status => status < 500
    });

    const contentType = response.headers['content-type'];
    const imageData = {
      contentType,
      data: response.data
    };

    await setCachedData(cacheKey, imageData, 3600000);
    return `${API_CONFIG.BASE_URL}/api/image/${urlHash}`;
  } catch (error) {
    console.error('Error caching image:', error.message);
    return imageUrl;
  }
}
