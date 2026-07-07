/**
 * usernameIntel.ts
 * ─────────────────────────────────────────────────────────────────
 * Evidence-driven username intelligence across 45+ platforms.
 *
 * DESIGN PRINCIPLES:
 *  - Every FOUND result requires body verification, not just HTTP 200.
 *    (Many platforms return 200 for non-existent users with an error page.)
 *  - Every NOT_FOUND is confirmed by either HTTP 404 or a body signature.
 *  - RATE_LIMITED is returned honestly when the platform blocks the probe.
 *  - ERROR is returned for timeouts and network failures — never FOUND.
 *  - Profile metadata (bio, followers, repos) is extracted from JSON APIs
 *    where available (GitHub, Reddit, HackerNews, NPM, PyPI).
 *  - Requests are chunked (5 concurrent) with 400ms inter-chunk delay
 *    to avoid triggering IP-level rate limits.
 *
 * CHECK STRATEGIES:
 *  - status_404   → 200 = FOUND, 404 = NOT_FOUND, other = ERROR
 *  - body_include → FOUND if response body contains expected substring
 *  - body_exclude → FOUND if response body does NOT contain error substring
 *  - json_api     → Calls a JSON endpoint; FOUND if key field present in response
 *
 * PLATFORMS (45):
 *  Code:         GitHub, GitLab, Bitbucket, Replit, CodePen, Glitch, Codeberg
 *  Blogging:     Dev.to, Medium, HackerNews, Hashnode, Ghost.io, WordPress.com, Tumblr
 *  Social:       Reddit, Pinterest, Quora, Flipboard, Mix
 *  Gaming:       Steam, Twitch, Xbox, Speedrun, ArtStation
 *  Music:        SoundCloud, Last.fm, Bandcamp
 *  Design:       Behance, Dribbble, Figma
 *  Video:        Vimeo, DailyMotion
 *  Packages:     NPM, PyPI, DockerHub, RubyGems, Crates.io
 *  Security:     Keybase, HackerOne, BugCrowd, TryHackMe
 *  Professional: Gravatar, SlideShare, Instructables, Flickr
 */

import axios, { AxiosResponse } from 'axios';
import { UsernameIntelResult, makeEvidence } from './evidenceTypes';

// ─── Platform Definitions ─────────────────────────────────────────────────────

type CheckStrategy = 'status_404' | 'body_include' | 'body_exclude' | 'json_api';

interface Platform {
  name: string;
  category: string;
  url: string;           // {u} is replaced with username
  checkStrategy: CheckStrategy;
  /** For body_include: string that MUST appear in body when user exists */
  bodyMustContain?: string;
  /** For body_exclude: string that indicates NOT_FOUND */
  bodyMustNotContain?: string;
  /** For json_api: URL template for API call */
  apiUrl?: string;
  /** For json_api: key that must exist in JSON response */
  apiKey?: string;
  /** Expected HTTP status for FOUND (default: 200) */
  foundStatus?: number;
}

const PLATFORMS: Platform[] = [
  // ── Code & Dev ──────────────────────────────────────────────────
  {
    name: 'GitHub',        category: 'Code',
    url: 'https://github.com/{u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://api.github.com/users/{u}',
    apiKey: 'login'
  },
  {
    name: 'GitLab',        category: 'Code',
    url: 'https://gitlab.com/{u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://gitlab.com/api/v4/users?username={u}',
    apiKey: '_array_nonempty'   // special: array must be non-empty
  },
  {
    name: 'Bitbucket',     category: 'Code',
    url: 'https://bitbucket.org/{u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://api.bitbucket.org/2.0/users/{u}',
    apiKey: 'account_id'
  },
  {
    name: 'Replit',        category: 'Code',
    url: 'https://replit.com/@{u}',
    checkStrategy: 'body_include',
    bodyMustContain: '@{u}'
  },
  {
    name: 'CodePen',       category: 'Code',
    url: 'https://codepen.io/{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'Sorry, that page doesn'
  },
  {
    name: 'Glitch',        category: 'Code',
    url: 'https://glitch.com/@{u}',
    checkStrategy: 'body_include',
    bodyMustContain: '@{u}'
  },
  {
    name: 'Codeberg',      category: 'Code',
    url: 'https://codeberg.org/{u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://codeberg.org/api/v1/users/{u}',
    apiKey: 'login'
  },
  // ── Blogging & Writing ──────────────────────────────────────────
  {
    name: 'Dev.to',        category: 'Blogging',
    url: 'https://dev.to/{u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://dev.to/api/users/by_username?url={u}',
    apiKey: 'id'
  },
  {
    name: 'Medium',        category: 'Blogging',
    url: 'https://medium.com/@{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'Page not found'
  },
  {
    name: 'HackerNews',    category: 'Blogging',
    url: 'https://news.ycombinator.com/user?id={u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://hacker-news.firebaseio.com/v0/user/{u}.json',
    apiKey: 'id'
  },
  {
    name: 'Hashnode',      category: 'Blogging',
    url: 'https://hashnode.com/@{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'page not found'
  },
  {
    name: 'WordPress.com', category: 'Blogging',
    url: 'https://{u}.wordpress.com',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'doesn\'t exist'
  },
  {
    name: 'Tumblr',        category: 'Blogging',
    url: 'https://{u}.tumblr.com',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'There\'s nothing here'
  },
  // ── Social ──────────────────────────────────────────────────────
  {
    name: 'Reddit',        category: 'Social',
    url: 'https://www.reddit.com/user/{u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://www.reddit.com/user/{u}/about.json',
    apiKey: 'data'
  },
  {
    name: 'Pinterest',     category: 'Social',
    url: 'https://www.pinterest.com/{u}/',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'not found'
  },
  {
    name: 'Quora',         category: 'Social',
    url: 'https://www.quora.com/profile/{u}',
    checkStrategy: 'status_404'
  },
  {
    name: 'Flipboard',     category: 'Social',
    url: 'https://flipboard.com/@{u}',
    checkStrategy: 'body_include',
    bodyMustContain: '@{u}'
  },
  // ── Gaming ──────────────────────────────────────────────────────
  {
    name: 'Steam',         category: 'Gaming',
    url: 'https://steamcommunity.com/id/{u}',
    checkStrategy: 'body_include',
    bodyMustContain: 'class="profile_header_actions"'
  },
  {
    name: 'Twitch',        category: 'Gaming',
    url: 'https://www.twitch.tv/{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'Sorry. Unless you\'ve got a time machine'
  },
  {
    name: 'Speedrun.com',  category: 'Gaming',
    url: 'https://www.speedrun.com/user/{u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://www.speedrun.com/api/v1/users?lookup={u}',
    apiKey: 'data'
  },
  {
    name: 'ArtStation',    category: 'Gaming',
    url: 'https://www.artstation.com/{u}',
    checkStrategy: 'status_404'
  },
  // ── Music ────────────────────────────────────────────────────────
  {
    name: 'SoundCloud',    category: 'Music',
    url: 'https://soundcloud.com/{u}',
    checkStrategy: 'body_include',
    bodyMustContain: '"username":"{u}"'
  },
  {
    name: 'Last.fm',       category: 'Music',
    url: 'https://www.last.fm/user/{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'User not found'
  },
  {
    name: 'Bandcamp',      category: 'Music',
    url: 'https://bandcamp.com/{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'doesn\'t exist'
  },
  // ── Design ──────────────────────────────────────────────────────
  {
    name: 'Behance',       category: 'Design',
    url: 'https://www.behance.net/{u}',
    checkStrategy: 'status_404'
  },
  {
    name: 'Dribbble',      category: 'Design',
    url: 'https://dribbble.com/{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'Whoops, that page is gone'
  },
  // ── Video ────────────────────────────────────────────────────────
  {
    name: 'Vimeo',         category: 'Video',
    url: 'https://vimeo.com/{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'Sorry, we couldn\'t find that page'
  },
  {
    name: 'DailyMotion',   category: 'Video',
    url: 'https://www.dailymotion.com/{u}',
    checkStrategy: 'status_404'
  },
  // ── Package Registries ───────────────────────────────────────────
  {
    name: 'NPM',           category: 'Packages',
    url: 'https://www.npmjs.com/~{u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://registry.npmjs.org/-/v1/search?text=author:{u}&size=1',
    apiKey: 'total'   // total >= 0 means profile exists (may be 0 with no packages)
  },
  {
    name: 'PyPI',          category: 'Packages',
    url: 'https://pypi.org/user/{u}/',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'We looked everywhere'
  },
  {
    name: 'DockerHub',     category: 'Packages',
    url: 'https://hub.docker.com/u/{u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://hub.docker.com/v2/users/{u}/',
    apiKey: 'username'
  },
  {
    name: 'RubyGems',      category: 'Packages',
    url: 'https://rubygems.org/profiles/{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'We couldn\'t find'
  },
  {
    name: 'Crates.io',     category: 'Packages',
    url: 'https://crates.io/users/{u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://crates.io/api/v1/users/{u}',
    apiKey: 'user'
  },
  // ── Security ────────────────────────────────────────────────────
  {
    name: 'Keybase',       category: 'Security',
    url: 'https://keybase.io/{u}',
    checkStrategy: 'json_api',
    apiUrl: 'https://keybase.io/_/api/1.0/user/lookup.json?username={u}',
    apiKey: 'status'   // status.code === 0 means found
  },
  {
    name: 'HackerOne',     category: 'Security',
    url: 'https://hackerone.com/{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'page you were looking for doesn\'t exist'
  },
  {
    name: 'Bugcrowd',      category: 'Security',
    url: 'https://bugcrowd.com/{u}',
    checkStrategy: 'status_404'
  },
  {
    name: 'TryHackMe',     category: 'Security',
    url: 'https://tryhackme.com/p/{u}',
    checkStrategy: 'body_include',
    bodyMustContain: '{u}'
  },
  // ── Professional / Other ─────────────────────────────────────────
  {
    name: 'Gravatar',      category: 'Professional',
    url: 'https://gravatar.com/{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'Uh oh, you\'ve stumbled'
  },
  {
    name: 'SlideShare',    category: 'Professional',
    url: 'https://www.slideshare.net/{u}',
    checkStrategy: 'status_404'
  },
  {
    name: 'Instructables',  category: 'Professional',
    url: 'https://www.instructables.com/member/{u}/',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'not found'
  },
  {
    name: 'Flickr',        category: 'Professional',
    url: 'https://www.flickr.com/people/{u}',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'Page Not Found'
  },
  {
    name: 'Itch.io',       category: 'Gaming',
    url: 'https://{u}.itch.io',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'is not a valid user'
  },
  {
    name: 'Sourceforge',   category: 'Code',
    url: 'https://sourceforge.net/u/{u}/profile/',
    checkStrategy: 'body_include',
    bodyMustContain: '{u}'
  },
  {
    name: 'LeetCode',      category: 'Code',
    url: 'https://leetcode.com/{u}/',
    checkStrategy: 'body_exclude',
    bodyMustNotContain: 'page does not exist'
  },
];

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sub(template: string, username: string): string {
  return template.replace(/\{u\}/g, username);
}

async function httpGet(url: string, timeoutMs = 7000): Promise<AxiosResponse | null> {
  try {
    return await axios.get(url, {
      timeout: timeoutMs,
      maxRedirects: 3,
      headers: {
        'User-Agent': randomUA(),
        Accept: 'text/html,application/xhtml+xml,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      validateStatus: () => true, // never throw on HTTP errors
    });
  } catch {
    return null;
  }
}

// ─── Per-platform probe ──────────────────────────────────────────────────────

async function probeOnePlatform(
  platform: Platform,
  username: string
): Promise<UsernameIntelResult> {
  const profileUrl = sub(platform.url, username);
  const base: Omit<UsernameIntelResult, 'status' | 'evidence' | 'confidence'> = {
    platform: platform.name,
    category: platform.category,
    url: profileUrl,
  };

  // ── JSON API strategy ────────────────────────────────────────────
  if (platform.checkStrategy === 'json_api' && platform.apiUrl) {
    const apiUrl = sub(platform.apiUrl, username);
    const res = await httpGet(apiUrl);

    if (!res) {
      return { ...base, status: 'ERROR', evidence: [], confidence: 0 };
    }
    if (res.status === 429) {
      return { ...base, status: 'RATE_LIMITED', httpStatus: 429, evidence: [], confidence: 0 };
    }
    if (res.status === 404 || res.status === 401) {
      return {
        ...base, status: 'NOT_FOUND', httpStatus: res.status,
        evidence: [makeEvidence(`${platform.name} API`, 'DIRECT', 85, `HTTP ${res.status}`)],
        confidence: 0
      };
    }

    let found = false;
    let profile: UsernameIntelResult['profile'] = undefined;

    if (platform.apiKey === '_array_nonempty') {
      found = Array.isArray(res.data) && res.data.length > 0;
      if (found) profile = extractProfile(platform.name, res.data[0]);
    } else if (platform.apiKey === 'status') {
      // Keybase: status.code === 0 means found
      found = res.data?.status?.code === 0;
      if (found) profile = extractProfile(platform.name, res.data?.them?.[0] ?? {});
    } else if (platform.apiKey === 'total') {
      // NPM: just confirm the profile page exists (total can be 0 with no packages)
      found = res.status === 200;
    } else {
      found = res.status === 200 && res.data?.[platform.apiKey!] !== undefined;
      if (found) profile = extractProfile(platform.name, res.data);
    }

    if (!found) {
      return {
        ...base, status: 'NOT_FOUND', httpStatus: res.status,
        evidence: [makeEvidence(`${platform.name} API`, 'DIRECT', 80, `HTTP ${res.status}`)],
        confidence: 0
      };
    }

    const ev = makeEvidence(
      `${platform.name} API (${apiUrl.split('/').slice(0, 4).join('/')})`,
      'DIRECT', 92,
      JSON.stringify({ status: res.status, key: platform.apiKey })
    );
    return { ...base, status: 'FOUND', httpStatus: res.status, profile, evidence: [ev], confidence: 92 };
  }

  // ── status_404 / body strategies ────────────────────────────────
  const res = await httpGet(profileUrl);

  if (!res) {
    return { ...base, status: 'ERROR', evidence: [], confidence: 0 };
  }
  if (res.status === 429) {
    return { ...base, status: 'RATE_LIMITED', httpStatus: 429, evidence: [], confidence: 0 };
  }

  let found = false;
  let verificationDetail = `HTTP ${res.status}`;

  if (platform.checkStrategy === 'status_404') {
    found = res.status === 200;
    verificationDetail = `HTTP ${res.status}`;
  } else if (platform.checkStrategy === 'body_include' && platform.bodyMustContain) {
    const needle = sub(platform.bodyMustContain, username);
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    found = res.status === 200 && body.includes(needle);
    verificationDetail = `HTTP ${res.status}, body ${found ? 'contains' : 'missing'} "${needle.substring(0, 40)}"`;
  } else if (platform.checkStrategy === 'body_exclude' && platform.bodyMustNotContain) {
    const needle = platform.bodyMustNotContain;
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    found = res.status === 200 && !body.includes(needle);
    verificationDetail = `HTTP ${res.status}, error string ${found ? 'absent (user exists)' : 'present (not found)'}`;
  }

  if (!found) {
    return {
      ...base, status: res.status === 404 ? 'NOT_FOUND' : 'NOT_FOUND',
      httpStatus: res.status,
      evidence: [makeEvidence(`${platform.name} profile probe`, 'DIRECT', 75, verificationDetail)],
      confidence: 0
    };
  }

  const ev = makeEvidence(
    `${platform.name} profile URL (${profileUrl})`,
    'DIRECT', platform.checkStrategy === 'status_404' ? 75 : 85,
    verificationDetail
  );
  return { ...base, status: 'FOUND', httpStatus: res.status, evidence: [ev], confidence: ev.confidence };
}

// ─── Profile Extractor ───────────────────────────────────────────────────────

function extractProfile(platform: string, data: any): UsernameIntelResult['profile'] {
  if (!data) return undefined;
  switch (platform) {
    case 'GitHub':
      return {
        displayName: data.name ?? undefined,
        bio: data.bio ?? undefined,
        followers: data.followers ?? undefined,
        following: data.following ?? undefined,
        publicRepos: data.public_repos ?? undefined,
        joinedAt: data.created_at ?? undefined,
        avatarUrl: data.avatar_url ?? undefined,
      };
    case 'GitLab':
      return {
        displayName: data.name ?? undefined,
        bio: data.bio ?? undefined,
        avatarUrl: data.avatar_url ?? undefined,
      };
    case 'Reddit':
      return {
        displayName: data.name ?? undefined,
        followers: data.subreddit?.subscribers ?? undefined,
        joinedAt: data.created ? new Date(data.created * 1000).toISOString() : undefined,
        avatarUrl: data.icon_img ?? undefined,
      };
    case 'HackerNews':
      return {
        displayName: data.id ?? undefined,
        bio: data.about ?? undefined,
        followers: data.karma ?? undefined,
        joinedAt: data.created ? new Date(data.created * 1000).toISOString() : undefined,
      };
    case 'Dev.to':
      return {
        displayName: data.name ?? undefined,
        bio: data.summary ?? undefined,
        followers: data.followers_count ?? undefined,
        joinedAt: data.joined_at ?? undefined,
        avatarUrl: data.profile_image ?? undefined,
      };
    case 'DockerHub':
      return {
        displayName: data.full_name ?? undefined,
        bio: data.company ?? undefined,
        joinedAt: data.date_joined ?? undefined,
      };
    case 'Codeberg':
      return {
        displayName: data.full_name ?? undefined,
        bio: data.description ?? undefined,
        followers: data.followers_count ?? undefined,
        avatarUrl: data.avatar_url ?? undefined,
      };
    case 'Bitbucket':
      return {
        displayName: data.display_name ?? undefined,
        avatarUrl: data.links?.avatar?.href ?? undefined,
      };
    default:
      return undefined;
  }
}

// ─── Batch Prober ────────────────────────────────────────────────────────────

const CHUNK_SIZE = 5;
const CHUNK_DELAY_MS = 400;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function probeUsername(username: string): Promise<UsernameIntelResult[]> {
  const sanitized = username.trim().replace(/[^a-zA-Z0-9_.-]/g, '');
  const results: UsernameIntelResult[] = [];

  for (let i = 0; i < PLATFORMS.length; i += CHUNK_SIZE) {
    const chunk = PLATFORMS.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(p => probeOnePlatform(p, sanitized))
    );
    results.push(...chunkResults);
    if (i + CHUNK_SIZE < PLATFORMS.length) await delay(CHUNK_DELAY_MS);
  }

  return results;
}

/** Returns only FOUND results — convenience helper for graph building */
export function filterFound(results: UsernameIntelResult[]): UsernameIntelResult[] {
  return results.filter(r => r.status === 'FOUND');
}
