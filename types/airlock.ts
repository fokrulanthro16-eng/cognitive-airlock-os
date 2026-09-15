/**
 * Cognitive Airlock OS - Core System Type Definitions
 * 
 * Strict separation of authority:
 * 1. Ingestion Payload: Untrusted raw client telemetry
 * 2. Raw Action Intent: Unvalidated semantic extraction produced by LLM
 * 3. Policy Rule & Violations: Deterministic compliance assessments
 * 4. Scope Assessment: Mathematical out-of-scope billing computation
 * 5. Airlock Validation Result: Cryptographically verifiable pass/quarantine verdict
 * 6. Immutable Execution Log: SHA-256 sealed audit packet
 */

export type SourceChannel =
  | 'whatsapp'
  | 'slack'
  | 'email'
  | 'audio_transcript'
  | 'meeting_notes'
  | 'direct_portal';

export type UrgencyLevel = 'low' | 'standard' | 'high' | 'critical';

export type ActionCategory =
  | 'FEATURE_REQUEST'
  | 'BUG_FIX'
  | 'CONTRACT_CHANGE'
  | 'INVOICE_DISPATCH'
  | 'SCOPE_EXPANSION'
  | 'MAINTENANCE'
  | 'CONSULTING';

export type AirlockStatus = 'APPROVED' | 'QUARANTINED' | 'REJECTED' | 'DISPATCHED';

export type ViolationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type PolicyRuleId =
  | 'PII_LEAK_DETECTED'
  | 'HARD_BUDGET_CEILING_EXCEEDED'
  | 'UNBILLED_SCOPE_CREEP'
  | 'HOURS_THRESHOLD_BREACH'
  | 'LOW_CONFIDENCE_INTENT'
  | 'UNVERIFIED_CLIENT_ENTITY'
  | 'EMPTY_DELIVERABLES';

/**
 * Raw input ingested from the client interaction channel
 */
export interface IngestionPayload {
  id: string;
  rawText: string;
  sourceChannel: SourceChannel;
  clientIdentifier: string;
  timestamp: string;
  contractRefId?: string;
  clientHourlyBudgetCapUSD?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Structured ActionIntent produced by Gemini 2.5 Flash via response_schema.
 * NOTICE: LLM has ZERO execution authority. This output is treated as UNTRUSTED
 * until fully vetted by the Deterministic Airlock Linter.
 */
export interface RawActionIntent {
  intentSummary: string;
  category: ActionCategory;
  urgency: UrgencyLevel;
  isScopeExpansion: boolean;
  estimatedHours: number;
  requestedBudgetUSD: number;
  clientEntity: string;
  deliverableMilestones: string[];
  rawExcerpts: string[];
  confidenceScore: number;
  detectedPIIEntities?: string[];
}

/**
 * Individual deterministic violation flagged by the linter
 */
export interface PolicyViolation {
  ruleId: PolicyRuleId;
  severity: ViolationSeverity;
  reason: string;
  remediationHint: string;
  offendingField: string;
  offendingValue?: unknown;
}

/**
 * Out-of-scope hour billing calculations based on the $60/hr benchmark
 */
export interface ScopeBillingAssessment {
  isOutOfScope: boolean;
  billableHours: number;
  benchmarkHourlyRateUSD: number;
  calculatedSurchargeUSD: number;
  totalEffectiveUSD: number;
  budgetDeficitUSD: number;
  financialProtectionRecommendation: string;
}

/**
 * Full output of the deterministic airlock verification pipeline
 */
export interface AirlockValidationResult {
  passed: boolean;
  status: 'APPROVED' | 'QUARANTINED' | 'REJECTED';
  evaluatedAt: string;
  engineVersion: string;
  sanitizedIntent: RawActionIntent;
  sanitizedRawText: string;
  violations: PolicyViolation[];
  scopeAssessment: ScopeBillingAssessment;
  piiRedactedCount: number;
  sha256Hash: string;
  signatures: {
    linter: string;
    algorithm: 'SHA-256';
    deterministicSalt: string;
  };
}

/**
 * Canonical packet structure signed into the SHA-256 hash
 */
export interface CanonicalAuditPayload {
  version: string;
  evaluatedAt: string;
  clientIdentifier: string;
  category: ActionCategory;
  sanitizedSummary: string;
  isScopeExpansion: boolean;
  billableHours: number;
  calculatedSurchargeUSD: number;
  totalEffectiveUSD: number;
  violationsCount: number;
  violationRules: PolicyRuleId[];
  status: 'APPROVED' | 'QUARANTINED' | 'REJECTED';
}

/**
 * Immutable ledger entry for persistent audit trails and dispatch verification
 */
export interface ExecutionLogEntry {
  id: string;
  traceId: string;
  timestamp: string;
  sourceChannel: SourceChannel;
  clientIdentifier: string;
  contractRefId?: string;
  sha256Hash: string;
  status: AirlockStatus;
  rawPayloadHash: string;
  validationResult: AirlockValidationResult;
  dispatchedAt?: string;
  dispatchTarget?: 'STRIPE_INVOICE' | 'QUICKBOOKS' | 'SLACK_ALERT' | 'TRELLO_CARD' | 'LOCAL_VAULT';
  dispatchReceipt?: {
    receiptId: string;
    externalEndpoint: string;
    dispatchStatus: 'SUCCESS' | 'DRY_RUN';
    operatorSignature: string;
  };
}

export interface AirlockPolicyConfig {
  hourlyBenchmarkRateUSD: number;
  hardBudgetCapUSD: number;
  webhookUrl?: string;
}

/**
 * API Ingestion Request & Response definitions
 */
export interface IngestApiRequest {
  rawText: string;
  sourceChannel: SourceChannel;
  clientIdentifier: string;
  contractRefId?: string;
  clientHourlyBudgetCapUSD?: number;
  customHourlyBenchmarkRateUSD?: number;
  customHardBudgetCapUSD?: number;
}

export interface IngestApiResponse {
  success: boolean;
  traceId: string;
  ingestedAt: string;
  sourceChannel: SourceChannel;
  clientIdentifier: string;
  untrustedAiIntent: RawActionIntent;
  airlockVerdict: AirlockValidationResult;
  auditPacket: ExecutionLogEntry;
  executionAuthorityGranted: boolean;
  executionLockReason?: string;
}

export interface DispatchApiRequest {
  auditPacketId: string;
  expectedSha256: string;
  target: 'STRIPE_INVOICE' | 'QUICKBOOKS' | 'SLACK_ALERT' | 'TRELLO_CARD' | 'LOCAL_VAULT';
  overrideNotes?: string;
  webhookUrl?: string;
  clientEntity?: string;
  amount?: number;
  sanitizedIntent?: string;
}

export interface WebhookDeliveryStatus {
  attempted: boolean;
  success: boolean;
  statusCode?: number;
  endpoint?: string;
  responseSnippet?: string;
  error?: string;
}

export interface DispatchApiResponse {
  success: boolean;
  receiptId: string;
  dispatchedAt: string;
  target: string;
  verifiedSha256: string;
  status: 'DISPATCHED' | 'FAILED_REJECTED';
  message: string;
  webhookDelivery?: WebhookDeliveryStatus;
}
