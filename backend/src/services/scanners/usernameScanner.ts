import axios from 'axios';

interface Platform {
  name: string;
  urlTemplate: string;
  category: string;
  checkType: 'status' | 'body_exclude' | 'body_include';
  signature?: string; // string to look for/exclude
}

const PLATFORMS: Platform[] = [
  { name: 'GitHub', urlTemplate: 'https://github.com/{username}', category: 'Coding', checkType: 'status' },
  { name: 'GitLab', urlTemplate: 'https://gitlab.com/{username}', category: 'Coding', checkType: 'status' },
  { name: 'Reddit', urlTemplate: 'https://www.reddit.com/user/{username}', category: 'Social', checkType: 'status' },
  { name: 'Medium', urlTemplate: 'https://medium.com/@{username}', category: 'Blogging', checkType: 'status' },
  { name: 'Dev.to', urlTemplate: 'https://dev.to/{username}', category: 'Blogging', checkType: 'status' },
  { name: 'HackerNews', urlTemplate: 'https://news.ycombinator.com/user?id={username}', category: 'Coding', checkType: 'body_include', signature: 'karma:' },
  { name: 'Pinterest', urlTemplate: 'https://www.pinterest.com/{username}/', category: 'Social', checkType: 'status' },
  { name: 'Spotify', urlTemplate: 'https://open.spotify.com/user/{username}', category: 'Entertainment', checkType: 'status' },
  { name: 'Steam', urlTemplate: 'https://steamcommunity.com/id/{username}', category: 'Gaming', checkType: 'body_include', signature: 'Steam Community' },
  { name: 'Behance', urlTemplate: 'https://www.behance.net/{username}', category: 'Design', checkType: 'status' },
  { name: 'Dribbble', urlTemplate: 'https://dribbble.com/{username}', category: 'Design', checkType: 'status' },
  { name: 'SoundCloud', urlTemplate: 'https://soundcloud.com/{username}', category: 'Entertainment', checkType: 'status' },
  { name: 'Vimeo', urlTemplate: 'https://vimeo.com/{username}', category: 'Entertainment', checkType: 'status' },
  { name: 'SlideShare', urlTemplate: 'https://www.slideshare.net/{username}', category: 'Professional', checkType: 'status' },
  { name: 'Keybase', urlTemplate: 'https://keybase.io/{username}', category: 'Security', checkType: 'status' },
  { name: 'WordPress', urlTemplate: 'https://{username}.wordpress.com', category: 'Blogging', checkType: 'status' },
  { name: 'Tumblr', urlTemplate: 'https://{username}.tumblr.com', category: 'Blogging', checkType: 'status' },
  { name: 'Twitch', urlTemplate: 'https://www.twitch.tv/{username}', category: 'Gaming', checkType: 'status' },
  { name: 'Quora', urlTemplate: 'https://www.quora.com/profile/{username}', category: 'Social', checkType: 'status' },
  { name: 'Instructables', urlTemplate: 'https://www.instructables.com/member/{username}/', category: 'Social', checkType: 'status' }
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

export interface UsernameScanResult {
  platform: string;
  url: string;
  category: string;
  found: boolean;
  status: 'FOUND' | 'NOT_FOUND' | 'ERROR' | 'BLOCKED';
  details?: string;
}

export async function probeUsername(username: string): Promise<UsernameScanResult[]> {
  const sanitizedUsername = encodeURIComponent(username.trim());
  
  // Throttle helper: run requests in chunks to prevent IP block
  const results: UsernameScanResult[] = [];
  const chunkSize = 5;

  for (let i = 0; i < PLATFORMS.length; i += chunkSize) {
    const chunk = PLATFORMS.slice(i, i + chunkSize);
    const promises = chunk.map(async (platform) => {
      const url = platform.urlTemplate.replace('{username}', sanitizedUsername);
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
          },
          timeout: 4000,
          validateStatus: () => true // Resolve promise for all status codes
        });

        const status = response.status;

        // Rate limiting or Cloudflare blocking
        if (status === 429 || status === 403) {
          return {
            platform: platform.name,
            url,
            category: platform.category,
            found: false,
            status: 'BLOCKED' as const,
            details: `HTTP ${status} - Blocked or Rate Limited`
          };
        }

        if (platform.checkType === 'status') {
          const found = status === 200;
          return {
            platform: platform.name,
            url,
            category: platform.category,
            found,
            status: found ? ('FOUND' as const) : ('NOT_FOUND' as const)
          };
        } else if (platform.checkType === 'body_include' && platform.signature) {
          const found = status === 200 && response.data.includes(platform.signature);
          return {
            platform: platform.name,
            url,
            category: platform.category,
            found,
            status: found ? ('FOUND' as const) : ('NOT_FOUND' as const)
          };
        } else if (platform.checkType === 'body_exclude' && platform.signature) {
          const found = status === 200 && !response.data.includes(platform.signature);
          return {
            platform: platform.name,
            url,
            category: platform.category,
            found,
            status: found ? ('FOUND' as const) : ('NOT_FOUND' as const)
          };
        }

        return {
          platform: platform.name,
          url,
          category: platform.category,
          found: false,
          status: 'NOT_FOUND' as const
        };
      } catch (error: any) {
        return {
          platform: platform.name,
          url,
          category: platform.category,
          found: false,
          status: 'ERROR' as const,
          details: error.message || 'Request Timeout'
        };
      }
    });

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
  }

  return results;
}
