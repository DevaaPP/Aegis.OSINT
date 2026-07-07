/**
 * evidenceTypes.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared type definitions for the evidence-driven intelligence graph.
 *
 * RULES:
 *  - Every intelligence claim must carry at least one EvidenceItem.
 *  - confidence=0 nodes MUST NOT be added to the graph.
 *  - method='FABRICATED' is intentionally absent — it must never exist.
 */

// ─── Evidence Method ────────────────────────────────────────────────────────

/** How the evidence was obtained */
export type EvidenceMethod =
  | 'DIRECT'      // API/HTTP returned this exact data
  | 'CORRELATED'  // Derived by combining 2+ independent sources
  | 'INFERRED';   // Pattern-based, low confidence, must be disclosed

// ─── Single Evidence Item ────────────────────────────────────────────────────

export interface EvidenceItem {
  /** Human-readable source: API name, URL, or service */
  source: string;
  /** How confidence was established */
  method: EvidenceMethod;
  /** 0–100. Must be >0 to be valid. */
  confidence: number;
  /** ISO 8601 timestamp of when evidence was gathered */
  timestamp: string;
  /** Raw excerpt from the source response (truncated if large) */
  raw?: string;
}

// ─── Node Types ──────────────────────────────────────────────────────────────

export type NodeType =
  | 'ROOT'
  | 'PERSON'
  | 'EMAIL'
  | 'PHONE'
  | 'USERNAME'
  | 'PROFILE'      // Social media / platform account
  | 'DOMAIN'
  | 'IP'
  | 'REPOSITORY'   // GitHub/GitLab repo
  | 'ORGANIZATION'
  | 'BREACH'       // Data breach entry
  | 'DOCUMENT'     // PDF, paste, file
  | 'CERTIFICATE'  // TLS cert from CT logs
  | 'AVATAR'       // Profile image
  | 'PACKAGE'      // NPM, PyPI, etc.
  | 'LOCATION';

// ─── Severity ────────────────────────────────────────────────────────────────

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

// ─── Graph Node ──────────────────────────────────────────────────────────────

export interface IntelNode {
  id: string;
  label: string;
  type: NodeType;
  severity: Severity;
  /** All evidence backing this node's existence */
  evidence: EvidenceItem[];
  /** Aggregated confidence (0–100), computed from evidence */
  confidence: number;
  /** Any extra structured data this node carries */
  metadata?: Record<string, unknown>;
}

// ─── Graph Edge ──────────────────────────────────────────────────────────────

export interface IntelEdge {
  source: string;  // node id
  target: string;  // node id
  relationship: string;
  confidence: number;
  evidenceCount: number;
}

// ─── Full Intelligence Result ────────────────────────────────────────────────

export interface IntelGraph {
  nodes: IntelNode[];
  edges: IntelEdge[];
}

// ─── Top-level Scan Result ───────────────────────────────────────────────────

export interface ScanResult {
  target: string;
  type: 'USERNAME' | 'EMAIL' | 'PHONE' | 'DOMAIN';
  startedAt: string;
  completedAt: string;
  riskScore: number;
  /** Plain-text summary of the investigation */
  summary: string;
  graph: IntelGraph;
  /** Structured sections for reporting */
  sections: {
    phone?: PhoneIntelResult;
    email?: EmailIntelResult;
    usernames?: UsernameIntelResult[];
    domain?: DomainIntelResult;
    github?: GitHubIntelResult;
    breaches?: BreachIntelResult[];
  };
}

// ─── Per-module Result Shapes ────────────────────────────────────────────────

export interface PhoneIntelResult {
  rawInput: string;
  e164: string | null;
  isValid: boolean;
  lineType: 'mobile' | 'landline' | 'voip' | 'toll_free' | 'premium' | 'unknown';
  carrier: string;          // 'UNKNOWN' if no API data
  countryCode: string;
  countryName: string;
  location: string;         // city/region, or 'UNKNOWN'
  internationalFormat: string;
  nationalFormat: string;
  dataSource: 'API' | 'FORMAT_ONLY'; // FORMAT_ONLY = no API key, only E.164 parsing
  evidence: EvidenceItem[];
  confidence: number;
  /** Pre-built Google Dork search URLs for manual investigation */
  dorks: DorkEntry[];
}

export interface DorkEntry {
  title: string;
  description: string;
  searchUrl: string;
}

export interface EmailIntelResult {
  email: string;
  isDisposable: boolean;
  isRoleAccount: boolean;   // admin@, info@, etc.
  gravatarExists: boolean;
  gravatarUrl: string | null;
  gravatarHash: string;
  mxRecords: string[];
  spfRecord: string | null;
  dmarcRecord: string | null;
  breachCount: number;      // from HIBP free endpoint
  breaches: BreachIntelResult[];
  githubCommits: GitHubCommitRef[];
  archiveSnapshots: number; // count from CDX API
  evidence: EvidenceItem[];
  confidence: number;
}

export interface BreachIntelResult {
  name: string;
  domain: string;
  breachDate: string;
  addedDate: string;
  dataClasses: string[];
  isVerified: boolean;
  isFabricated: boolean;
  isSensitive: boolean;
  description: string;
  severity: Severity;
  evidence: EvidenceItem[];
}

export interface UsernameIntelResult {
  platform: string;
  category: string;
  url: string;
  status: 'FOUND' | 'NOT_FOUND' | 'RATE_LIMITED' | 'ERROR';
  httpStatus?: number;
  evidence: EvidenceItem[];
  confidence: number;
  /** Additional profile fields extracted from body */
  profile?: {
    displayName?: string;
    bio?: string;
    followers?: number;
    following?: number;
    publicRepos?: number;
    joinedAt?: string;
    avatarUrl?: string;
  };
}

export interface DomainIntelResult {
  domain: string;
  aRecords: string[];
  mxRecords: string[];
  txtRecords: string[];
  spf: string | null;
  dmarc: string | null;
  registrar: string | null;      // from WHOIS if available
  registeredOn: string | null;
  expiresOn: string | null;
  certificates: CertEntry[];
  archiveSnapshots: number;
  evidence: EvidenceItem[];
}

export interface CertEntry {
  id: number;
  commonName: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  source: 'crt.sh';
}

export interface GitHubIntelResult {
  username: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  email: string | null;      // only if publicly listed
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  createdAt: string;
  updatedAt: string;
  organizations: string[];
  topLanguages: string[];
  discoveredEmails: string[];  // from public commits
  evidence: EvidenceItem[];
  confidence: number;
}

export interface GitHubCommitRef {
  repo: string;
  sha: string;
  message: string;
  date: string;
  url: string;
}

// ─── Confidence Helpers ───────────────────────────────────────────────────────

/**
 * Compute a node's aggregate confidence from its evidence items.
 * Uses weighted average, capped at 100.
 */
export function computeConfidence(items: EvidenceItem[]): number {
  if (items.length === 0) return 0;
  const weights: Record<EvidenceMethod, number> = {
    DIRECT: 1.0,
    CORRELATED: 0.75,
    INFERRED: 0.4
  };
  const total = items.reduce((sum, e) => sum + e.confidence * weights[e.method], 0);
  const weightSum = items.reduce((sum, e) => sum + weights[e.method], 0);
  return Math.min(100, Math.round(total / weightSum));
}

/**
 * Build a timestamped EvidenceItem with current UTC time.
 */
export function makeEvidence(
  source: string,
  method: EvidenceMethod,
  confidence: number,
  raw?: string
): EvidenceItem {
  return {
    source,
    method,
    confidence,
    timestamp: new Date().toISOString(),
    raw
  };
}

/**
 * Map confidence score to severity level.
 */
export function confidenceToSeverity(confidence: number): Severity {
  if (confidence >= 85) return 'CRITICAL';
  if (confidence >= 65) return 'HIGH';
  if (confidence >= 45) return 'MEDIUM';
  if (confidence >= 20) return 'LOW';
  return 'INFO';
}
