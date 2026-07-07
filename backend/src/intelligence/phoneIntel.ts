/**
 * phoneIntel.ts
 * ─────────────────────────────────────────────────────────────────
 * Evidence-driven phone number intelligence.
 *
 * DATA SOURCES (in order of preference):
 *  1. apilayer Phone Validation API (free tier: 100 req/month)
 *     → Set APILAYER_KEY in .env to enable.
 *     → Returns: valid, line_type, carrier, country, location
 *  2. numverify API (free tier: 250 req/month, no HTTPS on free)
 *     → Set NUMVERIFY_KEY in .env as fallback.
 *  3. FORMAT_ONLY — E.164 validation + country code table only.
 *     → Never fabricates carrier or line type.
 *     → carrier = 'UNKNOWN', lineType = 'unknown'
 *
 * Google Dorks are always generated — they are search URLs,
 * not claims. The user must manually verify results.
 */

import axios from 'axios';
import {
  PhoneIntelResult,
  DorkEntry,
  EvidenceItem,
  makeEvidence,
  computeConfidence
} from './evidenceTypes';

// ─── Country Code Table (E.164) ─────────────────────────────────────────────
// Source: ITU-T E.164 / ISO 3166-1. Used for FORMAT_ONLY mode.

const COUNTRY_CODES: Record<string, { name: string; minLen: number; maxLen: number }> = {
  '1':    { name: 'United States / Canada', minLen: 11, maxLen: 11 },
  '7':    { name: 'Russia / Kazakhstan',    minLen: 11, maxLen: 11 },
  '20':   { name: 'Egypt',                  minLen: 12, maxLen: 12 },
  '27':   { name: 'South Africa',           minLen: 11, maxLen: 11 },
  '33':   { name: 'France',                 minLen: 11, maxLen: 11 },
  '34':   { name: 'Spain',                  minLen: 11, maxLen: 11 },
  '39':   { name: 'Italy',                  minLen: 12, maxLen: 12 },
  '44':   { name: 'United Kingdom',         minLen: 12, maxLen: 12 },
  '49':   { name: 'Germany',                minLen: 12, maxLen: 13 },
  '61':   { name: 'Australia',              minLen: 11, maxLen: 11 },
  '62':   { name: 'Indonesia',              minLen: 11, maxLen: 13 },
  '63':   { name: 'Philippines',            minLen: 12, maxLen: 12 },
  '64':   { name: 'New Zealand',            minLen: 11, maxLen: 11 },
  '65':   { name: 'Singapore',              minLen: 10, maxLen: 10 },
  '66':   { name: 'Thailand',               minLen: 11, maxLen: 11 },
  '81':   { name: 'Japan',                  minLen: 11, maxLen: 12 },
  '82':   { name: 'South Korea',            minLen: 11, maxLen: 12 },
  '86':   { name: 'China',                  minLen: 13, maxLen: 13 },
  '91':   { name: 'India',                  minLen: 12, maxLen: 12 },
  '92':   { name: 'Pakistan',               minLen: 12, maxLen: 12 },
  '94':   { name: 'Sri Lanka',              minLen: 11, maxLen: 11 },
  '95':   { name: 'Myanmar',                minLen: 11, maxLen: 11 },
  '880':  { name: 'Bangladesh',             minLen: 13, maxLen: 13 },
  '966':  { name: 'Saudi Arabia',           minLen: 12, maxLen: 12 },
  '971':  { name: 'UAE',                    minLen: 12, maxLen: 12 },
  '972':  { name: 'Israel',                 minLen: 12, maxLen: 12 },
  '977':  { name: 'Nepal',                  minLen: 13, maxLen: 13 },
  '998':  { name: 'Uzbekistan',             minLen: 12, maxLen: 12 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeInput(raw: string): string {
  // Strip everything except digits and leading +
  const stripped = raw.replace(/[^\d+]/g, '');
  // Remove leading +
  return stripped.replace(/^\+/, '');
}

function parseCountryCode(digits: string): { code: string; name: string } | null {
  // Try longest match first (3-digit codes like 880, 966)
  for (const len of [3, 2, 1]) {
    const prefix = digits.substring(0, len);
    if (COUNTRY_CODES[prefix]) {
      return { code: prefix, name: COUNTRY_CODES[prefix].name };
    }
  }
  return null;
}

function formatE164(digits: string): string {
  return `+${digits}`;
}

function formatNational(digits: string, countryCode: string): string {
  const national = digits.slice(countryCode.length);
  if (national.length === 10) {
    return `${national.slice(0, 5)} ${national.slice(5)}`;
  }
  return national;
}

function buildDorks(e164: string, national: string, intl: string): DorkEntry[] {
  const q = (s: string) => encodeURIComponent(s);
  return [
    {
      title: 'General Web Footprint',
      description: 'Searches for any publicly indexed mention of this number',
      searchUrl: `https://www.google.com/search?q="${q(e164)}" OR "${q(intl)}" OR "${q(national)}"`
    },
    {
      title: 'Pastebin & Paste Sites',
      description: 'Checks if the number appears in any publicly indexed paste',
      searchUrl: `https://www.google.com/search?q=site:pastebin.com OR site:paste.ee OR site:ghostbin.com "${q(national)}"`
    },
    {
      title: 'Social Media Mentions',
      description: 'Searches Facebook, Twitter/X, and LinkedIn for public mentions',
      searchUrl: `https://www.google.com/search?q=(site:facebook.com OR site:twitter.com OR site:linkedin.com) "${q(national)}"`
    },
    {
      title: 'Public Marketplaces & Classifieds',
      description: 'Checks OLX, Craigslist, and similar sites for contact listings',
      searchUrl: `https://www.google.com/search?q=(site:olx.in OR site:craigslist.org OR site:quikr.com) "${q(national)}"`
    },
    {
      title: 'Document File Mentions (PDF/DOC)',
      description: 'Checks Google-indexed documents containing this number',
      searchUrl: `https://www.google.com/search?q=(filetype:pdf OR filetype:doc OR filetype:xls) "${q(national)}"`
    },
    {
      title: 'GitHub & Code Repository Leak',
      description: 'Searches public code for hardcoded phone number references',
      searchUrl: `https://github.com/search?q="${q(national)}"&type=code`
    },
    {
      title: 'Truecaller Public Profile',
      description: 'Direct Truecaller search for this number',
      searchUrl: `https://www.truecaller.com/search/in/${national.replace(/\D/g, '')}`
    },
    {
      title: 'India TRAI DND Registry',
      description: 'Check DND complaint status',
      searchUrl: `https://www.google.com/search?q=site:trai.gov.in "${q(national)}"`
    }
  ];
}

// ─── API Layer 1: apilayer ───────────────────────────────────────────────────

async function queryApilayer(e164: string, key: string): Promise<{
  carrier: string;
  lineType: PhoneIntelResult['lineType'];
  location: string;
  confidence: number;
  raw: string;
} | null> {
  try {
    const res = await axios.get('https://api.apilayer.com/number_verification/validate', {
      params: { number: `+${e164}` },
      headers: { apikey: key },
      timeout: 6000
    });
    const d = res.data;
    if (!d || d.valid === undefined) return null;
    return {
      carrier: d.carrier || 'UNKNOWN',
      lineType: mapLineType(d.line_type),
      location: [d.location, d.country_name].filter(Boolean).join(', ') || 'UNKNOWN',
      confidence: 95,
      raw: JSON.stringify({ carrier: d.carrier, line_type: d.line_type, location: d.location, valid: d.valid })
    };
  } catch {
    return null;
  }
}

// ─── API Layer 2: numverify ──────────────────────────────────────────────────

async function queryNumverify(e164: string, key: string): Promise<{
  carrier: string;
  lineType: PhoneIntelResult['lineType'];
  location: string;
  confidence: number;
  raw: string;
} | null> {
  try {
    // numverify free tier is HTTP only
    const res = await axios.get('http://apilayer.net/api/validate', {
      params: { access_key: key, number: e164, format: 1 },
      timeout: 6000
    });
    const d = res.data;
    if (!d || !d.valid) return null;
    return {
      carrier: d.carrier || 'UNKNOWN',
      lineType: mapLineType(d.line_type),
      location: [d.location, d.country_name].filter(Boolean).join(', ') || 'UNKNOWN',
      confidence: 90,
      raw: JSON.stringify({ carrier: d.carrier, line_type: d.line_type, location: d.location })
    };
  } catch {
    return null;
  }
}

function mapLineType(raw: string | undefined): PhoneIntelResult['lineType'] {
  if (!raw) return 'unknown';
  const t = raw.toLowerCase();
  if (t.includes('mobile') || t.includes('cellular')) return 'mobile';
  if (t.includes('landline') || t.includes('fixed')) return 'landline';
  if (t.includes('voip')) return 'voip';
  if (t.includes('toll')) return 'toll_free';
  if (t.includes('premium')) return 'premium';
  return 'unknown';
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function scanPhone(rawInput: string): Promise<PhoneIntelResult> {
  const digits = normalizeInput(rawInput);
  const evidence: EvidenceItem[] = [];

  // Auto-prepend 91 for 10-digit Indian mobile numbers
  const workingDigits = (digits.length === 10 && /^[6-9]/.test(digits))
    ? '91' + digits
    : digits;

  const country = parseCountryCode(workingDigits);
  const isValidLength = workingDigits.length >= 7 && workingDigits.length <= 15;
  const isValid = isValidLength && country !== null;

  const e164 = isValid ? formatE164(workingDigits) : null;
  const countryCode = country?.code ?? '';
  const countryName = country?.name ?? 'UNKNOWN';
  const national = countryCode ? formatNational(workingDigits, countryCode) : workingDigits;
  const intl = e164 ?? `+${workingDigits}`;

  // ── Attempt API lookups ──────────────────────────────────────────
  let carrier = 'UNKNOWN';
  let lineType: PhoneIntelResult['lineType'] = 'unknown';
  let location = 'UNKNOWN';
  let dataSource: PhoneIntelResult['dataSource'] = 'FORMAT_ONLY';

  const apilayerKey = process.env.APILAYER_KEY;
  const numverifyKey = process.env.NUMVERIFY_KEY;

  if (apilayerKey && isValid) {
    const result = await queryApilayer(workingDigits, apilayerKey);
    if (result) {
      carrier = result.carrier;
      lineType = result.lineType;
      location = result.location;
      dataSource = 'API';
      evidence.push(makeEvidence('apilayer Phone Validation API', 'DIRECT', result.confidence, result.raw));
    }
  }

  if (dataSource === 'FORMAT_ONLY' && numverifyKey && isValid) {
    const result = await queryNumverify(workingDigits, numverifyKey);
    if (result) {
      carrier = result.carrier;
      lineType = result.lineType;
      location = result.location;
      dataSource = 'API';
      evidence.push(makeEvidence('numverify Phone Validation API', 'DIRECT', result.confidence, result.raw));
    }
  }

  // ── Format-only evidence ─────────────────────────────────────────
  if (isValid) {
    evidence.push(makeEvidence(
      'ITU-T E.164 country code table',
      'DIRECT',
      85,
      JSON.stringify({ countryCode, countryName, digits: workingDigits.length })
    ));
  }

  const confidence = computeConfidence(evidence);

  return {
    rawInput,
    e164,
    isValid,
    lineType,
    carrier,
    countryCode,
    countryName,
    location,
    internationalFormat: intl,
    nationalFormat: national,
    dataSource,
    evidence,
    confidence,
    dorks: isValid ? buildDorks(e164 ?? workingDigits, national, intl) : []
  };
}
