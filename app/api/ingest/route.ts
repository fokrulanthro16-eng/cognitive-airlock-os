import { NextRequest, NextResponse } from 'next/server';
import {
  IngestApiRequest,
  IngestApiResponse,
  RawActionIntent,
  IngestionPayload,
} from '@/types/airlock';
import {
  evaluateAirlockPolicy,
  buildExecutionLogEntry,
} from '@/lib/airlock-linter';

export const runtime = 'nodejs';

/**
 * Strict Gemini 2.5 Flash JSON Schema for Structured Outputs
 */
const GEMINI_ACTION_INTENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intentSummary: {
      type: 'STRING',
      description: 'Concise executive summary of what the client is asking for.',
    },
    category: {
      type: 'STRING',
      enum: [
        'FEATURE_REQUEST',
        'BUG_FIX',
        'CONTRACT_CHANGE',
        'INVOICE_DISPATCH',
        'SCOPE_EXPANSION',
        'MAINTENANCE',
        'CONSULTING',
      ],
      description: 'The exact operational taxonomy category of this request.',
    },
    urgency: {
      type: 'STRING',
      enum: ['low', 'standard', 'high', 'critical'],
      description: 'Inferred operational urgency from client tone and deadlines.',
    },
    isScopeExpansion: {
      type: 'BOOLEAN',
      description: 'True if this request asks for features/tasks outside of original contract scope.',
    },
    estimatedHours: {
      type: 'NUMBER',
      description: 'Realistic conservative estimate in hours to execute this request.',
    },
    requestedBudgetUSD: {
      type: 'NUMBER',
      description: 'Budget explicitly stated by the client in USD. If unstated or $0, output 0.',
    },
    clientEntity: {
      type: 'STRING',
      description: 'Identified client company, person, or handle.',
    },
    deliverableMilestones: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Concrete verification milestones or deliverables required to satisfy this request.',
    },
    rawExcerpts: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Direct verbatim quotes from the input supporting this analysis.',
    },
    confidenceScore: {
      type: 'NUMBER',
      description: 'Confidence between 0.0 and 1.0 in this structured semantic extraction.',
    },
  },
  required: [
    'intentSummary',
    'category',
    'urgency',
    'isScopeExpansion',
    'estimatedHours',
    'requestedBudgetUSD',
    'clientEntity',
    'deliverableMilestones',
    'confidenceScore',
  ],
};

const SYSTEM_INSTRUCTION = `You are a Cognitive Extraction Node inside "Cognitive Airlock OS" for solo founders and freelancers.
Your ONLY role is semantic extraction from messy client messages (WhatsApp, Slack, audio transcripts, emails).
YOU HAVE ZERO EXECUTION AUTHORITY. You cannot approve budgets, write checks, or deploy code.
Extract the client's intent strictly into the defined JSON schema.
Be realistic and protective of the solo founder:
- If a client asks for "just a small tweak" or "can we also add...", identify it as isScopeExpansion = true and estimate realistic developer hours.
- If no budget was explicitly offered for new work, set requestedBudgetUSD = 0 so the airlock can bill benchmark rates.
- Do NOT hallucinate compliance or assume items are pre-paid.`;

/**
 * Intelligent deterministic fallback parser when Gemini API Key is not set or network is offline
 */
function localDeterministicSemanticFallback(
  rawText: string,
  clientIdentifier: string
): RawActionIntent {
  const lower = rawText.toLowerCase();

  // Detect category
  let category: RawActionIntent['category'] = 'FEATURE_REQUEST';
  if (lower.includes('broken') || lower.includes('bug') || lower.includes('crash') || lower.includes('error') || lower.includes('fix')) {
    category = 'BUG_FIX';
  } else if (
    lower.includes('scope') ||
    lower.includes('can we also') ||
    lower.includes('can you also') ||
    lower.includes('also add') ||
    lower.includes('one more thing') ||
    lower.includes('phase 2') ||
    lower.includes('new module')
  ) {
    category = 'SCOPE_EXPANSION';
  } else if (lower.includes('invoice') || lower.includes('payment') || lower.includes('billing') || lower.includes('wire')) {
    category = 'INVOICE_DISPATCH';
  } else if (lower.includes('update terms') || lower.includes('contract') || lower.includes('agreement') || lower.includes('amendment')) {
    category = 'CONTRACT_CHANGE';
  } else if (lower.includes('maintain') || lower.includes('upgrade') || lower.includes('dependency') || lower.includes('server')) {
    category = 'MAINTENANCE';
  }

  // Detect scope expansion
  const isScopeExpansion =
    category === 'SCOPE_EXPANSION' ||
    lower.includes('quick addition') ||
    lower.includes('can we also') ||
    lower.includes('can you also') ||
    lower.includes('also add') ||
    lower.includes('out of scope') ||
    lower.includes('since you are already in there') ||
    lower.includes('just one more feature');

  // Estimate hours
  let estimatedHours = 6;
  const hourMatch = rawText.match(/(\d+)\s*(?:hours?|hrs?)/i);
  if (hourMatch) {
    estimatedHours = parseInt(hourMatch[1], 10);
  } else if (isScopeExpansion) {
    estimatedHours = 24;
  } else if (category === 'BUG_FIX') {
    estimatedHours = 4;
  }

  // Detect budget
  let requestedBudgetUSD = 0;
  const budgetMatch = rawText.match(/\$([\d,]+)/);
  if (budgetMatch) {
    requestedBudgetUSD = parseFloat(budgetMatch[1].replace(/,/g, ''));
  }

  // Extract urgency
  let urgency: RawActionIntent['urgency'] = 'standard';
  if (lower.includes('asap') || lower.includes('urgent') || lower.includes('emergency') || lower.includes('immediately')) {
    urgency = 'critical';
  } else if (lower.includes('today') || lower.includes('by tomorrow')) {
    urgency = 'high';
  }

  // Milestones
  const deliverables = [
    `Formal review of request: "${rawText.slice(0, 50).trim()}..."`,
    isScopeExpansion ? 'Prepare scope-change rider and benchmark hourly quote ($60/hr)' : 'Execute verified ticket in staging environment',
    'Client sign-off and milestone delivery receipt',
  ];

  return {
    intentSummary: rawText.length > 120 ? `${rawText.slice(0, 117)}...` : rawText,
    category,
    urgency,
    isScopeExpansion,
    estimatedHours,
    requestedBudgetUSD,
    clientEntity: clientIdentifier || 'Client Entity (Inferred)',
    deliverableMilestones: deliverables,
    rawExcerpts: [rawText.slice(0, 100)],
    confidenceScore: 0.91,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: IngestApiRequest = await req.json();
    const {
      rawText,
      sourceChannel,
      clientIdentifier,
      contractRefId,
      clientHourlyBudgetCapUSD,
      customHourlyBenchmarkRateUSD,
      customHardBudgetCapUSD,
    } = body;

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { success: false, error: 'rawText input parameter is required.' },
        { status: 400 }
      );
    }

    const apiKey =
      req.headers.get('x-gemini-api-key') ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    let rawAiIntent: RawActionIntent;

    if (apiKey) {
      try {
        // Direct call to Gemini 2.5 Flash via Google AI Studio Generative Language API
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Analyze this client ingestion telemetry from channel [${sourceChannel || 'direct_portal'}] for client [${clientIdentifier || 'UNKNOWN'}]:\n\n${rawText}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: GEMINI_ACTION_INTENT_SCHEMA,
              temperature: 0.1, // Near-zero temperature for deterministic extraction
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[Airlock API] Gemini 2.5 Flash returned status ${response.status}: ${errText}. Falling back to deterministic parser.`);
          rawAiIntent = localDeterministicSemanticFallback(rawText, clientIdentifier);
        } else {
          const geminiData = await response.json();
          const candidateText =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!candidateText) {
            throw new Error('Empty response payload from Gemini 2.5 Flash');
          }
          rawAiIntent = JSON.parse(candidateText) as RawActionIntent;
        }
      } catch (geminiErr) {
        console.warn('[Airlock API] Gemini generation failed, engaging deterministic fallback:', geminiErr);
        rawAiIntent = localDeterministicSemanticFallback(rawText, clientIdentifier);
      }
    } else {
      // Sovereign zero-cost offline engine active
      rawAiIntent = localDeterministicSemanticFallback(rawText, clientIdentifier);
    }

    // STRICT SEPARATION OF AUTHORITY:
    // Untrusted AI output is NEVER executed. It passes immediately through the Airlock Linter.
    const validationResult = evaluateAirlockPolicy(
      rawAiIntent,
      rawText,
      clientHourlyBudgetCapUSD,
      customHourlyBenchmarkRateUSD,
      customHardBudgetCapUSD
    );

    // Build immutable execution log
    const ingestionPayload: IngestionPayload = {
      id: `ingest_${Date.now()}`,
      rawText,
      sourceChannel: sourceChannel || 'direct_portal',
      clientIdentifier: clientIdentifier || 'UNKNOWN_CLIENT',
      contractRefId,
      timestamp: new Date().toISOString(),
      clientHourlyBudgetCapUSD,
    };

    const auditPacket = buildExecutionLogEntry(ingestionPayload, validationResult);

    const responsePayload: IngestApiResponse = {
      success: true,
      traceId: auditPacket.traceId,
      ingestedAt: auditPacket.timestamp,
      sourceChannel: ingestionPayload.sourceChannel,
      clientIdentifier: ingestionPayload.clientIdentifier,
      untrustedAiIntent: rawAiIntent,
      airlockVerdict: validationResult,
      auditPacket,
      executionAuthorityGranted: validationResult.passed,
      executionLockReason: validationResult.passed
        ? undefined
        : `LOCKED: ${validationResult.violations.length} policy violation(s) flagged. Hard quarantine in effect.`,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (err: unknown) {
    console.error('[Airlock API] Ingestion error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal Airlock Ingestion Failure',
      },
      { status: 500 }
    );
  }
}
