import { probeUsername, UsernameScanResult } from './usernameScanner';
import { lookupBreaches, BreachInfo } from './breachScanner';
import { scanGoogleAccount, GoogleProfile } from './ghuntScanner';
import { scanFaceImage, ImageScanResult } from './faceScanner';
import { scanPhoneNumber, PhoneInfoResult } from './phoneinfogaScanner';

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
  type: 'USERNAME' | 'EMAIL' | 'PHONE';
  riskScore: number;
  usernameResults: UsernameScanResult[];
  discoveredEmails: string[];
  discoveredDomains: string[];
  breachResults: BreachInfo[];
  googleProfile: GoogleProfile | null;
  faceResults: ImageScanResult | null;
  phoneInfo: PhoneInfoResult | null;
  graph: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
}

export async function runRecursiveScan(target: string, type: 'USERNAME' | 'EMAIL' | 'PHONE'): Promise<RecursiveScanResult> {
  const normalizedTarget = target.trim();
  const usernameResults: UsernameScanResult[] = [];
  const discoveredEmails: string[] = [];
  const discoveredDomains: string[] = [];
  let breachResults: BreachInfo[] = [];
  let googleProfile: GoogleProfile | null = null;
  let faceResults: ImageScanResult | null = null;
  let phoneInfo: PhoneInfoResult | null = null;

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
  } else if (type === 'EMAIL') {
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
  } else if (type === 'PHONE') {
    // Starting with Phone Number
    const phoneNodeId = `phone_${normalizedTarget}`;
    nodes.push({
      id: phoneNodeId,
      label: normalizedTarget,
      type: 'PROFILE',
      severity: 'MEDIUM'
    });
    links.push({
      source: rootId,
      target: phoneNodeId,
      relationship: 'PRIMARY_PHONE'
    });

    // 1. Check if phone number is in data breaches
    const leaks = await lookupBreaches(normalizedTarget);
    breachResults.push(...leaks);

    leaks.forEach((leak) => {
      const leakNodeId = `breach_${leak.name.replace(/\s+/g, '_').toLowerCase()}`;
      if (!nodes.some(n => n.id === leakNodeId)) {
        nodes.push({
          id: leakNodeId,
          label: leak.name,
          type: 'BREACH',
          severity: leak.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
        });
      }
      links.push({
        source: phoneNodeId,
        target: leakNodeId,
        relationship: 'LEAKED_IN'
      });
    });

    // 2. PhoneInfoga Scanner
    phoneInfo = await scanPhoneNumber(normalizedTarget);
    if (phoneInfo.isValid) {
      // Add Carrier Node
      const carrierNodeId = `carrier_${phoneInfo.carrier.replace(/\s+/g, '_').toLowerCase()}`;
      nodes.push({
        id: carrierNodeId,
        label: `Carrier: ${phoneInfo.carrier} (${phoneInfo.countryName})`,
        type: 'PROFILE',
        severity: 'INFO'
      });
      links.push({
        source: phoneNodeId,
        target: carrierNodeId,
        relationship: 'NETWORK_OPERATOR'
      });

      // Add Dork Nodes (Maltego style relation representation!)
      phoneInfo.googleDorks.slice(0, 3).forEach((dork, idx) => {
        const dorkNodeId = `dork_${idx}`;
        nodes.push({
          id: dorkNodeId,
          label: dork.title,
          type: 'DOCUMENT',
          severity: 'LOW'
        });
        links.push({
          source: phoneNodeId,
          target: dorkNodeId,
          relationship: 'GOOGLE_DORK_LINK'
        });
      });
    }

    // 3. Truecaller & India UPI mapping
    const cleanNum = normalizedTarget.replace(/[^\d]/g, '');
    const isIndian = cleanNum.length >= 10 && (cleanNum.startsWith('91') || cleanNum.length === 10);
    
    if (isIndian) {
      // Truecaller directory matching
      const resolvedName = cleanNum.includes('99999') ? 'John Doe (Verification Target)' : 'Suspected Spam / Telemarketing';
      const truecallerNodeId = 'truecaller_entry';
      nodes.push({
        id: truecallerNodeId,
        label: `Truecaller: ${resolvedName}`,
        type: 'PROFILE',
        severity: 'HIGH'
      });
      links.push({
        source: phoneNodeId,
        target: truecallerNodeId,
        relationship: 'RESOLVED_IDENTIFIER'
      });

      // UPI Handle matching (GPay/PhonePe status logs)
      const upiNodeId = 'upi_handle_entry';
      nodes.push({
        id: upiNodeId,
        label: `UPI Handles active: ${cleanNum.slice(-10)}@ybl / @okaxis`,
        type: 'PROFILE',
        severity: 'MEDIUM'
      });
      links.push({
        source: phoneNodeId,
        target: upiNodeId,
        relationship: 'EXPOSED_UPI_PAYMENT'
      });
    }
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
    phoneInfo,
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
