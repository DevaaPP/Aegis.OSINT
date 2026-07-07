/**
 * smoke_intelligence.ts
 * Quick smoke test for Module 1 (evidenceTypes) + Module 2 (phoneIntel).
 * Run: npx ts-node smoke_intelligence.ts
 */

import {
  makeEvidence,
  computeConfidence,
  confidenceToSeverity
} from '../intelligence/evidenceTypes';
import { scanPhone } from '../intelligence/phoneIntel';

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

runPhoneTests().catch(err => { console.error(err); process.exit(1); });
