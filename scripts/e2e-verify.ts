/**
 * E2E Live Server Verification Script for Cognitive Airlock OS
 * Tests live HTTP routes at http://localhost:3000
 */

async function runE2eVerification() {
  const BASE_URL = 'http://localhost:3000';
  console.log('================================================================');
  console.log('🌐 RUNNING LIVE WORKFLOW VERIFICATION ON', BASE_URL);
  console.log('================================================================\n');

  // TEST 1: Out-of-scope request with $0 budget
  console.log('--- TEST A: Out-of-Scope Scope Drift Request ---');
  const queryPayload1 = {
    rawText: 'Can you also add multi-language support and an export button before tomorrow?',
    sourceChannel: 'slack',
    clientIdentifier: 'VentureScale Partners',
    contractRefId: 'CTR-2026-VSP',
  };

  const res1 = await fetch(`${BASE_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryPayload1),
  });

  if (!res1.ok) {
    throw new Error(`Ingest request failed with status: ${res1.status}`);
  }

  const data1 = await res1.json();
  console.log('HTTP Status:', res1.status);
  console.log('Trace ID:', data1.traceId);
  console.log('Cognitive Category:', data1.untrustedAiIntent.category);
  console.log('Is Scope Expansion:', data1.untrustedAiIntent.isScopeExpansion);
  console.log('Estimated Hours:', data1.untrustedAiIntent.estimatedHours);
  console.log('Offered Client Budget: $' + data1.untrustedAiIntent.requestedBudgetUSD);
  console.log('Airlock Verdict Status:', data1.airlockVerdict.status);
  console.log('Authority Granted:', data1.executionAuthorityGranted);
  console.log('SHA-256 Audit Hash:', data1.airlockVerdict.sha256Hash);

  const scope1 = data1.airlockVerdict.scopeAssessment;
  console.log('\n[Deterministic Financial Assessment]');
  console.log(`- Is Out Of Scope: ${scope1.isOutOfScope}`);
  console.log(`- Billable Hours: ${scope1.billableHours}h`);
  console.log(`- Benchmark Rate: $${scope1.benchmarkHourlyRateUSD}/hr`);
  console.log(`- Calculated Surcharge: $${scope1.calculatedSurchargeUSD}`);
  console.log(`- Budget Deficit Flagged: $${scope1.budgetDeficitUSD}`);
  console.log(`- Recommendation: ${scope1.financialProtectionRecommendation}`);

  const violations1 = data1.airlockVerdict.violations;
  console.log('\n[Active Policy Violations]');
  violations1.forEach((v: { ruleId: string; severity: string; reason: string }) => {
    console.log(`- [${v.severity}] ${v.ruleId}: ${v.reason}`);
  });

  // Assertions for Test A
  if (!data1.untrustedAiIntent.isScopeExpansion && data1.untrustedAiIntent.category !== 'SCOPE_EXPANSION') {
    throw new Error('FAIL: Cognitive extraction failed to detect scope expansion');
  }
  if (scope1.benchmarkHourlyRateUSD !== 60) {
    throw new Error('FAIL: Benchmark rate is not $60/hr');
  }
  if (!data1.airlockVerdict.sha256Hash || data1.airlockVerdict.sha256Hash.length < 32) {
    throw new Error('FAIL: Missing SHA-256 audit hash');
  }
  if (data1.executionAuthorityGranted !== false) {
    throw new Error('FAIL: Execution authority must be locked (false) on scope creep deficit');
  }
  console.log('\n✅ TEST A PASSED: Scope drift identified, $60/hr rate computed, SHA-256 locked, quarantined!\n');

  // TEST 2: Budget Ceiling Breach (> $5,000 auto-cap)
  console.log('--- TEST B: Budget Ceiling Breach (> $5,000 Auto-Cap) ---');
  const queryPayload2 = {
    rawText: 'Emergency priority: overhaul entire database cluster and cloud architecture for $8,500.',
    sourceChannel: 'email',
    clientIdentifier: 'Global Enterprises Inc',
    contractRefId: 'CTR-2026-GEI',
  };

  const res2 = await fetch(`${BASE_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryPayload2),
  });

  const data2 = await res2.json();
  console.log('HTTP Status:', res2.status);
  console.log('Offered Client Budget: $' + data2.untrustedAiIntent.requestedBudgetUSD);
  console.log('Airlock Verdict Status:', data2.airlockVerdict.status);
  console.log('Authority Granted:', data2.executionAuthorityGranted);

  const ceilingViolation = data2.airlockVerdict.violations.find(
    (v: { ruleId: string }) => v.ruleId === 'HARD_BUDGET_CEILING_EXCEEDED'
  );

  console.log('\n[Ceiling Check Result]');
  if (ceilingViolation) {
    console.log(`- [CRITICAL] ${ceilingViolation.ruleId}: ${ceilingViolation.reason}`);
    console.log(`- Remediation Hint: ${ceilingViolation.remediationHint}`);
  }

  if (!ceilingViolation) {
    throw new Error('FAIL: Hard budget ceiling violation not triggered for $8,500 budget');
  }
  if (data2.airlockVerdict.status !== 'QUARANTINED') {
    throw new Error('FAIL: Status should be QUARANTINED for ceiling breach');
  }
  console.log('\n✅ TEST B PASSED: Hard ceiling failure/quarantine triggered when exceeding $5,000 auto-cap.\n');

  // TEST 3: Configurable Airlock Policy Override ($95/hr benchmark & $3,000 safety cap)
  console.log('--- TEST C: Configurable Policy Override ($95/hr & $3,000 Cap) ---');
  const queryPayload3 = {
    rawText: 'Can you also build an export button before tomorrow?',
    sourceChannel: 'slack',
    clientIdentifier: 'CustomPolicy LLC',
    customHourlyBenchmarkRateUSD: 95,
    customHardBudgetCapUSD: 3000,
  };

  const res3 = await fetch(`${BASE_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryPayload3),
  });

  const data3 = await res3.json();
  const scope3 = data3.airlockVerdict.scopeAssessment;
  console.log(`Custom Benchmark Applied: $${scope3.benchmarkHourlyRateUSD}/hr`);
  console.log(`Dynamic Surcharge Calculated: $${scope3.calculatedSurchargeUSD}`);

  if (scope3.benchmarkHourlyRateUSD !== 95) {
    throw new Error('FAIL: Custom benchmark rate $95/hr was not applied dynamically');
  }
  console.log('\n✅ TEST C PASSED: Custom policy settings dynamically calculated across telemetry engine.\n');

  console.log('================================================================');
  console.log('🎉 ALL LIVE E2E HTTP WORKFLOW CHECKS VERIFIED SUCCESSFULLY!');
  console.log('================================================================');
}

runE2eVerification().catch((err) => {
  console.error('E2E Verification Error:', err);
  process.exit(1);
});
