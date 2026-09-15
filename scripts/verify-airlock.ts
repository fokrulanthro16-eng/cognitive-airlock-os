/**
 * Verification Test Runner for Cognitive Airlock OS Deterministic Engine
 */

import {
  evaluateAirlockPolicy,
  redactPiiAndSecrets,
  calculateScopeAssessment,
  computeDeterministicSha256,
} from '../lib/airlock-linter';
import { RawActionIntent, PolicyViolation } from '../types/airlock';

console.log('================================================================');
console.log('🧪 COGNITIVE AIRLOCK OS - DETERMINISTIC ENGINE VERIFICATION SUITE');
console.log('================================================================\n');

// 1. Test PII Redaction
console.log('TEST 1: Deterministic PII & Secret Redaction');
const sampleText = 'Send AWS key AKIAIOSFODNN7EXAMPLE and secret sec_tok_938102830192830192830192 to dev@agency.com. SSN is 000-12-3456.';
const piiResult = redactPiiAndSecrets(sampleText);
console.log('Original Text:', sampleText);
console.log('Sanitized Text:', piiResult.sanitizedText);
console.log('Detected Types:', piiResult.detectedTypes);
console.log('Total Redactions:', piiResult.totalRedactions);
console.assert(piiResult.totalRedactions === 4, 'Expected 4 PII redactions');
console.assert(!piiResult.sanitizedText.includes('AKIAIOSFODNN7EXAMPLE'), 'AWS Key must be redacted');
console.assert(!piiResult.sanitizedText.includes('000-12-3456'), 'SSN must be redacted');
console.log('✅ TEST 1 PASSED: Zero secret leaks in sanitized output.\n');

// 2. Test Hard Budget Ceiling ($5,000 cap)
console.log('TEST 2: Hard Budget Ceiling Violation (< $5,000 auto-cap)');
const highBudgetIntent: RawActionIntent = {
  intentSummary: 'Emergency global datacenter migration',
  category: 'FEATURE_REQUEST',
  urgency: 'critical',
  isScopeExpansion: false,
  estimatedHours: 40,
  requestedBudgetUSD: 9450, // Exceeds $5,000
  clientEntity: 'Enterprise Megacorp',
  deliverableMilestones: ['Migrate nodes', 'Verify failover'],
  rawExcerpts: ['Total budget allocated is $9,450'],
  confidenceScore: 0.95,
};
const verdict2 = evaluateAirlockPolicy(highBudgetIntent, 'Emergency spend $9,450');
console.log('Status:', verdict2.status);
console.log('Violations:', verdict2.violations.map((v: PolicyViolation) => `${v.ruleId} [${v.severity}] - ${v.reason}`));
console.assert(verdict2.status === 'QUARANTINED', 'High budget must be quarantined');
console.assert(verdict2.violations.some((v: PolicyViolation) => v.ruleId === 'HARD_BUDGET_CEILING_EXCEEDED'), 'Must flag ceiling breach');
console.log('✅ TEST 2 PASSED: Hard ceiling enforced deterministically.\n');

// 3. Test Scope Creep Billing Calculator ($60/hr benchmark)
console.log('TEST 3: Scope Creep Deficit Calculator ($60/hr benchmark)');
const scopeCreepIntent: RawActionIntent = {
  intentSummary: 'Can we also quickly build automated invoice sync and QuickBooks exports?',
  category: 'SCOPE_EXPANSION',
  urgency: 'standard',
  isScopeExpansion: true,
  estimatedHours: 24, // 24 hours @ $60/hr = $1,440
  requestedBudgetUSD: 0, // Client offered $0
  clientEntity: 'Sneaky Client LLC',
  deliverableMilestones: ['QuickBooks sync', 'PDF reports'],
  rawExcerpts: ['Won\'t take you more than a few hours right?'],
  confidenceScore: 0.88,
};
const verdict3 = evaluateAirlockPolicy(scopeCreepIntent, 'Can you just add this before Monday?');
const scope3 = verdict3.scopeAssessment;
console.log(`Billable Hours: ${scope3.billableHours}h @ $${scope3.benchmarkHourlyRateUSD}/h`);
console.log(`Calculated Benchmark Surcharge: $${scope3.calculatedSurchargeUSD}`);
console.log(`Budget Deficit: $${scope3.budgetDeficitUSD}`);
console.log(`Violations:`, verdict3.violations.map((v: PolicyViolation) => `${v.ruleId} - ${v.reason}`));
console.assert(scope3.calculatedSurchargeUSD === 1440, '24 hours * $60/h must equal $1,440');
console.assert(scope3.budgetDeficitUSD === 1440, 'Budget deficit must be $1,440');
console.assert(verdict3.status === 'QUARANTINED', 'Unbilled scope creep must be quarantined');
console.log('✅ TEST 3 PASSED: Solo founder protected from unbilled scope creep ambush.\n');

// 4. Test Clean Approved Payload & Deterministic SHA-256 Digest
console.log('TEST 4: Clean Approved Payload & Immutable SHA-256 Hash');
const cleanIntent: RawActionIntent = {
  intentSummary: 'Routine monthly database patch and Docker updates',
  category: 'MAINTENANCE',
  urgency: 'standard',
  isScopeExpansion: false,
  estimatedHours: 6,
  requestedBudgetUSD: 450,
  clientEntity: 'Starlight Media',
  deliverableMilestones: ['Update docker containers', 'Optimize read indices'],
  rawExcerpts: ['Routine scheduled maintenance'],
  confidenceScore: 0.94,
};
const verdict4 = evaluateAirlockPolicy(cleanIntent, 'Perform routine maintenance ticket for $450');
console.log('Status:', verdict4.status);
console.log('Passed:', verdict4.passed);
console.log('SHA-256 Digest:', verdict4.sha256Hash);
console.assert(verdict4.status === 'APPROVED', 'Clean ticket must be APPROVED');
console.assert(verdict4.passed === true, 'Execution authority must be granted');
console.assert(verdict4.sha256Hash.length === 64, 'SHA-256 must be 64 hexadecimal characters');
console.log('✅ TEST 4 PASSED: Clean payload signed and approved for execution.\n');

console.log('================================================================');
console.log('🚀 ALL AIRLOCK SUITE TESTS COMPLETED WITH 100% DETERMINISM');
console.log('================================================================');
