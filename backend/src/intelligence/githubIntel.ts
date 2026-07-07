/**
 * githubIntel.ts
 * ─────────────────────────────────────────────────────────────────
 * Deep evidence-driven GitHub Profile intelligence.
 *
 * DATA SOURCES:
 *  1. GitHub REST API v3 (api.github.com)
 *     → Profiles: /users/{username}
 *     → Orgs: /users/{username}/orgs
 *     → Repos: /users/{username}/repos?per_page=100
 *     → Commit Email Discovery: /repos/{owner}/{repo}/commits?author={username}&per_page=10
 *
 * RATE LIMITS & AUTH:
 *  - Unauthenticated: 60 req/hour (rate limits quickly on commit search).
 *  - Authenticated: 5000 req/hour if GITHUB_TOKEN is defined in .env.
 *  - Gracefully handles 403 / 429 rate limit responses without crashing.
 *
 * EMAIL RECOVERY OSINT:
 *  - Loops through up to 5 of the user's most recently active public repositories.
 *  - Fetches recent commits where the user is the author.
 *  - Inspects the git author & committer blocks for real emails.
 *  - Excludes standard GitHub anonymous emails (*@users.noreply.github.com).
 */

import axios from 'axios';
import {
  GitHubIntelResult,
  EvidenceItem,
  makeEvidence,
  computeConfidence
} from './evidenceTypes';

const GITHUB_API_URL = 'https://api.github.com';

// ─── Headers helper ──────────────────────────────────────────────────────────

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'digital-footprint-osint-platform'
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ─── Main Scanner ────────────────────────────────────────────────────────────

export async function scanGitHub(username: string): Promise<GitHubIntelResult | null> {
  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9_.-]/g, '');
  const headers = getHeaders();
  const evidence: EvidenceItem[] = [];

  try {
    // 1. Fetch user profile metadata
    const profileRes = await axios.get(`${GITHUB_API_URL}/users/${cleanUsername}`, {
      headers,
      timeout: 8000,
      validateStatus: s => s === 200 || s === 404 || s === 403
    });

    if (profileRes.status === 404) {
      return null; // Profile does not exist
    }

    if (profileRes.status === 403 && profileRes.headers['x-ratelimit-remaining'] === '0') {
      // Return a basic shell with rate limit warning
      return {
        username: cleanUsername,
        name: null,
        bio: null,
        company: null,
        location: null,
        blog: null,
        email: null,
        followers: 0,
        following: 0,
        publicRepos: 0,
        publicGists: 0,
        createdAt: '',
        updatedAt: '',
        organizations: [],
        topLanguages: [],
        discoveredEmails: [],
        evidence: [
          makeEvidence('GitHub API (Rate Limited)', 'DIRECT', 10, 'Unauthenticated rate limit exceeded. Set GITHUB_TOKEN in .env.')
        ],
        confidence: 10
      };
    }

    const p = profileRes.data;
    evidence.push(makeEvidence(
      'GitHub User Profile API',
      'DIRECT',
      95,
      JSON.stringify({ id: p.id, name: p.name, public_repos: p.public_repos, followers: p.followers })
    ));

    // 2. Fetch Organizations
    let organizations: string[] = [];
    try {
      const orgsRes = await axios.get(`${GITHUB_API_URL}/users/${cleanUsername}/orgs`, {
        headers,
        timeout: 5000
      });
      if (Array.isArray(orgsRes.data)) {
        organizations = orgsRes.data.map((o: any) => o.login).filter(Boolean);
        evidence.push(makeEvidence(
          'GitHub User Organizations API',
          'DIRECT',
          90,
          JSON.stringify({ count: organizations.length, list: organizations })
        ));
      }
    } catch (err) {
      // Non-blocking failures (e.g. rate limit during partial scan)
    }

    // 3. Fetch Repos & Calculate Top Languages
    let topLanguages: string[] = [];
    let discoveredEmails: string[] = [];
    let repos: any[] = [];

    try {
      const reposRes = await axios.get(`${GITHUB_API_URL}/users/${cleanUsername}/repos`, {
        params: { per_page: 100, sort: 'updated' },
        headers,
        timeout: 6000
      });

      if (Array.isArray(reposRes.data)) {
        repos = reposRes.data;
        
        // Language distribution computation
        const langMap: Record<string, number> = {};
        for (const repo of repos) {
          if (repo.language) {
            langMap[repo.language] = (langMap[repo.language] || 0) + 1;
          }
        }
        topLanguages = Object.entries(langMap)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0])
          .slice(0, 5); // top 5 languages

        evidence.push(makeEvidence(
          'GitHub User Repositories API',
          'DIRECT',
          90,
          JSON.stringify({ reposFetched: repos.length, topLanguages })
        ));

        // 4. Commit Email Recovery (inspect up to 5 non-fork active repositories)
        const activeRepos = repos
          .filter((r: any) => !r.fork)
          .slice(0, 5);

        const emailSet = new Set<string>();

        for (const repo of activeRepos) {
          try {
            const commitsRes = await axios.get(`${GITHUB_API_URL}/repos/${cleanUsername}/${repo.name}/commits`, {
              params: { author: cleanUsername, per_page: 10 },
              headers,
              timeout: 4000
            });

            if (Array.isArray(commitsRes.data)) {
              for (const commitEntry of commitsRes.data) {
                const authorEmail = commitEntry.commit?.author?.email;
                const committerEmail = commitEntry.commit?.committer?.email;

                if (authorEmail && isValidCommitEmail(authorEmail)) emailSet.add(authorEmail.toLowerCase());
                if (committerEmail && isValidCommitEmail(committerEmail)) emailSet.add(committerEmail.toLowerCase());
              }
            }
          } catch {
            // Gracefully ignore single repo errors (e.g. empty repository)
          }
        }

        discoveredEmails = Array.from(emailSet);
        if (discoveredEmails.length > 0) {
          evidence.push(makeEvidence(
            'GitHub Public Commit Email Recovery',
            'DIRECT',
            95,
            JSON.stringify({ emailsFound: discoveredEmails })
          ));
        }
      }
    } catch {
      // Gracefully catch repository API failures
    }

    return {
      username: cleanUsername,
      name: p.name ?? null,
      bio: p.bio ?? null,
      company: p.company ?? null,
      location: p.location ?? null,
      blog: p.blog ?? null,
      email: p.email ?? null,
      followers: p.followers ?? 0,
      following: p.following ?? 0,
      publicRepos: p.public_repos ?? 0,
      publicGists: p.public_gists ?? 0,
      createdAt: p.created_at ?? '',
      updatedAt: p.updated_at ?? '',
      organizations,
      topLanguages,
      discoveredEmails,
      evidence,
      confidence: computeConfidence(evidence)
    };
  } catch (error) {
    // Top-level failure (e.g. network timeout)
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidCommitEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const lower = email.toLowerCase();
  // Filter out GitHub's noreply/anonymous commit emails
  if (lower.includes('noreply.github.com')) return false;
  if (lower.includes('users.noreply.github.com')) return false;
  if (lower.startsWith('noreply@')) return false;
  return true;
}
