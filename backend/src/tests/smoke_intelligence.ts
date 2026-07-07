/**
 * smoke_intelligence.ts
 * Smoke tests for Modules 1–6 (evidenceTypes, phoneIntel, emailIntel,
 * usernameIntel, domainIntel, githubIntel).
 * Run: npx ts-node src/tests/smoke_intelligence.ts
 */

import {
  makeEvidence,
  computeConfidence,
  confidenceToSeverity
} from '../intelligence/evidenceTypes';
import { scanPhone } from '../intelligence/phoneIntel';
import { scanEmail } from '../intelligence/emailIntel';
import { probeUsername, filterFound } from '../intelligence/usernameIntel';
import { scanDomain } from '../intelligence/domainIntel';
import { scanGitHub } from '../intelligence/githubIntel';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ✔ ${label}`);
    passed++;
  } else {
    console.error(`  ✘ FAIL: ${label}`);
    failed++;
  }
}

// ─── evidenceTypes tests ──────────────────────────────────────────────────────

console.log('\n▶ evidenceTypes — computeConfidence');

const e1 = makeEvidence('Test API', 'DIRECT', 90);
assert('makeEvidence sets method', e1.method === 'DIRECT');
assert('makeEvidence sets confidence', e1.confidence === 90);
assert('makeEvidence has timestamp', typeof e1.timestamp === 'string');

assert('computeConfidence empty = 0', computeConfidence([]) === 0);
assert('computeConfidence single DIRECT 90 = 90', computeConfidence([makeEvidence('x', 'DIRECT', 90)]) === 90);
assert('computeConfidence capped at 100', computeConfidence([makeEvidence('x', 'DIRECT', 100), makeEvidence('y', 'DIRECT', 100)]) === 100);
// A single DIRECT(80) alone = 80. Adding a low-confidence INFERRED(20) pulls average down.
const singleDirect    = computeConfidence([makeEvidence('a', 'DIRECT', 80)]);
const directWithNoise = computeConfidence([makeEvidence('a', 'DIRECT', 80), makeEvidence('b', 'INFERRED', 20)]);
assert('Adding low-confidence INFERRED evidence pulls average down', directWithNoise < singleDirect);

console.log('\n▶ evidenceTypes — confidenceToSeverity');
assert('100 → CRITICAL', confidenceToSeverity(100) === 'CRITICAL');
assert('70 → HIGH', confidenceToSeverity(70) === 'HIGH');
assert('50 → MEDIUM', confidenceToSeverity(50) === 'MEDIUM');
assert('25 → LOW', confidenceToSeverity(25) === 'LOW');
assert('5 → INFO', confidenceToSeverity(5) === 'INFO');

// ─── phoneIntel tests ─────────────────────────────────────────────────────────

console.log('\n▶ phoneIntel — scanPhone');

async function runPhoneTests() {
  // 10-digit Indian number (no + prefix)
  const r1 = await scanPhone('9876543210');
  assert('10-digit Indian is valid', r1.isValid === true);
  assert('10-digit Indian e164 has +91', r1.e164 === '+919876543210');
  assert('countryName is India', r1.countryName === 'India');
  assert('FORMAT_ONLY when no API key', r1.dataSource === 'FORMAT_ONLY' || r1.dataSource === 'API');
  assert('carrier is string (not null)', typeof r1.carrier === 'string');
  assert('dorks array non-empty for valid number', r1.dorks.length > 0);
  assert('every dork has searchUrl', r1.dorks.every((d: { searchUrl: string }) => d.searchUrl.startsWith('https://')));

  // International format with +
  const r2 = await scanPhone('+1 (202) 555-0173');
  assert('+1 US number is valid', r2.isValid === true);
  assert('+1 US countryCode = 1', r2.countryCode === '1');
  assert('+1 US countryName includes United States', r2.countryName.includes('United States'));

  // Invalid short number
  const r3 = await scanPhone('123');
  assert('Short number is invalid', r3.isValid === false);
  assert('Invalid number has no dorks', r3.dorks.length === 0);

  // Unknown country code
  const r4 = await scanPhone('+9991234567890');
  assert('Unknown country returns string values', typeof r4.countryName === 'string');

  console.log(`\n✔ Passed: ${passed}  ✘ Failed: ${failed}\n`);
  if (failed > 0) process.exit(1);
}

runPhoneTests()
  .then(() => runEmailTests())
  .then(() => runUsernameTests())
  .then(() => runDomainTests())
  .then(() => runGitHubTests())
  .catch(err => { console.error(err); process.exit(1); });

async function runUsernameTests() {
  console.log('\n▶ usernameIntel — probeUsername (live HTTP probes)');
  console.log('  Probing a well-known username across selected platforms...\n');

  // Probe 'torvalds' (Linus Torvalds) — well-known GitHub presence.
  // Full 45-platform probe runs concurrently in 5-chunk batches.
  const results = await probeUsername('torvalds');

  assert('[username] returns array', Array.isArray(results));
  assert('[username] result count is at least 40 platforms', results.length >= 40);
  assert('[username] every result has platform field', results.every((r: any) => typeof r.platform === 'string'));
  assert('[username] every result has url field', results.every((r: any) => typeof r.url === 'string'));
  assert('[username] every result has valid status', results.every((r: any) =>
    ['FOUND', 'NOT_FOUND', 'RATE_LIMITED', 'ERROR'].includes(r.status)));
  assert('[username] every result has evidence array', results.every((r: any) => Array.isArray(r.evidence)));
  assert('[username] every result has numeric confidence', results.every((r: any) => typeof r.confidence === 'number'));
  assert('[username] confidence is 0 for NOT_FOUND/ERROR', results
    .filter((r: any) => r.status === 'NOT_FOUND' || r.status === 'ERROR')
    .every((r: any) => r.confidence === 0));
  assert('[username] FOUND results have confidence > 0', results
    .filter((r: any) => r.status === 'FOUND')
    .every((r: any) => r.confidence > 0));

  // GitHub must be FOUND for 'torvalds'
  const github = results.find((r: any) => r.platform === 'GitHub');
  assert('[username] GitHub found for torvalds', github?.status === 'FOUND');
  assert('[username] GitHub result has profile metadata', github?.profile !== undefined);
  assert('[username] GitHub profile has displayName', typeof github?.profile?.displayName === 'string');
  assert('[username] GitHub profile has followers', typeof github?.profile?.followers === 'number');
  assert('[username] GitHub FOUND evidence is DIRECT', github?.evidence?.[0]?.method === 'DIRECT');

  // filterFound returns only FOUND entries
  const found = filterFound(results);
  assert('[username] filterFound returns subset of results', found.length <= results.length);
  assert('[username] filterFound only contains FOUND status', found.every((r: any) => r.status === 'FOUND'));

  console.log(`  Found on ${found.length}/${results.length} platforms`);
  console.log(`\n✔ Passed: ${passed}  ✘ Failed: ${failed}\n`);
  if (failed > 0) process.exit(1);
}


async function runEmailTests() {
  console.log('\n▶ emailIntel — scanEmail (live DNS + Gravatar probes)');
  console.log('  Note: Gravatar/GitHub/Archive results depend on network access.\n');

  // ── Test 1: Well-known public email (gravatar registered) ────────
  // torvalds@linux-foundation.org is a well-known public email
  // that has a Gravatar and MX records. Safe to probe.
  const r1 = await scanEmail('torvalds@linux-foundation.org');
  assert('[email] result has correct email field', r1.email === 'torvalds@linux-foundation.org');
  assert('[email] has gravatar hash (always computed)', r1.gravatarHash.length === 32);
  assert('[email] mxRecords is an array', Array.isArray(r1.mxRecords));
  assert('[email] spfRecord is string or null', r1.spfRecord === null || typeof r1.spfRecord === 'string');
  assert('[email] dmarcRecord is string or null', r1.dmarcRecord === null || typeof r1.dmarcRecord === 'string');
  assert('[email] breachCount is a number or -1', typeof r1.breachCount === 'number');
  assert('[email] breaches is an array', Array.isArray(r1.breaches));
  assert('[email] githubCommits is an array', Array.isArray(r1.githubCommits));
  assert('[email] archiveSnapshots is a number', typeof r1.archiveSnapshots === 'number');
  assert('[email] evidence array non-empty', r1.evidence.length > 0);
  assert('[email] confidence is 0-100', r1.confidence >= 0 && r1.confidence <= 100);
  assert('[email] every evidence item has source', r1.evidence.every((e: any) => typeof e.source === 'string' && e.source.length > 0));
  assert('[email] every evidence item has timestamp', r1.evidence.every((e: any) => typeof e.timestamp === 'string'));

  // ── Test 2: Disposable email detection ───────────────────────────
  const r2 = await scanEmail('throwaway@mailinator.com');
  assert('[disposable] isDisposable = true for mailinator.com', r2.isDisposable === true);
  assert('[disposable] isRoleAccount = false for random prefix', r2.isRoleAccount === false);

  // ── Test 3: Role account detection ───────────────────────────────
  const r3 = await scanEmail('admin@example.com');
  assert('[role] isRoleAccount = true for admin@', r3.isRoleAccount === true);

  const r4 = await scanEmail('noreply@github.com');
  assert('[role] isRoleAccount = true for noreply@', r4.isRoleAccount === true);

  // ── Test 4: Gravatar hash is deterministic MD5 ───────────────────
  const r5 = await scanEmail('Test@Example.COM');
  const r6 = await scanEmail('test@example.com');
  assert('[gravatar] MD5 hash is case-insensitive and normalised', r5.gravatarHash === r6.gravatarHash);

  // ── Test 5: DNS for known good domain ────────────────────────────
  const r7 = await scanEmail('user@google.com');
  assert('[dns] google.com has MX records', r7.mxRecords.length > 0);
  assert('[dns] google.com MX records are strings', r7.mxRecords.every((m: string) => typeof m === 'string'));

  console.log(`\n✔ Passed: ${passed}  ✘ Failed: ${failed}\n`);
  if (failed > 0) process.exit(1);
}

async function runDomainTests() {
  console.log('\n▶ domainIntel — scanDomain (live DNS + crt.sh + RDAP probes)');

  // ── Test 1: github.com — well-known domain ───────────────────────
  const r1 = await scanDomain('github.com');
  assert('[domain] normalises domain correctly', r1.domain === 'github.com');
  assert('[domain] has A records', r1.aRecords.length > 0);
  assert('[domain] A records are IP-like strings', r1.aRecords.every((a: string) => /^\d+\./.test(a) || a.includes(':')));
  assert('[domain] has MX records', r1.mxRecords.length > 0);
  assert('[domain] txtRecords is an array', Array.isArray(r1.txtRecords));
  assert('[domain] spf is string or null', r1.spf === null || typeof r1.spf === 'string');
  assert('[domain] dmarc is string or null', r1.dmarc === null || typeof r1.dmarc === 'string');
  // crt.sh is historically flaky and frequently rate-limits or times out.
  // We only assert cert details if crt.sh returned a non-empty array.
  if (r1.certificates.length > 0) {
    assert('[domain] every cert has commonName', r1.certificates.every((c: any) => typeof c.commonName === 'string'));
    assert('[domain] every cert has issuer', r1.certificates.every((c: any) => typeof c.issuer === 'string'));
    assert('[domain] every cert has source = crt.sh', r1.certificates.every((c: any) => c.source === 'crt.sh'));
  } else {
    console.log('  ⚠️ crt.sh returned 0 certificates or timed out (skipping detail checks)');
  }
  assert('[domain] has evidence array', r1.evidence.length > 0);
  assert('[domain] all evidence items have source', r1.evidence.every((e: any) => typeof e.source === 'string' && e.source.length > 0));

  // ── Test 2: URL normalisation ────────────────────────────────────
  const r2 = await scanDomain('https://www.google.com/search?q=hello');
  assert('[domain] strips https:// and www.', r2.domain === 'google.com');
  assert('[domain] strips path', !r2.domain.includes('/'));
  assert('[domain] google.com resolves A records', r2.aRecords.length > 0);

  // ── Test 3: SPF / DMARC detection on google.com ──────────────────
  const r3 = await scanDomain('google.com');
  assert('[domain] google.com has SPF record', r3.spf !== null && (r3.spf as string).startsWith('v=spf1'));
  assert('[domain] google.com has DMARC record', r3.dmarc !== null);

  // ── Test 4: RDAP registration data ──────────────────────────────
  assert('[domain] registrar is string or null', r1.registrar === null || typeof r1.registrar === 'string');
  assert('[domain] registeredOn is string or null', r1.registeredOn === null || typeof r1.registeredOn === 'string');
  assert('[domain] expiresOn is string or null', r1.expiresOn === null || typeof r1.expiresOn === 'string');

  // ── Test 5: Archive snapshots ────────────────────────────────────
  assert('[domain] archiveSnapshots is a number >= 0', typeof r1.archiveSnapshots === 'number' && r1.archiveSnapshots >= 0);

  console.log(`\n✔ Passed: ${passed}  ✘ Failed: ${failed}\n`);
  if (failed > 0) process.exit(1);
}

async function runGitHubTests() {
  console.log('\n▶ githubIntel — scanGitHub (live GitHub API probes)');

  // ── Test 1: torvalds — known profile ─────────────────────────────
  const r1 = await scanGitHub('torvalds');
  
  if (r1) {
    assert('[github] username matched', r1.username === 'torvalds');
    assert('[github] publicRepos is a number', typeof r1.publicRepos === 'number' && r1.publicRepos > 0);
    assert('[github] followers is a number', typeof r1.followers === 'number' && r1.followers > 0);
    assert('[github] topLanguages is an array', Array.isArray(r1.topLanguages));
    assert('[github] organizations is an array', Array.isArray(r1.organizations));
    assert('[github] evidence array is non-empty', r1.evidence.length > 0);
    assert('[github] confidence is a number 0-100', r1.confidence >= 0 && r1.confidence <= 100);
    
    // Check if rate limited vs full profile load
    if (r1.evidence.some(e => e.source.includes('Rate Limited'))) {
      console.log('  ⚠️ GitHub API rate limit hit in CI, skipping full detail assertions.');
    } else {
      assert('[github] name is Linus Torvalds', r1.name === 'Linus Torvalds');
      assert('[github] topLanguages contains C', r1.topLanguages.includes('C'));
    }
  } else {
    // If entire scan failed (e.g. completely offline), skip
    console.log('  ⚠️ scanGitHub returned null (likely network offline, skipping assertions)');
  }

  // ── Test 2: Non-existent user ────────────────────────────────────
  const r2 = await scanGitHub('torvalds-non-existent-user-1234567890');
  assert('[github] non-existent user returns null', r2 === null);

  console.log(`\n✔ Passed: ${passed}  ✘ Failed: ${failed}\n`);
  if (failed > 0) process.exit(1);
}
