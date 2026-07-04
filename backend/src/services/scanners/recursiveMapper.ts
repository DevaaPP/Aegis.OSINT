import { probeUsername, UsernameScanResult } from './usernameScanner';
import { lookupBreaches, BreachInfo } from './breachScanner';
import { scanGoogleAccount, GoogleProfile } from './ghuntScanner';
import { scanFaceImage, ImageScanResult } from './faceScanner';

export interface GraphNode {
  id: string;
  label: string;
  type: 'ROOT' | 'PROFILE' | 'EMAIL' | 'BREACH' | 'LOCATION' | 'DOCUMENT' | 'AVATAR';
  severity: 'HIGH' | 'CRITICAL' | 'MEDIUM' | 'LOW' | 'INFO';
}

export interface GraphLink {
  source: string;
  target: string;
  relationship: string;
}

export interface RecursiveScanResult {
  target: string;
  type: 'USERNAME' | 'EMAIL';
  riskScore: number;
  usernameResults: UsernameScanResult[];
  discoveredEmails: string[];
  discoveredDomains: string[];
  breachResults: BreachInfo[];
  googleProfile: GoogleProfile | null;
  faceResults: ImageScanResult | null;
  graph: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
}

export async function runRecursiveScan(target: string, type: 'USERNAME' | 'EMAIL'): Promise<RecursiveScanResult> {
  const normalizedTarget = target.trim();
  const usernameResults: UsernameScanResult[] = [];
  const discoveredEmails: string[] = [];
  const discoveredDomains: string[] = [];
  let breachResults: BreachInfo[] = [];
  let googleProfile: GoogleProfile | null = null;
  let faceResults: ImageScanResult | null = null;

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Initialize Root Node
  const rootId = 'root';
  nodes.push({
    id: rootId,
    label: normalizedTarget,
    type: 'ROOT',
    severity: 'INFO'
  });

  if (type === 'USERNAME') {
    // 1. Sherlock/Tookie Stage: Probe the username
    const usernameProbes = await probeUsername(normalizedTarget);
    usernameResults.push(...usernameProbes);

    const foundProfiles = usernameProbes.filter(p => p.found);
    
    // Add profile nodes
    foundProfiles.forEach((profile) => {
      const nodeId = `profile_${profile.platform.toLowerCase()}`;
      nodes.push({
        id: nodeId,
        label: `${profile.platform} Profile`,
        type: 'PROFILE',
        severity: 'LOW'
      });
      links.push({
        source: rootId,
        target: nodeId,
        relationship: 'EXPOSED_ACCOUNT'
      });
    });

    // 2. Scraping/Pivot Stage: Simulate extracting email/domains from profiles (e.g. GitHub/Medium)
    if (foundProfiles.some(p => p.platform === 'GitHub')) {
      const simulatedEmail = `${normalizedTarget}@gmail.com`;
      discoveredEmails.push(simulatedEmail);

      const emailNodeId = `email_${simulatedEmail}`;
      nodes.push({
        id: emailNodeId,
        label: simulatedEmail,
        type: 'EMAIL',
        severity: 'MEDIUM'
      });
      
      const githubNodeId = 'profile_github';
      links.push({
        source: githubNodeId,
        target: emailNodeId,
        relationship: 'EXTRACTED_EMAIL'
      });
    }

    if (foundProfiles.some(p => p.platform === 'Medium')) {
      const simulatedDomain = `${normalizedTarget}.dev`;
      discoveredDomains.push(simulatedDomain);

      const domainNodeId = `domain_${simulatedDomain}`;
      nodes.push({
        id: domainNodeId,
        label: simulatedDomain,
        type: 'DOCUMENT',
        severity: 'LOW'
      });
      links.push({
        source: 'profile_medium',
        target: domainNodeId,
        relationship: 'LINKED_WEBSITE'
      });
    }
  } else {
    // Starting with Email
    discoveredEmails.push(normalizedTarget);
    
    const emailNodeId = `email_${normalizedTarget}`;
    nodes.push({
      id: emailNodeId,
      label: normalizedTarget,
      type: 'EMAIL',
      severity: 'MEDIUM'
    });
    links.push({
      source: rootId,
      target: emailNodeId,
      relationship: 'PRIMARY_EMAIL'
    });
  }

  // 3. Breach & Google Scan Stage
  for (const email of discoveredEmails) {
    const emailNodeId = `email_${email}`;
    
    // Run Breach Lookup
    const leaks = await lookupBreaches(email);
    breachResults.push(...leaks);

    leaks.forEach((leak) => {
      const leakNodeId = `breach_${leak.name.replace(/\s+/g, '_').toLowerCase()}`;
      // Add breach node if not exists
      if (!nodes.some(n => n.id === leakNodeId)) {
        nodes.push({
          id: leakNodeId,
          label: leak.name,
          type: 'BREACH',
          severity: leak.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
        });
      }
      links.push({
        source: emailNodeId,
        target: leakNodeId,
        relationship: 'LEAKED_IN'
      });
    });

    // Run GHunt Scan if Gmail
    if (email.endsWith('@gmail.com')) {
      googleProfile = await scanGoogleAccount(email);
      if (googleProfile) {
        // Add GAIA ID Node
        const gaiaNodeId = `gaia_${googleProfile.gaiaId}`;
        nodes.push({
          id: gaiaNodeId,
          label: `Gaia ID: ${googleProfile.gaiaId}`,
          type: 'PROFILE',
          severity: 'INFO'
        });
        links.push({
          source: emailNodeId,
          target: gaiaNodeId,
          relationship: 'RESOLVED_GAIA'
        });

        // Add Avatar Node
        if (googleProfile.avatarUrl) {
          const avatarNodeId = 'google_avatar';
          nodes.push({
            id: avatarNodeId,
            label: 'Google Profile Photo',
            type: 'AVATAR',
            severity: 'LOW'
          });
          links.push({
            source: gaiaNodeId,
            target: avatarNodeId,
            relationship: 'PROFILE_PHOTO'
          });

          // 4. Avatar Pivot: Scan avatar image for Face Matches (simulate FaceCheck.ID)
          faceResults = await scanFaceImage(Buffer.from([]), 'google_avatar.jpg', googleProfile.avatarUrl);
          
          faceResults.faceCheckMatches.forEach((match, index) => {
            const matchNodeId = `face_match_${index}`;
            nodes.push({
              id: matchNodeId,
              label: `${match.source} (${match.similarity}%)`,
              type: 'PROFILE',
              severity: 'HIGH'
            });
            links.push({
              source: avatarNodeId,
              target: matchNodeId,
              relationship: 'FACE_RECOGNITION_MATCH'
            });
          });
        }

        // Add Google Reviews Geolocation coordinates
        googleProfile.mapsReviews.forEach((review, index) => {
          const locationNodeId = `location_${index}`;
          nodes.push({
            id: locationNodeId,
            label: review.place,
            type: 'LOCATION',
            severity: 'HIGH'
          });
          links.push({
            source: gaiaNodeId,
            target: locationNodeId,
            relationship: 'POSTED_REVIEW'
          });
        });
      }
    }
  }

  // Calculate Aggregated Risk Score
  const riskScore = calculateRiskScore(usernameResults, breachResults, googleProfile, faceResults);

  return {
    target,
    type,
    riskScore,
    usernameResults,
    discoveredEmails,
    discoveredDomains,
    breachResults,
    googleProfile,
    faceResults,
    graph: {
      nodes,
      links
    }
  };
}

function calculateRiskScore(
  usernames: UsernameScanResult[],
  breaches: BreachInfo[],
  googleProfile: GoogleProfile | null,
  faceResults: ImageScanResult | null
): number {
  let score = 10; // Base score for running a scan

  // Username exposure (max 20 points)
  const foundCount = usernames.filter(u => u.found).length;
  score += Math.min(foundCount * 3, 20);

  // Breach exposure (max 40 points)
  const criticalBreachCount = breaches.filter(b => b.severity === 'CRITICAL').length;
  const highBreachCount = breaches.filter(b => b.severity === 'HIGH').length;
  const mediumBreachCount = breaches.filter(b => b.severity === 'MEDIUM').length;

  score += criticalBreachCount * 15;
  score += highBreachCount * 10;
  score += mediumBreachCount * 5;

  // Google services exposed (max 20 points)
  if (googleProfile) {
    const exposedServices = googleProfile.services.filter(s => s.status === 'EXPOSED').length;
    score += Math.min(exposedServices * 5, 20);
  }

  // Facial recognition match count (max 10 points)
  if (faceResults) {
    score += Math.min(faceResults.faceCheckMatches.length * 4, 10);
  }

  // Clamp score between 0 and 100
  return Math.min(Math.max(score, 0), 100);
}
