/**
 * Test Webhook Automation Dispatch Pipeline for Cognitive Airlock OS
 */
import http from 'http';

async function testWebhookDispatch() {
  console.log('================================================================');
  console.log('🔗 TESTING WEBHOOK AUTOMATION DISPATCH PIPELINE');
  console.log('================================================================\n');

  // 1. Spin up a temporary local HTTP mock webhook server on port 3099
  let receivedWebhookPayload: any = null;
  let receivedSignature: string | undefined = undefined;

  const mockWebhookServer = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        receivedWebhookPayload = JSON.parse(body);
        receivedSignature = req.headers['x-airlock-signature'] as string;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', received: true }));
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise<void>((resolve) => {
    mockWebhookServer.listen(3099, () => {
      console.log('✓ Mock webhook receiver listening on http://localhost:3099');
      resolve();
    });
  });

  try {
    const validSha256 = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

    console.log('\nDispatching action to http://localhost:3000/api/dispatch with webhook URL...');
    const dispatchRes = await fetch('http://localhost:3000/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auditPacketId: 'trace_test_webhook_123',
        expectedSha256: validSha256,
        target: 'STRIPE_INVOICE',
        webhookUrl: 'http://localhost:3099',
        clientEntity: 'Autonomous Growth Partners',
        amount: 2450,
        sanitizedIntent: 'Deploy verified multi-currency payments module',
      }),
    });

    const dispatchData = await dispatchRes.json();
    console.log('Dispatch Response Status:', dispatchRes.status);
    console.log('Receipt ID:', dispatchData.receiptId);
    console.log('Message:', dispatchData.message);
    console.log('Webhook Delivery Status:', dispatchData.webhookDelivery);

    // Verify assertions
    if (!dispatchData.success) {
      throw new Error('Dispatch failed');
    }
    if (!dispatchData.webhookDelivery?.attempted || !dispatchData.webhookDelivery?.success) {
      throw new Error('Webhook delivery was not recorded as successful');
    }
    if (!receivedWebhookPayload) {
      throw new Error('Mock receiver did not receive webhook payload');
    }

    console.log('\n[Received Webhook Payload on Mock Receiver]');
    console.log(JSON.stringify(receivedWebhookPayload, null, 2));
    console.log('X-Airlock-Signature Header:', receivedSignature);

    if (receivedWebhookPayload.client_entity !== 'Autonomous Growth Partners') {
      throw new Error('Client entity mismatch in webhook payload');
    }
    if (receivedSignature !== validSha256) {
      throw new Error('Cryptographic signature mismatch in webhook header');
    }

    console.log('\n✅ WEBHOOK AUTOMATION DISPATCH VERIFIED SUCCESSFULLY WITH 100% INTEGRITY!\n');
  } finally {
    mockWebhookServer.close();
  }
}

testWebhookDispatch().catch((err) => {
  console.error('Webhook dispatch test error:', err);
  process.exit(1);
});
