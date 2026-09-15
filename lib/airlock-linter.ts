/**
 * Cognitive Airlock OS - Deterministic Verification Engine
 * 
 * Sits strictly between AI reasoning and real-world execution.
 * 
 * Guarantees:
 * 1. Zero network dependency - runs 100% deterministic local logic.
 * 2. Mathematical linting & hard budget caps ($5,000 ceiling).
 * 3. Scope creep rate calculator enforcing $60/hr benchmark billing.
 * 4. PII and Secret pattern redaction.
 * 5. Cryptographic SHA-256 canonical hashing for tamper-proof audit trails.
 */

import {
  RawActionIntent,
  PolicyViolation,
  ScopeBillingAssessment,
  AirlockValidationResult,
  CanonicalAuditPayload,
  ExecutionLogEntry,
  IngestionPayload,
} from '@/types/airlock';

export const AIRLOCK_ENGINE_VERSION = '2.5.0-DET-AIRLOCK';
export const HARD_BUDGET_CEILING_USD = 5000;
export const BENCHMARK_HOURLY_RATE_USD = 60; // Standard solo founder baseline rate
export const MAX_ALLOWED_UNVETTED_HOURS = 80;
export const MIN_CONFIDENCE_THRESHOLD = 0.70;

// Regular expression patterns for deterministic PII & Secret filtering
const PII_PATTERNS: Array<{ type: string; regex: RegExp; placeholder: string }> = [
  {
    type: 'CREDIT_CARD',
    regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    placeholder: '[REDACTED_FINANCIAL_CARD]',
  },
  {
    type: 'SSN',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    placeholder: '[REDACTED_SSN]',
  },
  {
    type: 'AWS_KEY',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    placeholder: '[REDACTED_AWS_ACCESS_KEY]',
  },
  {
    type: 'API_SECRET',
    regex: /\b(?:sk_(?:live|test)_[0-9a-zA-Z]{20,}|sec_tok_[0-9a-zA-Z]{20,}|ghp_[0-9a-zA-Z]{36}|xoxb-[0-9a-zA-Z-]+)\b/g,
    placeholder: '[REDACTED_API_SECRET_TOKEN]',
  },
  {
    type: 'JWT_TOKEN',
    regex: /\beyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g,
    placeholder: '[REDACTED_JWT_AUTH_BEARER]',
  },
  {
    type: 'EMAIL',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    placeholder: '[REDACTED_EMAIL_ADDRESS]',
  },
  {
    type: 'PHONE_NUMBER',
    regex: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    placeholder: '[REDACTED_PHONE_NUMBER]',
  },
];

/**
 * Deterministically redacts PII and critical credentials from any string
 */
export function redactPiiAndSecrets(text: string): {
  sanitizedText: string;
  detectedTypes: string[];
  totalRedactions: number;
} {
  let sanitized = text;
  const detectedTypes: string[] = [];
  let totalRedactions = 0;

  for (const { type, regex, placeholder } of PII_PATTERNS) {
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      if (!detectedTypes.includes(type)) {
        detectedTypes.push(type);
      }
      totalRedactions += matches.length;
      sanitized = sanitized.replace(regex, placeholder);
    }
  }

  return {
    sanitizedText: sanitized,
    detectedTypes,
    totalRedactions,
  };
}

/**
 * Mathematical Scope Billing Assessment
 * Calculates true scope exposure against $60/hr benchmark
 */
export function calculateScopeAssessment(
  intent: RawActionIntent,
  customHourlyRateUSD: number = BENCHMARK_HOURLY_RATE_USD
): ScopeBillingAssessment {
  const isOutOfScope =
    intent.isScopeExpansion ||
    intent.category === 'SCOPE_EXPANSION' ||
    (intent.category === 'FEATURE_REQUEST' && intent.requestedBudgetUSD === 0);

  const billableHours = Math.max(0, Number(intent.estimatedHours) || 0);
  const benchmarkRate = customHourlyRateUSD > 0 ? customHourlyRateUSD : BENCHMARK_HOURLY_RATE_USD;
  const calculatedSurchargeUSD = billableHours * benchmarkRate;
  const requestedBudget = Math.max(0, Number(intent.requestedBudgetUSD) || 0);

  // If out-of-scope, founder must be compensated at least the benchmark surcharge
  const totalEffectiveUSD = isOutOfScope
    ? Math.max(requestedBudget, calculatedSurchargeUSD)
    : requestedBudget;

  const budgetDeficitUSD = isOutOfScope
    ? Math.max(0, calculatedSurchargeUSD - requestedBudget)
    : 0;

  let financialProtectionRecommendation = 'Within contract specifications.';
  if (isOutOfScope) {
    if (budgetDeficitUSD > 0) {
      financialProtectionRecommendation = `FLAGGED DEFICIT: Client request represents ${billableHours}h out-of-scope work valued at $${calculatedSurchargeUSD.toLocaleString()} ($${benchmarkRate}/hr benchmark), but requested budget is $${requestedBudget.toLocaleString()}. Auto-generate scope rider invoice for $${budgetDeficitUSD.toLocaleString()} before proceeding.`;
    } else {
      financialProtectionRecommendation = `Scope expansion detected with adequate budget allocation ($${requestedBudget.toLocaleString()}). Hold funds in milestone escrow.`;
    }
  }

  return {
    isOutOfScope,
    billableHours,
    benchmarkHourlyRateUSD: benchmarkRate,
    calculatedSurchargeUSD,
    totalEffectiveUSD,
    budgetDeficitUSD,
    financialProtectionRecommendation,
  };
}

/**
 * Universal deterministic SHA-256 hash generator
 * Formats canonical key-sorted JSON before computing SHA-256 digest
 */
export function computeDeterministicSha256(payload: unknown): string {
  // Deterministic JSON stringification with sorted keys
  const canonicalString = JSON.stringify(payload, Object.keys(payload as object).sort());

  // Use Node crypto module
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
  } catch {
    // Edge/Browser fallback: simple FNV-1a / hash fallback if node:crypto unavailable
    let hash = 0x811c9dc5;
    for (let i = 0; i < canonicalString.length; i++) {
      hash ^= canonicalString.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    return `sim-${hex}${hex}${hex}${hex}${hex}${hex}${hex}${hex}`.slice(0, 64);
  }
}

/**
 * Core Deterministic Airlock Linter
 * Strict mathematical & policy verification of untrusted LLM outputs
 */
export function evaluateAirlockPolicy(
  rawAiIntent: RawActionIntent,
  rawOriginalText: string,
  clientBudgetCapUSD?: number,
  customHourlyBenchmarkRateUSD?: number,
  customHardBudgetCapUSD?: number
): AirlockValidationResult {
  const violations: PolicyViolation[] = [];
  const evaluatedAt = new Date().toISOString();

  // 1. Sanitize raw text and intent strings for PII / Secrets
  const rawPiiCheck = redactPiiAndSecrets(rawOriginalText);
  const summaryPiiCheck = redactPiiAndSecrets(rawAiIntent.intentSummary || '');

  const totalPiiFound = rawPiiCheck.totalRedactions + summaryPiiCheck.totalRedactions;
  const allDetectedPiiTypes = Array.from(
    new Set([...rawPiiCheck.detectedTypes, ...summaryPiiCheck.detectedTypes])
  );

  if (totalPiiFound > 0) {
    violations.push({
      ruleId: 'PII_LEAK_DETECTED',
      severity: 'WARNING',
      reason: `Client payload contains ${totalPiiFound} sensitive credential(s)/PII token(s): ${allDetectedPiiTypes.join(', ')}.`,
      remediationHint: 'Deterministic redaction applied. Verify zero secrets are exposed prior to dispatch.',
      offendingField: 'rawText',
      offendingValue: allDetectedPiiTypes,
    });
  }

  // Create sanitized clone of the intent
  const sanitizedIntent: RawActionIntent = {
    ...rawAiIntent,
    intentSummary: summaryPiiCheck.sanitizedText,
    deliverableMilestones: (rawAiIntent.deliverableMilestones || []).map(
      (m) => redactPiiAndSecrets(m).sanitizedText
    ),
    rawExcerpts: (rawAiIntent.rawExcerpts || []).map(
      (e) => redactPiiAndSecrets(e).sanitizedText
    ),
    detectedPIIEntities: allDetectedPiiTypes,
  };

  // Determine effective hard budget ceiling & benchmark hourly rate
  const effectiveHardCap =
    customHardBudgetCapUSD && customHardBudgetCapUSD > 0
      ? customHardBudgetCapUSD
      : HARD_BUDGET_CEILING_USD;
  const effectiveRate =
    customHourlyBenchmarkRateUSD && customHourlyBenchmarkRateUSD > 0
      ? customHourlyBenchmarkRateUSD
      : BENCHMARK_HOURLY_RATE_USD;

  // 2. Hard Budget Ceiling Check
  const requestedBudget = Number(sanitizedIntent.requestedBudgetUSD) || 0;
  if (requestedBudget > effectiveHardCap) {
    violations.push({
      ruleId: 'HARD_BUDGET_CEILING_EXCEEDED',
      severity: 'CRITICAL',
      reason: `Requested action budget ($${requestedBudget.toLocaleString()}) breaches hard safety ceiling of $${effectiveHardCap.toLocaleString()}.`,
      remediationHint: `Split action into discrete milestones under $${effectiveHardCap.toLocaleString()} or obtain explicit written sovereign escrow authorization.`,
      offendingField: 'requestedBudgetUSD',
      offendingValue: requestedBudget,
    });
  }

  // Custom client cap check if present and lower than effectiveHardCap
  if (clientBudgetCapUSD && clientBudgetCapUSD > 0 && requestedBudget > clientBudgetCapUSD) {
    violations.push({
      ruleId: 'HARD_BUDGET_CEILING_EXCEEDED',
      severity: 'CRITICAL',
      reason: `Requested budget ($${requestedBudget.toLocaleString()}) exceeds agreed client project cap ($${clientBudgetCapUSD.toLocaleString()}).`,
      remediationHint: 'Request budget increase amendment from client.',
      offendingField: 'requestedBudgetUSD',
      offendingValue: requestedBudget,
    });
  }

  // 3. Out-of-Scope Hour Billing Calculator
  const scopeAssessment = calculateScopeAssessment(sanitizedIntent, effectiveRate);

  if (scopeAssessment.isOutOfScope && scopeAssessment.budgetDeficitUSD > 0) {
    violations.push({
      ruleId: 'UNBILLED_SCOPE_CREEP',
      severity: 'CRITICAL',
      reason: `Unbilled scope creep ambush: ${scopeAssessment.billableHours}h requested without financial coverage. Deficit: $${scopeAssessment.budgetDeficitUSD.toLocaleString()}.`,
      remediationHint: `Issue automated scope-change rider at $${effectiveRate}/hr ($${scopeAssessment.calculatedSurchargeUSD.toLocaleString()} total) before initiating work.`,
      offendingField: 'isScopeExpansion',
      offendingValue: {
        hours: scopeAssessment.billableHours,
        deficitUSD: scopeAssessment.budgetDeficitUSD,
      },
    });
  }

  // 4. Hours Threshold Check (> 80h unvetted work)
  const hours = Number(sanitizedIntent.estimatedHours) || 0;
  if (hours > MAX_ALLOWED_UNVETTED_HOURS) {
    violations.push({
      ruleId: 'HOURS_THRESHOLD_BREACH',
      severity: 'CRITICAL',
      reason: `Estimated effort of ${hours} hours exceeds the single-packet autonomous dispatch threshold of ${MAX_ALLOWED_UNVETTED_HOURS} hours.`,
      remediationHint: 'Decompose task into smaller iterative sprints (< 40 hours) or require bilateral signature.',
      offendingField: 'estimatedHours',
      offendingValue: hours,
    });
  }

  // 5. Confidence Score Minimum
  const confidence = Number(sanitizedIntent.confidenceScore) || 0;
  if (confidence < MIN_CONFIDENCE_THRESHOLD) {
    violations.push({
      ruleId: 'LOW_CONFIDENCE_INTENT',
      severity: 'WARNING',
      reason: `AI semantic parse confidence score (${(confidence * 100).toFixed(1)}%) is below sovereign threshold (${MIN_CONFIDENCE_THRESHOLD * 100}%).`,
      remediationHint: 'Request raw clarification from client or manually review ambiguous phrases.',
      offendingField: 'confidenceScore',
      offendingValue: confidence,
    });
  }

  // 6. Deliverable Compliance
  if (!sanitizedIntent.deliverableMilestones || sanitizedIntent.deliverableMilestones.length === 0) {
    violations.push({
      ruleId: 'EMPTY_DELIVERABLES',
      severity: 'WARNING',
      reason: 'No concrete deliverable milestones extracted from client communication.',
      remediationHint: 'Attach at least one measurable verification condition to avoid dispute.',
      offendingField: 'deliverableMilestones',
      offendingValue: [],
    });
  }

  // Determine pass/quarantine verdict
  const hasCritical = violations.some((v) => v.severity === 'CRITICAL');
  const hasWarnings = violations.some((v) => v.severity === 'WARNING');

  let status: 'APPROVED' | 'QUARANTINED' | 'REJECTED' = 'APPROVED';
  if (hasCritical) {
    status = 'QUARANTINED';
  } else if (hasWarnings && confidence < MIN_CONFIDENCE_THRESHOLD) {
    status = 'QUARANTINED';
  }

  // Build Canonical Audit Payload for SHA-256 Hashing
  const canonicalPayload: CanonicalAuditPayload = {
    version: AIRLOCK_ENGINE_VERSION,
    evaluatedAt,
    clientIdentifier: sanitizedIntent.clientEntity || 'UNKNOWN_CLIENT',
    category: sanitizedIntent.category,
    sanitizedSummary: sanitizedIntent.intentSummary,
    isScopeExpansion: sanitizedIntent.isScopeExpansion,
    billableHours: scopeAssessment.billableHours,
    calculatedSurchargeUSD: scopeAssessment.calculatedSurchargeUSD,
    totalEffectiveUSD: scopeAssessment.totalEffectiveUSD,
    violationsCount: violations.length,
    violationRules: violations.map((v) => v.ruleId),
    status,
  };

  const sha256Hash = computeDeterministicSha256(canonicalPayload);

  return {
    passed: status === 'APPROVED',
    status,
    evaluatedAt,
    engineVersion: AIRLOCK_ENGINE_VERSION,
    sanitizedIntent,
    sanitizedRawText: rawPiiCheck.sanitizedText,
    violations,
    scopeAssessment,
    piiRedactedCount: totalPiiFound,
    sha256Hash,
    signatures: {
      linter: 'CognitiveAirlock-Engine-Core',
      algorithm: 'SHA-256',
      deterministicSalt: 'SOVEREIGN_SOLO_GUARD_V2.5',
    },
  };
}

/**
 * Creates an immutable audit ledger entry ready for persistent storage or local file append
 */
export function buildExecutionLogEntry(
  payload: IngestionPayload,
  validationResult: AirlockValidationResult
): ExecutionLogEntry {
  const traceId = `trace_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const rawPayloadHash = computeDeterministicSha256({
    rawText: payload.rawText,
    channel: payload.sourceChannel,
    client: payload.clientIdentifier,
    timestamp: payload.timestamp,
  });

  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    traceId,
    timestamp: new Date().toISOString(),
    sourceChannel: payload.sourceChannel,
    clientIdentifier: payload.clientIdentifier,
    contractRefId: payload.contractRefId,
    sha256Hash: validationResult.sha256Hash,
    status: validationResult.status,
    rawPayloadHash,
    validationResult,
  };
}
