/**
 * domainIntel.ts
 * ─────────────────────────────────────────────────────────────────
 * Evidence-driven domain intelligence.
 *
 * DATA SOURCES (all free, no scraping):
 *
 *  1. Cloudflare DNS-over-HTTPS (1.1.1.1)
 *     → A records   (IPv4 addresses hosting the domain)
 *     → MX records  (mail servers)
 *     → TXT records (SPF, DMARC, DKIM, Google site verify, etc.)
 *     → NS records  (name servers — reveals registrar/DNS provider)
 *     → Free, no key, 1000+ req/min for reasonable use
 *
 *  2. crt.sh Certificate Transparency Logs
 *     → PostgreSQL-backed REST API (no key required)
 *     → Returns TLS certificates issued for the domain + subdomains
 *     → Each cert entry: id, common_name, issuer, not_before, not_after
 *     → Reveals: hosting provider, subdomains, issuance history
 *     → Free, public, up to 100 certs returned
 *
 *  3. rdap.org (RDAP / WHOIS successor, free)
 *     → RFC 7483 RDAP: structured JSON for registration data
 *     → Returns: registrar name, registration date, expiry date
 *     → No scraping — real REST API
 *     → Falls back to null fields honestly if domain is in
 *       a registry that doesn't support RDAP
 *
 *  4. Archive.org CDX
 *     → Snapshot count for the domain's root URL
 *     → Indicates historical web presence
 *
 * NEVER FABRICATES:
 *  - IP geolocation (not attempted)
 *  - Owner name or organization (only returned if in RDAP response)
 *  - Hosting provider (only inferred from NS/cert issuer, clearly labelled INFERRED)
 */

import axios from 'axios';
import {
  DomainIntelResult,
  CertEntry,
  EvidenceItem,
  makeEvidence
} from './evidenceTypes';

const DOH_URL = 'https://cloudflare-dns.com/dns-query';
const CRTSH_URL = 'https://crt.sh/json';
const RDAP_URL = 'https://rdap.org/domain/';
const ARCHIVE_CDX = 'https://web.archive.org/cdx/search/cdx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function dohQuery(name: string, type: string): Promise<string[]> {
  try {
    const res = await axios.get(DOH_URL, {
      params: { name, type },
      headers: { Accept: 'application/dns-json' },
      timeout: 5000
    });
    const answers: any[] = res.data?.Answer ?? [];
    return answers
      .map((a: any) => (a.data as string).replace(/"/g, '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ─── 1. Full DNS Probe ────────────────────────────────────────────────────────

async function probeDNS(domain: string): Promise<{
  aRecords: string[];
  mxRecords: string[];
  txtRecords: string[];
  nsRecords: string[];
  spf: string | null;
  dmarc: string | null;
  evidence: EvidenceItem;
}> {
  const [aRaw, mxRaw, txtRaw, nsRaw, dmarcRaw] = await Promise.all([
    dohQuery(domain, 'A'),
    dohQuery(domain, 'MX'),
    dohQuery(domain, 'TXT'),
    dohQuery(domain, 'NS'),
    dohQuery(`_dmarc.${domain}`, 'TXT'),
  ]);

  // Strip MX priority numbers and trailing dots
  const mxRecords = mxRaw
    .map(r => r.replace(/^\d+\s+/, '').replace(/\.$/, '').toLowerCase())
    .filter(Boolean);

  // Strip trailing dots from NS records
  const nsRecords = nsRaw.map(r => r.replace(/\.$/, '').toLowerCase());

  // Strip trailing dots from A records
  const aRecords = aRaw.map(r => r.replace(/\.$/, ''));

  const spf = txtRaw.find(r => r.toLowerCase().startsWith('v=spf1')) ?? null;
  const dmarc = dmarcRaw.find(r => r.toLowerCase().startsWith('v=dmarc1')) ?? null;

  const resolved = aRecords.length > 0 || mxRecords.length > 0;

  return {
    aRecords,
    mxRecords,
    txtRecords: txtRaw,
    nsRecords,
    spf,
    dmarc,
    evidence: makeEvidence(
      'Cloudflare DNS-over-HTTPS (1.1.1.1)',
      'DIRECT',
      resolved ? 90 : 60,
      JSON.stringify({ a: aRecords.length, mx: mxRecords.length, ns: nsRecords, spf: !!spf, dmarc: !!dmarc })
    )
  };
}

// ─── 2. crt.sh Certificate Transparency ──────────────────────────────────────

async function probeCerts(domain: string): Promise<{
  certificates: CertEntry[];
  evidence: EvidenceItem | null;
}> {
  try {
    const res = await axios.get(CRTSH_URL, {
      params: { q: `%.${domain}`, output: 'json' },
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });

    if (!Array.isArray(res.data) || res.data.length === 0) {
      return { certificates: [], evidence: null };
    }

    // Deduplicate by cert id, limit to 50 most recent
    const seen = new Set<number>();
    const certs: CertEntry[] = [];

    for (const entry of res.data) {
      if (seen.has(entry.id) || certs.length >= 50) continue;
      seen.add(entry.id);
      certs.push({
        id: entry.id,
        commonName: entry.common_name ?? entry.name_value ?? '',
        issuer: entry.issuer_name ?? '',
        notBefore: entry.not_before ?? '',
        notAfter: entry.not_after ?? '',
        source: 'crt.sh'
      });
    }

    return {
      certificates: certs,
      evidence: makeEvidence(
        'crt.sh Certificate Transparency Log',
        'DIRECT',
        88,
        JSON.stringify({ total: res.data.length, returned: certs.length, firstCN: certs[0]?.commonName })
      )
    };
  } catch {
    return { certificates: [], evidence: null };
  }
}

// ─── 3. RDAP Registration Data ───────────────────────────────────────────────

async function probeRDAP(domain: string): Promise<{
  registrar: string | null;
  registeredOn: string | null;
  expiresOn: string | null;
  evidence: EvidenceItem | null;
}> {
  try {
    const res = await axios.get(`${RDAP_URL}${domain}`, {
      timeout: 8000,
      headers: { Accept: 'application/rdap+json' },
      validateStatus: s => s === 200 || s === 404 || s === 400
    });

    if (res.status !== 200 || !res.data) {
      return { registrar: null, registeredOn: null, expiresOn: null, evidence: null };
    }

    const d = res.data;

    // Extract registrar from entities
    let registrar: string | null = null;
    const entities: any[] = d.entities ?? [];
    for (const entity of entities) {
      if (entity.roles?.includes('registrar')) {
        registrar = entity.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3]
          ?? entity.handle
          ?? null;
        break;
      }
    }

    // Extract dates from events
    const events: any[] = d.events ?? [];
    const regEvent = events.find((e: any) => e.eventAction === 'registration');
    const expEvent = events.find((e: any) => e.eventAction === 'expiration');

    const registeredOn = regEvent?.eventDate ?? null;
    const expiresOn = expEvent?.eventDate ?? null;

    const hasData = registrar !== null || registeredOn !== null;
    if (!hasData) return { registrar: null, registeredOn: null, expiresOn: null, evidence: null };

    return {
      registrar,
      registeredOn,
      expiresOn,
      evidence: makeEvidence(
        'rdap.org (RDAP / WHOIS successor)',
        'DIRECT',
        85,
        JSON.stringify({ registrar, registeredOn, expiresOn })
      )
    };
  } catch {
    return { registrar: null, registeredOn: null, expiresOn: null, evidence: null };
  }
}

// ─── 4. Archive.org CDX Snapshot Count ───────────────────────────────────────

async function probeArchive(domain: string): Promise<{
  snapshotCount: number;
  evidence: EvidenceItem | null;
}> {
  try {
    const res = await axios.get(ARCHIVE_CDX, {
      params: {
        url: domain,
        output: 'json',
        limit: 10,
        fl: 'timestamp',
        collapse: 'timestamp:6'
      },
      timeout: 7000
    });
    const rows: any[][] = res.data ?? [];
    const count = Math.max(0, rows.length - 1);
    if (count === 0) return { snapshotCount: 0, evidence: null };
    return {
      snapshotCount: count,
      evidence: makeEvidence(
        'Archive.org CDX API (web.archive.org)',
        'DIRECT',
        75,
        JSON.stringify({ monthlySnapshots: count })
      )
    };
  } catch {
    return { snapshotCount: 0, evidence: null };
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function scanDomain(rawDomain: string): Promise<DomainIntelResult> {
  // Normalise: strip scheme, path, port, trailing slash
  const domain = rawDomain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .split(':')[0]
    .toLowerCase();

  const evidence: EvidenceItem[] = [];

  const [dns, certs, rdap, archive] = await Promise.all([
    probeDNS(domain),
    probeCerts(domain),
    probeRDAP(domain),
    probeArchive(domain)
  ]);

  evidence.push(dns.evidence);
  if (certs.evidence) evidence.push(certs.evidence);
  if (rdap.evidence) evidence.push(rdap.evidence);
  if (archive.evidence) evidence.push(archive.evidence);

  return {
    domain,
    aRecords: dns.aRecords,
    mxRecords: dns.mxRecords,
    txtRecords: dns.txtRecords,
    spf: dns.spf,
    dmarc: dns.dmarc,
    registrar: rdap.registrar,
    registeredOn: rdap.registeredOn,
    expiresOn: rdap.expiresOn,
    certificates: certs.certificates,
    archiveSnapshots: archive.snapshotCount,
    evidence
  };
}
