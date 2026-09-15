'use client';

import React, { useState, useEffect } from 'react';
import { IngestDock } from '@/components/IngestDock';
import { AirlockCockpit } from '@/components/AirlockCockpit';
import { IngestApiResponse, AirlockPolicyConfig } from '@/types/airlock';
import { ShieldCheck, Terminal, Cpu, Lock, Settings2, Trash2, Database } from 'lucide-react';

const AUDIT_VAULT_STORAGE_KEY = 'airlock_audit_vault_v1';
const POLICY_CONFIG_STORAGE_KEY = 'airlock_policy_config_v1';

export default function Home() {
  const [telemetry, setTelemetry] = useState<IngestApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ingestionHistory, setIngestionHistory] = useState<IngestApiResponse[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [policyConfig, setPolicyConfig] = useState<AirlockPolicyConfig>({
    hourlyBenchmarkRateUSD: 60,
    hardBudgetCapUSD: 5000,
    webhookUrl: '',
  });

  // Hydrate local persistence vault and policy settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedHistory = localStorage.getItem(AUDIT_VAULT_STORAGE_KEY);
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setIngestionHistory(parsed);
            setTelemetry(parsed[0]); // Auto-load most recent audit packet
          }
        }

        const savedPolicy = localStorage.getItem(POLICY_CONFIG_STORAGE_KEY);
        if (savedPolicy) {
          const parsedPolicy = JSON.parse(savedPolicy);
          if (parsedPolicy && parsedPolicy.hourlyBenchmarkRateUSD) {
            setPolicyConfig(parsedPolicy);
          }
        }
      } catch (err) {
        console.warn('Could not hydrate local persistence vault:', err);
      } finally {
        setIsHydrated(true);
      }
    }
  }, []);

  // Save policy config changes to localStorage
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      try {
        localStorage.setItem(POLICY_CONFIG_STORAGE_KEY, JSON.stringify(policyConfig));
      } catch (err) {
        console.warn('Could not persist policy config:', err);
      }
    }
  }, [policyConfig, isHydrated]);

  const handleIngestComplete = (result: IngestApiResponse) => {
    setTelemetry(result);
    setIngestionHistory((prev) => {
      const updated = [result, ...prev.filter((item) => item.traceId !== result.traceId).slice(0, 19)];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(AUDIT_VAULT_STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          console.warn('Could not write to local audit vault:', err);
        }
      }
      return updated;
    });
  };

  const handleAuditUpdated = (updated: IngestApiResponse) => {
    setTelemetry(updated);
    setIngestionHistory((prev) =>
      prev.map((item) => (item.traceId === updated.traceId ? updated : item))
    );
  };

  const handleClearVault = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUDIT_VAULT_STORAGE_KEY);
      } catch {}
    }
    setIngestionHistory([]);
    setShowClearConfirm(false);
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Flight Telemetry Header */}
      <header className="border border-slate-800 bg-slate-950/80 backdrop-blur-md rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-pulse" />
            <h1 className="text-lg font-bold font-mono tracking-wider text-slate-100 flex items-center space-x-2">
              <span>COGNITIVE AIRLOCK OS</span>
              <span className="text-cyan-400 text-xs font-normal border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded">
                v2.5.0-PROD
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Sovereign Operational Guardian for Solo Founders • Zero-Cost Stack • Gemini 2.5 Flash Free Tier
          </p>
        </div>

        {/* Security & System Ribbon */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>LLM: Gemini 2.5 Flash</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>LLM Authority: 0%</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Airlock: Deterministic</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-cyan-300">
            <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Benchmark: ${policyConfig.hourlyBenchmarkRateUSD}/h | Cap: ${policyConfig.hardBudgetCapUSD.toLocaleString()}</span>
          </div>
        </div>
      </header>

      {/* Main Dual-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Raw Ingestion Console */}
        <div className="lg:col-span-5 space-y-4">
          <IngestDock
            onIngestComplete={handleIngestComplete}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            policyConfig={policyConfig}
            setPolicyConfig={setPolicyConfig}
          />
        </div>

        {/* Right Column: Mission Control Telemetry Cockpit */}
        <div className="lg:col-span-7 space-y-4">
          <AirlockCockpit
            telemetry={telemetry}
            isLoading={isLoading}
            policyConfig={policyConfig}
            onAuditUpdated={handleAuditUpdated}
          />
        </div>
      </div>

      {/* Immutable SHA-256 Ledger Audit Log (Persistent Local Vault) */}
      <section className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 font-mono space-y-3">
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2.5 gap-2">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold uppercase tracking-wider text-slate-200">
              Audit Vault (Local Persistence Ledger)
            </span>
            <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
              airlock_audit_vault_v1
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[10px] text-slate-500">
              {isHydrated ? `${ingestionHistory.length} cryptographic record(s) persisted` : 'Connecting...'}
            </span>

            {isHydrated && ingestionHistory.length > 0 && (
              <>
                {showClearConfirm ? (
                  <div className="flex items-center space-x-1 text-[10px]">
                    <span className="text-rose-300">Wipe local vault?</span>
                    <button
                      type="button"
                      onClick={handleClearVault}
                      className="px-2 py-0.5 rounded bg-rose-500 text-slate-950 font-bold hover:bg-rose-400"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center space-x-1 transition-colors"
                    title="Wipe local persistence ledger"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Vault</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {!isHydrated ? (
          <div className="p-6 text-center text-xs text-slate-600">
            Initializing local persistence ledger...
          </div>
        ) : ingestionHistory.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-600">
            No audits in local persistence vault. Ingest new client telemetry to seed cryptographic ledger.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {ingestionHistory.map((item, idx) => {
              const isSelected = telemetry?.traceId === item.traceId;
              return (
                <div
                  key={item.traceId || idx}
                  onClick={() => setTelemetry(item)}
                  className={`cursor-pointer p-2.5 rounded-lg transition-all text-[11px] space-y-1.5 border ${
                    isSelected
                      ? 'border-cyan-400/80 bg-slate-900 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold truncate max-w-[120px]">
                      {item.clientIdentifier}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                        item.airlockVerdict.status === 'APPROVED'
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                          : 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                      }`}
                    >
                      {item.airlockVerdict.status}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[10px] truncate">
                    SHA: {item.airlockVerdict.sha256Hash.slice(0, 16)}...
                  </div>
                  <div className="text-slate-400 text-[10px] flex justify-between pt-0.5 border-t border-slate-800/60">
                    <span className="uppercase text-[9px]">{item.sourceChannel}</span>
                    <span>${item.untrustedAiIntent.requestedBudgetUSD}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
