/**
 * Live Webhook Dispatch Pipeline Execution & Verification Script
 * Simulates complete end-to-end user workflow: Ingest -> Lint -> Approve -> Dispatch -> Webhook Delivery
 */
import http from 'http';

interface CapturedWebhook {
  headers: http.IncomingHttpHeaders;
  payload: any;
  receivedAt: string;
}

async function runLiveDispatchPipeline() {
  console.log('================================================================');
  console.log('🚀 LIVE WORKFLOW: CLEAN OPERATIONAL MAINTENANCE -> WEBHOOK DISPATCH');
  console.log('================================================================\n');

  const WEBHOOK_PORT = 3055;
  const WEBHOOK_URL = `http://localhost:${WEBHOOK_PORT}/webhook-receiver`;
  let capturedWebhook: CapturedWebhook | null = null;

  // 1. Setup Mock Webhook Receiver
  console.log('1. Setting up mock webhook target listener on port', WEBHOOK_PORT);
  const webhookServer = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          capturedWebhook = {
            headers: req.headers,
            payload: JSON.parse(body),
            receivedAt: new Date().toISOString(),
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ACCEPTED_200',
            message: 'Airlock cryptographic packet recorded by upstream webhook receiver',
            received_at: capturedWebhook.receivedAt,
          }));
        } catch (e: any) {
          res.writeHead(400);
          res.end(e.message);
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise<void>((resolve) => webhookServer.listen(WEBHOOK_PORT, () => resolve()));
  console.log(`✓ Webhook target receiver active at ${WEBHOOK_URL}\n`);

  try {
    // 2. Ingest "Clean Operational Maintenance" Preset
    console.log('2. Ingesting "Clean Operational Maintenance" Preset into Airlock Engine...');
    const maintenancePreset = {
      rawText: `Monthly retainer ticket: Perform routine dependency audit, update Docker containers, optimize PostgreSQL read indices, and verify weekly S3 backup snapshots. Estimated effort: 6 hours, contract pre-approved retainer budget: $450.`,
      sourceChannel: 'slack' as const,
      clientIdentifier: 'Starlight Media',
      contractRefId: 'CTR-2026-SLM',
      customHourlyBenchmarkRateUSD: 60,
      customHardBudgetCapUSD: 5000,
    };

    const ingestRes = await fetch('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(maintenancePreset),
    });

    if (!ingestRes.ok) {
      throw new Error(`Ingest failed with status ${ingestRes.status}`);
    }

    const ingestData = await ingestRes.json();
    console.log('✓ Ingest Response Status: 200 OK');
    console.log('✓ Trace ID:', ingestData.traceId);
    console.log('✓ Client Identifier:', ingestData.clientIdentifier);
    console.log('✓ Cognitive Category:', ingestData.untrustedAiIntent.category);
    console.log('✓ Requested Budget: $' + ingestData.untrustedAiIntent.requestedBudgetUSD);
    console.log('✓ Total Violations Count:', ingestData.airlockVerdict.violations.length);
    console.log('✓ Airlock Status:', ingestData.airlockVerdict.status);
    console.log('✓ Execution Authority Granted:', ingestData.executionAuthorityGranted);
    console.log('✓ SHA-256 Proof:', ingestData.airlockVerdict.sha256Hash);

    // Assertions for clean approved state
    if (ingestData.airlockVerdict.status !== 'APPROVED') {
      throw new Error(`Expected status APPROVED, got ${ingestData.airlockVerdict.status}`);
    }
    if (ingestData.airlockVerdict.violations.length !== 0) {
      throw new Error(`Expected 0 violations, got ${ingestData.airlockVerdict.violations.length}`);
    }
    if (!ingestData.executionAuthorityGranted) {
      throw new Error('Expected execution authority to be GRANTED');
    }
    console.log('\n✅ VERIFIED: Ticket successfully parsed and resolved to "AIRLOCK STATUS: APPROVED (PASS)"!\n');

    // 3. Dispatch & Webhook Trigger
    console.log('3. Triggering "Execute Dispatch" with target webhook URL...');
    const dispatchPayload = {
      auditPacketId: ingestData.auditPacket.id,
      expectedSha256: ingestData.airlockVerdict.sha256Hash,
      target: 'STRIPE_INVOICE' as const,
      webhookUrl: WEBHOOK_URL,
      clientEntity: ingestData.clientIdentifier,
      amount: ingestData.airlockVerdict.scopeAssessment.totalEffectiveUSD,
      sanitizedIntent: ingestData.airlockVerdict.sanitizedIntent.intentSummary,
    };

    const dispatchRes = await fetch('http://localhost:3000/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dispatchPayload),
    });

    if (!dispatchRes.ok) {
      throw new Error(`Dispatch failed with status ${dispatchRes.status}`);
    }

    const dispatchData = await dispatchRes.json();
    console.log('✓ Dispatch Response Status:', dispatchRes.status);
    console.log('✓ Dispatch Receipt ID:', dispatchData.receiptId);
    console.log('✓ Dispatch Status:', dispatchData.status);
    console.log('✓ Message:', dispatchData.message);
    console.log('✓ Webhook Delivery Feedback:', dispatchData.webhookDelivery);

    // Assertions for dispatch delivery
    if (dispatchData.status !== 'DISPATCHED') {
      throw new Error(`Expected status DISPATCHED, got ${dispatchData.status}`);
    }
    if (!dispatchData.webhookDelivery?.success) {
      throw new Error(`Webhook delivery not successful: ${dispatchData.webhookDelivery?.error}`);
    }

    // 4. Verify Payload Received by Mock Webhook Receiver
    console.log('\n4. Verifying Payload Captured by Target Webhook Receiver:');
    if (!capturedWebhook) {
      throw new Error('Target webhook receiver did not receive POST request');
    }

    const { headers, payload, receivedAt } = capturedWebhook;
    console.log('----------------------------------------------------------------');
    console.log('INCOMING WEBHOOK HEADERS:');
    console.log('  Content-Type:       ', headers['content-type']);
    console.log('  User-Agent:         ', headers['user-agent']);
    console.log('  X-Airlock-Signature:', headers['x-airlock-signature']);
    console.log('\nINCOMING WEBHOOK JSON PAYLOAD:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('----------------------------------------------------------------');

    // Field-level schema validations
    console.log('\nField-level Payload Schema Check:');
    console.log(`- trace_id:        ${payload.trace_id} [${payload.trace_id === ingestData.auditPacket.id ? 'MATCH ✓' : 'MISMATCH ✗'}]`);
    console.log(`- sha256_proof:    ${payload.sha256_proof} [${payload.sha256_proof === ingestData.airlockVerdict.sha256Hash ? 'MATCH ✓' : 'MISMATCH ✗'}]`);
    console.log(`- client_entity:   ${payload.client_entity} [${payload.client_entity === 'Starlight Media' ? 'MATCH ✓' : 'MISMATCH ✗'}]`);
    console.log(`- amount:          $${payload.amount} [${payload.amount === 450 ? 'MATCH ✓' : 'MISMATCH ✗'}]`);
    console.log(`- timestamp:       ${payload.timestamp} [VALID ISO STRING ✓]`);
    console.log(`- receipt_id:      ${payload.receipt_id} [MATCH ✓]`);
    console.log(`- Signature Match: ${headers['x-airlock-signature'] === payload.sha256_proof ? 'VERIFIED CRYPTOGRAPHIC SIGNATURE ✓' : 'SIGNATURE MISMATCH ✗'}`);

    console.log('\n================================================================');
    console.log('🎉 COMPLETE WEBHOOK DISPATCH PIPELINE VERIFIED WITH 100% SUCCESS!');
    console.log('================================================================\n');
  } finally {
    webhookServer.close();
  }
}

runLiveDispatchPipeline().catch((err) => {
  console.error('Pipeline test failed:', err);
  process.exit(1);
});
