'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Lock,
  Unlock,
  Copy,
  Check,
  Send,
  Sparkles,
  Info,
  Layers,
  Flame,
  FileText,
  Download,
  Printer,
  X,
} from 'lucide-react';
import { IngestApiResponse, DispatchApiResponse, AirlockPolicyConfig } from '@/types/airlock';

interface AirlockCockpitProps {
  telemetry: IngestApiResponse | null;
  isLoading: boolean;
  policyConfig?: AirlockPolicyConfig;
  onAuditUpdated?: (updated: IngestApiResponse) => void;
}

export const AirlockCockpit: React.FC<AirlockCockpitProps> = ({
  telemetry,
  isLoading,
  policyConfig,
  onAuditUpdated,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedSlipHash, setCopiedSlipHash] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState<
    'STRIPE_INVOICE' | 'QUICKBOOKS' | 'SLACK_ALERT' | 'TRELLO_CARD' | 'LOCAL_VAULT'
  >('STRIPE_INVOICE');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchReceipt, setDispatchReceipt] = useState<DispatchApiResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'violations' | 'financials' | 'ledger'>('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center min-h-[520px] text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
        </div>
        <div className="space-y-1 font-mono">
          <p className="text-sm text-cyan-300 font-semibold tracking-wider uppercase">
            Executing Airlock Isolation Sweep
          </p>
          <p className="text-xs text-slate-500">
            Invoking Gemini 2.5 Flash Structured Schema → Deterministic Linter → SHA-256 Digest
          </p>
        </div>
      </div>
    );
  }

  if (!telemetry) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center min-h-[520px] text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
          <Layers className="w-7 h-7" />
        </div>
        <div className="space-y-1 font-mono">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Cockpit In Standby Mode
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Ingest raw client inputs from the dock to initiate deterministic verification and cryptographic sealing.
          </p>
        </div>
      </div>
    );
  }

  const { airlockVerdict, untrustedAiIntent, auditPacket, executionAuthorityGranted } = telemetry;
  const isApproved = airlockVerdict.status === 'APPROVED';
  const scope = airlockVerdict.scopeAssessment;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(airlockVerdict.sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopySlipHash = () => {
    navigator.clipboard.writeText(airlockVerdict.sha256Hash);
    setCopiedSlipHash(true);
    setTimeout(() => setCopiedSlipHash(false), 2000);
  };

  const handleDispatchAction = async () => {
    if (!executionAuthorityGranted) return;
    setIsDispatching(true);
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditPacketId: auditPacket.id,
          expectedSha256: airlockVerdict.sha256Hash,
          target: dispatchTarget,
          webhookUrl: policyConfig?.webhookUrl,
          clientEntity: telemetry.clientIdentifier,
          amount: scope.totalEffectiveUSD,
          sanitizedIntent: airlockVerdict.sanitizedIntent.intentSummary,
        }),
      });
      const data: DispatchApiResponse = await res.json();
      setDispatchReceipt(data);

      // Create updated telemetry object with DISPATCHED status
      const updatedTelemetry: IngestApiResponse = {
        ...telemetry,
        auditPacket: {
          ...auditPacket,
          status: 'DISPATCHED',
          dispatchedAt: data.dispatchedAt,
          dispatchTarget: dispatchTarget,
          dispatchReceipt: {
            receiptId: data.receiptId,
            externalEndpoint: data.webhookDelivery?.endpoint || dispatchTarget,
            dispatchStatus: data.webhookDelivery?.success ? 'SUCCESS' : 'DRY_RUN',
            operatorSignature: `SOV_SIG_${data.receiptId}`,
          },
        },
      };

      // Write updated state into local storage vault
      if (typeof window !== 'undefined') {
        try {
          const rawVault = localStorage.getItem('airlock_audit_vault_v1');
          if (rawVault) {
            const vault: IngestApiResponse[] = JSON.parse(rawVault);
            const updatedVault = vault.map((item) =>
              item.traceId === telemetry.traceId ? updatedTelemetry : item
            );
            localStorage.setItem('airlock_audit_vault_v1', JSON.stringify(updatedVault));
          }
        } catch (vaultErr) {
          console.warn('Could not update vault record:', vaultErr);
        }
      }

      onAuditUpdated?.(updatedTelemetry);

      // Open visual invoice slide-over slip automatically
      setIsDrawerOpen(true);
    } catch (e) {
      console.error('Dispatch failure', e);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleExportJson = () => {
    const slipData = {
      title: 'Cognitive Airlock OS - Cryptographic Dispatch Invoice Slip',
      receiptId: dispatchReceipt?.receiptId || `preview_${Date.now()}`,
      dispatchedAt: dispatchReceipt?.dispatchedAt || new Date().toISOString(),
      clientIdentifier: telemetry.clientIdentifier,
      sourceChannel: telemetry.sourceChannel,
      contractRefId: auditPacket.contractRefId || 'N/A',
      sha256Digest: airlockVerdict.sha256Hash,
      dispatchTarget,
      financials: {
        clientOfferedBudgetUSD: untrustedAiIntent.requestedBudgetUSD,
        billableHours: scope.billableHours,
        benchmarkHourlyRateUSD: scope.benchmarkHourlyRateUSD,
        calculatedSurchargeUSD: scope.calculatedSurchargeUSD,
        totalEffectiveUSD: scope.totalEffectiveUSD,
      },
      piiSanitization: {
        totalRedactions: airlockVerdict.piiRedactedCount,
        detectedTypes: untrustedAiIntent.detectedPIIEntities || [],
      },
      deliverableMilestones: airlockVerdict.sanitizedIntent.deliverableMilestones,
      signatures: airlockVerdict.signatures,
    };

    const blob = new Blob([JSON.stringify(slipData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-slip-${airlockVerdict.sha256Hash.slice(0, 12)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md flex flex-col space-y-4 relative">
      {/* Top Telemetry Status HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-3">
          <div
            className={`px-3 py-1 rounded-md font-mono text-xs font-bold tracking-wider flex items-center space-x-1.5 border ${
              isApproved
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
            }`}
          >
            {isApproved ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>AIRLOCK STATUS: APPROVED (PASS)</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>AIRLOCK STATUS: QUARANTINED</span>
              </>
            )}
          </div>

          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline-block">
            TRACE: {auditPacket.traceId}
          </span>
        </div>

        {/* Execution Authority Status Indicator */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          {executionAuthorityGranted ? (
            <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              <Unlock className="w-3 h-3" />
              <span>EXECUTION GRANTED</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
              <Lock className="w-3 h-3" />
              <span>EXECUTION LOCKED</span>
            </span>
          )}
        </div>
      </div>

      {/* SHA-256 Ledger Signature Ribbon */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2 overflow-hidden mr-2">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider shrink-0">
            SHA-256 PROOF:
          </span>
          <span className="text-slate-400 truncate text-[11px]">
            {airlockVerdict.sha256Hash}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyHash}
          className="text-slate-400 hover:text-cyan-300 p-1 rounded hover:bg-slate-800 transition-colors shrink-0"
          title="Copy SHA-256 Digest"
        >
          {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 border-b border-slate-800 pb-1 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-t-md transition-colors ${
            activeTab === 'overview'
              ? 'bg-slate-800/80 text-cyan-300 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Intent Telemetry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('violations')}
          className={`px-3 py-1.5 rounded-t-md flex items-center space-x-1 transition-colors ${
            activeTab === 'violations'
              ? 'bg-slate-800/80 text-cyan-300 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Policy Violations</span>
          {airlockVerdict.violations.length > 0 && (
            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] px-1.5 rounded-full">
              {airlockVerdict.violations.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('financials')}
          className={`px-3 py-1.5 rounded-t-md transition-colors ${
            activeTab === 'financials'
              ? 'bg-slate-800/80 text-cyan-300 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Scope Creep Financials
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-3 py-1.5 rounded-t-md transition-colors ${
            activeTab === 'ledger'
              ? 'bg-slate-800/80 text-cyan-300 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Audit Ledger Diff
        </button>
      </div>

      {/* Tab Content Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-3 font-mono">
          {/* Executive Summary Card */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                Cognitive Extracted Intent (Gemini 2.5 Flash Structured Schema)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                Confidence: {(untrustedAiIntent.confidenceScore * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
              {airlockVerdict.sanitizedIntent.intentSummary}
            </p>
          </div>

          {/* Telemetry Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Category</span>
              <span className="text-slate-200 font-semibold mt-0.5 block truncate">
                {untrustedAiIntent.category}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Urgency</span>
              <span
                className={`font-semibold mt-0.5 block capitalize ${
                  untrustedAiIntent.urgency === 'critical'
                    ? 'text-rose-400'
                    : untrustedAiIntent.urgency === 'high'
                    ? 'text-amber-400'
                    : 'text-slate-200'
                }`}
              >
                {untrustedAiIntent.urgency}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Estimated Effort</span>
              <span className="text-slate-200 font-semibold mt-0.5 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{untrustedAiIntent.estimatedHours} hrs</span>
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Client Budget</span>
              <span className="text-slate-200 font-semibold mt-0.5 flex items-center space-x-1">
                <DollarSign className="w-3 h-3 text-emerald-400" />
                <span>${untrustedAiIntent.requestedBudgetUSD.toLocaleString()}</span>
              </span>
            </div>
          </div>

          {/* Deliverable Milestones */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Required Deliverable Milestones
            </span>
            <ul className="space-y-1 text-xs text-slate-300 font-sans">
              {airlockVerdict.sanitizedIntent.deliverableMilestones.map((m, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-cyan-400 font-mono text-xs mt-0.5 shrink-0">
                    [{idx + 1}]
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="space-y-2.5 font-mono">
          {airlockVerdict.violations.length === 0 ? (
            <div className="p-6 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs text-emerald-300 font-semibold">
                ALL DETERMINISTIC POLICY CHECKS PASSED
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                No budget cap breaches, unbilled scope creep, or PII leakage detected. Safe for dispatch.
              </p>
            </div>
          ) : (
            airlockVerdict.violations.map((v, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  v.severity === 'CRITICAL'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center space-x-1.5">
                    {v.severity === 'CRITICAL' ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{v.ruleId}</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border border-current">
                    {v.severity}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] font-sans">{v.reason}</p>
                <div className="text-[10px] text-cyan-300/90 pt-1 border-t border-slate-800 flex items-start space-x-1">
                  <Info className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Remediation:</strong> {v.remediationHint}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'financials' && (
        <div className="space-y-3 font-mono">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Scope Creep Billing Engine (${scope.benchmarkHourlyRateUSD}/hr Benchmark)</span>
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                  scope.isOutOfScope
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {scope.isOutOfScope ? 'OUT OF ORIGINAL CONTRACT SCOPE' : 'WITHIN CONTRACT SCOPE'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Client Offered</span>
                <span className="text-sm font-bold text-slate-200 mt-1 block">
                  ${untrustedAiIntent.requestedBudgetUSD.toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-500">Stated in input</span>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">
                  Benchmark Surcharge ({scope.billableHours}h @ ${scope.benchmarkHourlyRateUSD}/h)
                </span>
                <span className="text-sm font-bold text-cyan-300 mt-1 block">
                  ${scope.calculatedSurchargeUSD.toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-500">Solo baseline value</span>
              </div>

              <div
                className={`p-2.5 rounded border ${
                  scope.budgetDeficitUSD > 0
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                }`}
              >
                <span className="text-[10px] block uppercase">Unbilled Deficit Risk</span>
                <span className="text-sm font-bold mt-1 block">
                  ${scope.budgetDeficitUSD.toLocaleString()}
                </span>
                <span className="text-[9px]">
                  {scope.budgetDeficitUSD > 0 ? 'Lost revenue if unpaid' : 'Zero unbilled deficit'}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-900/90 border border-cyan-500/20 text-xs text-slate-300">
              <p className="text-[11px] leading-relaxed font-sans">
                {scope.financialProtectionRecommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span>Deterministic Redacted vs Original Ingestion Text:</span>
            <span className="text-cyan-400">
              {airlockVerdict.piiRedactedCount} PII Redaction(s) applied
            </span>
          </div>
          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 text-[11px] text-slate-300 space-y-2 max-h-48 overflow-y-auto">
            <div>
              <span className="text-[10px] text-slate-500 block mb-1 uppercase">Sanitized Telemetry:</span>
              <p className="text-slate-300 font-mono whitespace-pre-wrap">{airlockVerdict.sanitizedRawText}</p>
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-500 space-y-1">
            <div>
              <span className="text-slate-400 font-semibold">Deterministic Algorithm:</span> SHA-256 (Canonical Key Sorted)
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Audit Digest:</span> {airlockVerdict.sha256Hash}
            </div>
          </div>
        </div>
      )}

      {/* Sovereign Action Dispatch Controls */}
      <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-semibold text-slate-300 uppercase">
              Action Dispatch Deck:
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {isApproved
                ? 'Ready for cryptographic execution'
                : 'Locked: Resolve policy violations first'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Visual Invoice Drawer Opener */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="text-xs font-mono px-3 py-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 flex items-center space-x-1.5 transition-all"
              title="Inspect Cryptographic Invoice Slip Drawer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoice Slip</span>
            </button>

            <select
              value={dispatchTarget}
              onChange={(e) => setDispatchTarget(e.target.value as typeof dispatchTarget)}
              disabled={!executionAuthorityGranted}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
            >
              <option value="STRIPE_INVOICE">Stripe Invoice Dispatch</option>
              <option value="QUICKBOOKS">QuickBooks Billable Rider</option>
              <option value="SLACK_ALERT">Slack Operations Alert</option>
              <option value="TRELLO_CARD">Trello Backlog Task</option>
              <option value="LOCAL_VAULT">Local Sovereign Vault</option>
            </select>

            <button
              type="button"
              onClick={handleDispatchAction}
              disabled={!executionAuthorityGranted || isDispatching}
              className={`px-4 py-1.5 text-xs font-mono font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
                executionAuthorityGranted
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {executionAuthorityGranted ? (
                <>
                  <Send className="w-3.5 h-3.5 text-slate-950" />
                  <span>{isDispatching ? 'Authorizing...' : 'Execute Dispatch'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Dispatch Prohibited</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dispatch Confirmation Receipt */}
        {dispatchReceipt && (
          <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/40 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>DISPATCH EXECUTED // CRYPTOGRAPHICALLY CONFIRMED</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="text-[10px] text-cyan-300 underline hover:text-cyan-200"
              >
                View Invoice Slip →
              </button>
            </div>
            <p className="text-[11px] text-slate-300">{dispatchReceipt.message}</p>

            {/* Webhook Delivery Feedback Badge */}
            {dispatchReceipt.webhookDelivery?.attempted && (
              <div className="pt-1 flex items-center space-x-2 text-[10px]">
                {dispatchReceipt.webhookDelivery.success ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Webhook Dispatched: {dispatchReceipt.webhookDelivery.statusCode || 200} OK</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1 font-semibold">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Webhook Notice: {dispatchReceipt.webhookDelivery.error}</span>
                  </span>
                )}
                {dispatchReceipt.webhookDelivery.endpoint && (
                  <span className="text-slate-500 text-[9px] truncate max-w-xs">
                    → {dispatchReceipt.webhookDelivery.endpoint}
                  </span>
                )}
              </div>
            )}

            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
              <span>Receipt ID: {dispatchReceipt.receiptId}</span> • <span>Target: {dispatchReceipt.target}</span>
            </div>
          </div>
        )}
      </div>

      {/* Visual Slip Slide-Over Drawer Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-slate-950 border border-cyan-500/40 w-full max-w-lg h-full max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-mono text-slate-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold tracking-wider uppercase text-cyan-300">
                  Cryptographic Invoice Slip
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-md hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Invoice Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Slip Header Banner */}
              <div className="border border-slate-800 bg-slate-900/50 p-3.5 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">COGNITIVE AIRLOCK DISPATCH</h4>
                    <p className="text-[10px] text-slate-500">Autonomous Sovereign Operational Slip</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase font-bold">
                      {isApproved ? 'VERIFIED SEAL' : 'AUDIT PREVIEW'}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(auditPacket.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-800 pt-2 text-slate-400">
                  <div>
                    <span className="text-slate-500 block">CLIENT ENTITY:</span>
                    <span className="text-slate-200 font-semibold">{telemetry.clientIdentifier}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">CONTRACT REF:</span>
                    <span className="text-slate-200 font-semibold">{auditPacket.contractRefId || 'SOV-GEN-2026'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">SOURCE CHANNEL:</span>
                    <span className="text-slate-200 uppercase">{telemetry.sourceChannel}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">DISPATCH ROUTE:</span>
                    <span className="text-cyan-400 font-semibold">{dispatchTarget}</span>
                  </div>
                </div>
              </div>

              {/* Financial Line Items */}
              <div className="border border-slate-800 bg-slate-900/30 p-3.5 rounded-xl space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold border-b border-slate-800 pb-1">
                  Itemized Scope Breakdown
                </span>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Base Work Allocation:</span>
                    <span className="font-semibold">${untrustedAiIntent.requestedBudgetUSD.toLocaleString()}</span>
                  </div>

                  {scope.isOutOfScope && (
                    <div className="flex justify-between text-amber-400">
                      <span>Out-of-Scope Benchmark Surcharge ({scope.billableHours}h @ ${scope.benchmarkHourlyRateUSD}/h):</span>
                      <span className="font-semibold">+${scope.calculatedSurchargeUSD.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Estimated developer time:</span>
                    <span>{scope.billableHours || untrustedAiIntent.estimatedHours} hours</span>
                  </div>
                </div>

                {/* Total Invoice Amount */}
                <div className="border-t border-slate-800 pt-2 flex justify-between items-baseline">
                  <span className="text-xs uppercase font-bold text-slate-300">Total Authorized Invoice:</span>
                  <span className="text-lg font-extrabold text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                    ${scope.totalEffectiveUSD.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Redacted Secrets Ledger Slip */}
              <div className="border border-slate-800 bg-slate-900/30 p-3 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    Redacted Secrets & PII Ledger
                  </span>
                  <span className="text-[10px] text-cyan-400">
                    {airlockVerdict.piiRedactedCount} sanitization event(s)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Zero raw keys or sensitive tokens were transmitted. All credentials replaced with cryptographic placeholders.
                </p>
                {untrustedAiIntent.detectedPIIEntities && untrustedAiIntent.detectedPIIEntities.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {untrustedAiIntent.detectedPIIEntities.map((t, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        🛡️ {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Cryptographic SHA-256 Seal Barcode */}
              <div className="border border-cyan-500/30 bg-slate-950 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                    SHA-256 Cryptographic Seal
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySlipHash}
                    className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center space-x-1"
                  >
                    {copiedSlipHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSlipHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Aesthetic Visual Barcode Lines */}
                <div className="h-6 w-full flex items-center justify-between px-1 bg-slate-900 rounded border border-slate-800 overflow-hidden">
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3].map((w, i) => (
                    <div
                      key={i}
                      className="bg-cyan-400/70 h-full"
                      style={{ width: `${w * 2}px` }}
                    />
                  ))}
                </div>

                <p className="text-[9px] font-mono text-slate-400 break-all bg-slate-900/80 p-2 rounded border border-slate-800">
                  {airlockVerdict.sha256Hash}
                </p>
              </div>
            </div>

            {/* Drawer Actions Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors text-xs flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Audit Slip</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all text-xs flex items-center space-x-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
