import axios from 'axios';
import { CONFIG } from '../../config';

export interface FaceMatch {
  url: string;
  source: string; // e.g. "LinkedIn", "Twitter", "GitHub"
  similarity: number; // 0 to 100
  thumbnailUrl: string;
  title: string;
}

export interface ImageScanResult {
  faceCheckMatches: FaceMatch[];
  reverseSearchLinks: {
    engine: string;
    searchUrl: string;
    description: string;
  }[];
  isSimulated: boolean;
}

export async function scanFaceImage(imageBuffer: Buffer, fileName: string, avatarUrl?: string): Promise<ImageScanResult> {
  const apiKey = CONFIG.FACECHECK_API_KEY;
  const isSimulated = !apiKey;

  const reverseSearchLinks = generateReverseSearchLinks(avatarUrl || '');

  // 1. If no key, return simulated results (as requested for scratch setup)
  if (isSimulated) {
    const mockMatches: FaceMatch[] = [
      {
        url: 'https://linkedin.com/in/johndoe-privacy-test',
        source: 'LinkedIn',
        similarity: 98.4,
        thumbnailUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
        title: 'John Doe | Senior Software Engineer'
      },
      {
        url: 'https://github.com/johndoe-code',
        source: 'GitHub',
        similarity: 92.1,
        thumbnailUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
        title: 'johndoe-code (John Doe)'
      },
      {
        url: 'https://twitter.com/johndoe_tweets',
        source: 'Twitter/X',
        similarity: 89.5,
        thumbnailUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
        title: 'John Doe (@johndoe_tweets)'
      }
    ];

    return {
      faceCheckMatches: mockMatches,
      reverseSearchLinks,
      isSimulated: true
    };
  }

  // 2. Real FaceCheck.ID API integration
  try {
    // Phase A: Upload Picture to FaceCheck.ID
    // Typically POST multipart form containing the image
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('images', blob, fileName);

    const uploadResponse = await axios.post('https://facecheck.id/api/upload_pic', formData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'multipart/form-data'
      },
      timeout: 10000
    });

    const searchId = uploadResponse.data.id_search;
    if (!searchId) {
      throw new Error('Failed to get search ID from FaceCheck.ID upload response');
    }

    // Phase B: Start Search and Retrieve matches
    // In production, FaceCheck.ID performs searches asynchronously. We trigger progress queries
    let searchResponse = await axios.post(
      'https://facecheck.id/api/search',
      { id_search: searchId, id_profile: 0, status_only: false },
      {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 5000
      }
    );

    // If search is still processing, wait and poll once
    if (searchResponse.data.progress < 100) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      searchResponse = await axios.post(
        'https://facecheck.id/api/search',
        { id_search: searchId, id_profile: 0, status_only: false },
        {
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );
    }

    const items = searchResponse.data.items || [];
    const faceCheckMatches: FaceMatch[] = items.map((item: any) => ({
      url: item.url,
      source: extractDomainName(item.url),
      similarity: parseFloat((item.score * 10).toFixed(1)), // Scale score to percentage
      thumbnailUrl: item.base64 || '',
      title: item.title || 'Exposed Profile'
    }));

    return {
      faceCheckMatches,
      reverseSearchLinks,
      isSimulated: false
    };
  } catch (error: any) {
    console.error('Error invoking FaceCheck.ID API:', error.message || error);
    // Graceful fallback to simulated results on API failure
    return {
      faceCheckMatches: [],
      reverseSearchLinks,
      isSimulated: true
    };
  }
}

// SmartImage compilation: creates reverse search paths for standard engines
function generateReverseSearchLinks(url: string) {
  const encodedUrl = encodeURIComponent(url);
  return [
    {
      engine: 'Google Lens / Images',
      searchUrl: url 
        ? `https://lens.google.com/uploadbyurl?url=${encodedUrl}` 
        : 'https://images.google.com',
      description: 'Find similar avatars or images indexed across Google\'s global image index.'
    },
    {
      engine: 'TinEye',
      searchUrl: url 
        ? `https://tineye.com/search?url=${encodedUrl}` 
        : 'https://tineye.com',
      description: 'Dedicated reverse search engine optimized for finding exact visuals and profile picture duplicates.'
    },
    {
      engine: 'Yandex Images',
      searchUrl: url 
        ? `https://yandex.com/images/search?rpt=imageview&url=${encodedUrl}` 
        : 'https://yandex.com/images',
      description: 'Highly effective facial geometry and image context reverse engine covering global profiles.'
    },
    {
      engine: 'SauceNAO',
      searchUrl: url 
        ? `https://saucenao.com/search.php?url=${encodedUrl}` 
        : 'https://saucenao.com',
      description: 'Useful for identifying anime or illustrated avatars used as profiles to discover original sources.'
    }
  ];
}

function extractDomainName(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace('www.', '');
  } catch {
    return 'Web Profile';
  }
}
