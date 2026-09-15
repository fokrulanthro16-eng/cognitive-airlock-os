'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Radio,
  FileText,
  MessageSquare,
  Mail,
  AlertTriangle,
  Shield,
  Key,
  Database,
  RotateCcw,
  Settings2,
  DollarSign,
} from 'lucide-react';
import { SourceChannel, IngestApiResponse, AirlockPolicyConfig } from '@/types/airlock';

interface IngestDockProps {
  onIngestComplete: (result: IngestApiResponse) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  policyConfig: AirlockPolicyConfig;
  setPolicyConfig: React.Dispatch<React.SetStateAction<AirlockPolicyConfig>>;
}

const PRESET_SCENARIOS = [
  {
    id: 'scope-creep',
    label: 'Scope Creep Ambush',
    channel: 'whatsapp' as SourceChannel,
    client: 'HyperGrowth Labs',
    contractRef: 'CTR-2026-HGL',
    text: `Hey! Since you're already in the codebase deploying the dashboard, can we also quickly build an automated recurring invoice sync with QuickBooks, custom multi-currency PDF reports, and real-time Webhook dispatch? Need this done before Monday. Won't take you more than a few hours right? Thanks!`,
    badge: 'UNBILLED SCOPE',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  },
  {
    id: 'budget-ceiling',
    label: 'Hard Budget Ceiling Breach',
    channel: 'email' as SourceChannel,
    client: 'Titan Logistics Corp',
    contractRef: 'CTR-2026-TLC',
    text: `URGENT: Executive board authorized emergency enterprise database rebuild and dedicated multi-region failover. Total budget allocated is $9,450. Start work immediately and submit invoice next week.`,
    badge: 'CEILING > $5K',
    badgeColor: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
  },
  {
    id: 'pii-leak',
    label: 'PII & Secrets Ingestion',
    channel: 'slack' as SourceChannel,
    client: 'FinTech Syndicate',
    contractRef: 'CTR-2026-FTS',
    text: `Hey, to test the payment sandbox, use our test AWS key AKIAIOSFODNN7EXAMPLE and API secret sec_tok_938102830192830192830192. Send audit logs to billing-lead@fintechsyndicate.io. Founder SSN for verification is 123-45-6789. Budget allocated: $400 for 5 hours.`,
    badge: 'PII REDACTION',
    badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
  },
  {
    id: 'clean-maintenance',
    label: 'Clean Operational Maintenance',
    channel: 'slack' as SourceChannel,
    client: 'Starlight Media',
    contractRef: 'CTR-2026-SLM',
    text: `Monthly retainer ticket: Perform routine dependency audit, update Docker containers, optimize PostgreSQL read indices, and verify weekly S3 backup snapshots. Estimated effort: 6 hours, contract pre-approved retainer budget: $450.`,
    badge: 'SOVEREIGN APPROVED',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  },
];

const CHANNELS: Array<{ id: SourceChannel; label: string; icon: React.ReactNode }> = [
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: 'slack', label: 'Slack', icon: <Radio className="w-3.5 h-3.5" /> },
  { id: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
  { id: 'audio_transcript', label: 'Voice Transcript', icon: <Mic className="w-3.5 h-3.5" /> },
  { id: 'meeting_notes', label: 'Meeting Dump', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'direct_portal', label: 'Direct Portal', icon: <Database className="w-3.5 h-3.5" /> },
];

export const IngestDock: React.FC<IngestDockProps> = ({
  onIngestComplete,
  isLoading,
  setIsLoading,
  policyConfig,
  setPolicyConfig,
}) => {
  const [rawText, setRawText] = useState(PRESET_SCENARIOS[0].text);
  const [channel, setChannel] = useState<SourceChannel>(PRESET_SCENARIOS[0].channel);
  const [clientIdentifier, setClientIdentifier] = useState(PRESET_SCENARIOS[0].client);
  const [contractRef, setContractRef] = useState(PRESET_SCENARIOS[0].contractRef);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Real Microphone & Audio Telemetry States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioAmplitudes, setAudioAmplitudes] = useState<number[]>([15, 20, 10, 25, 18, 22, 12, 16]);
  const [realDictationActive, setRealDictationActive] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null); // Web Speech Recognition API
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up Web Audio resources on unmount
  useEffect(() => {
    return () => {
      stopAudioRecording();
    };
  }, []);

  const handleApplyPreset = (preset: (typeof PRESET_SCENARIOS)[0]) => {
    setRawText(preset.text);
    setChannel(preset.channel);
    setClientIdentifier(preset.client);
    setContractRef(preset.contractRef);
    setErrorBanner(null);
  };

  const runSimulatedDictation = () => {
    setIsRecording(true);
    let ticks = 0;
    timerIntervalRef.current = setInterval(() => {
      ticks += 1;
      setRecordingSeconds(ticks);
      setAudioAmplitudes([
        20 + Math.random() * 40,
        15 + Math.random() * 55,
        30 + Math.random() * 45,
        25 + Math.random() * 60,
        18 + Math.random() * 50,
        35 + Math.random() * 40,
        15 + Math.random() * 35,
        22 + Math.random() * 48,
      ]);
      if (ticks >= 4) {
        stopAudioRecording();
        setRawText(
          `[VOICE NOTE TRANSCRIPTION - 0:42]: "Hey! We really need you to also integrate real-time multi-currency Stripe checkout and automatic QuickBooks customer sync before the demo call tomorrow. Total unbilled request: ~20 hours. Can you rush this?"`
        );
      }
    }, 800);
  };

  /**
   * Real Microphone Voice Dictation using Web Audio API + Web Speech Recognition
   */
  const startAudioRecording = async () => {
    setErrorBanner(null);
    setChannel('audio_transcript');
    setRecordingSeconds(0);

    // Guard: SSR or non-browser environment
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      runSimulatedDictation();
      return;
    }

    try {
      // 1. Request real microphone access via Web Audio API
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 2. Setup Web Audio Context and Analyser for dynamic acoustic telemetry
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        runSimulatedDictation();
        return;
      }

      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // 3. Setup real-time acoustic waveform animation
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateWaveform = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          // Sample 8 frequency bands
          const sampled = [
            Math.max(12, dataArray[0] / 3),
            Math.max(15, dataArray[1] / 2.8),
            Math.max(10, dataArray[2] / 2.5),
            Math.max(20, dataArray[3] / 2.2),
            Math.max(18, dataArray[4] / 2.4),
            Math.max(22, dataArray[5] / 2.6),
            Math.max(12, dataArray[6] / 3.1),
            Math.max(16, dataArray[7] / 3.3),
          ];
          setAudioAmplitudes(sampled);
          animationFrameRef.current = requestAnimationFrame(updateWaveform);
        }
      };
      updateWaveform();

      // 4. Setup Speech Recognition if supported by the browser
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognizer = new SpeechRecognition();
          recognizer.continuous = true;
          recognizer.interimResults = true;
          recognizer.lang = 'en-US';

          recognizer.onresult = (event: any) => {
            let transcriptText = '';
            for (let i = 0; i < event.results.length; i++) {
              transcriptText += event.results[i][0].transcript;
            }
            if (transcriptText.trim()) {
              setRawText(transcriptText);
            }
          };

          recognizer.onerror = (err: any) => {
            console.warn('[SpeechRecognition] Dictation event notice:', err);
          };

          recognizer.start();
          recognitionRef.current = recognizer;
          setRealDictationActive(true);
        } catch (speechErr) {
          console.warn('SpeechRecognition initialization notice:', speechErr);
        }
      }

      setIsRecording(true);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.warn('Microphone permission or hardware access notice:', err);
      runSimulatedDictation();
    }
  };

  const stopAudioRecording = () => {
    setIsRecording(false);
    setRealDictationActive(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    // Default waveform reset
    setAudioAmplitudes([15, 20, 10, 25, 18, 22, 12, 16]);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopAudioRecording();
    } else {
      startAudioRecording();
    }
  };

  const handleIngest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawText.trim()) return;

    setIsLoading(true);
    setErrorBanner(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey.trim()) {
        headers['x-gemini-api-key'] = apiKey.trim();
      }

      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rawText,
          sourceChannel: channel,
          clientIdentifier: clientIdentifier.trim() || 'UNIDENTIFIED_CLIENT',
          contractRefId: contractRef.trim() || undefined,
          customHourlyBenchmarkRateUSD: policyConfig.hourlyBenchmarkRateUSD,
          customHardBudgetCapUSD: policyConfig.hardBudgetCapUSD,
        }),
      });

      const data: IngestApiResponse = await res.json();
      if (!res.ok) {
        throw new Error((data as unknown as { error?: string }).error || 'Ingestion request failed');
      }

      onIngestComplete(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Telemetry pipeline error';
      setErrorBanner(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md flex flex-col space-y-4 relative">
      {/* Header telemetry ribbon */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono tracking-wider uppercase text-cyan-400 font-semibold">
            Raw Ingestion Dock
          </span>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700">
            PORT // AIRLOCK-01
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Policy Settings Popover Button */}
          <button
            type="button"
            onClick={() => setShowSettingsPopover(!showSettingsPopover)}
            className={`text-xs px-2.5 py-1 rounded font-mono border transition-all flex items-center space-x-1.5 ${
              showSettingsPopover
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
            title="Configure Deterministic Airlock Policy Parameters"
          >
            <Settings2 className="w-3 h-3" />
            <span>Policy: ${policyConfig.hourlyBenchmarkRateUSD}/h | ${policyConfig.hardBudgetCapUSD.toLocaleString()}</span>
          </button>

          {/* Gemini Key Config Toggle */}
          <button
            type="button"
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`text-xs px-2.5 py-1 rounded font-mono border transition-all flex items-center space-x-1.5 ${
              apiKey.trim()
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
            title="Configure optional Gemini 2.5 Flash API Key (Google AI Studio Free Tier)"
          >
            <Key className="w-3 h-3" />
            <span className="hidden sm:inline">{apiKey.trim() ? 'Gemini [Active]' : 'Gemini Key'}</span>
          </button>
        </div>
      </div>

      {/* Configurable Airlock Policy Popover Drawer */}
      {showSettingsPopover && (
        <div className="p-3.5 rounded-lg bg-slate-950/95 border border-cyan-500/40 text-xs space-y-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-1.5 text-cyan-400 font-mono font-bold text-[11px]">
              <Settings2 className="w-3.5 h-3.5" />
              <span>DETERMINISTIC POLICY CONTROLS</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Dynamic Recalculation Engine</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Benchmark Hourly Rate */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                Scope Benchmark Rate ($/hr):
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-cyan-400 absolute left-2 top-2" />
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={policyConfig.hourlyBenchmarkRateUSD}
                  onChange={(e) =>
                    setPolicyConfig((prev) => ({
                      ...prev,
                      hourlyBenchmarkRateUSD: Math.max(1, Number(e.target.value) || 60),
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded pl-7 pr-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">
                Default: $60/hr solo baseline rate
              </span>
            </div>

            {/* Hard Budget Safety Cap */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                Hard Budget Cap ($ Max):
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-rose-400 absolute left-2 top-2" />
                <input
                  type="number"
                  min={500}
                  max={50000}
                  step={500}
                  value={policyConfig.hardBudgetCapUSD}
                  onChange={(e) =>
                    setPolicyConfig((prev) => ({
                      ...prev,
                      hardBudgetCapUSD: Math.max(100, Number(e.target.value) || 5000),
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded pl-7 pr-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">
                Default: $5,000 auto-quarantine ceiling
              </span>
            </div>
          </div>

          {/* External Webhook Automation URL */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              External Automation Webhook URL (Zapier / Make / n8n / Slack):
            </label>
            <input
              type="url"
              value={policyConfig.webhookUrl || ''}
              onChange={(e) =>
                setPolicyConfig((prev) => ({
                  ...prev,
                  webhookUrl: e.target.value,
                }))
              }
              placeholder="https://hooks.zapier.com/hooks/catch/... or https://discord.com/api/webhooks/..."
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">
              Fires authenticated POST packet with SHA-256 seal upon cryptographic dispatch authorization.
            </span>
          </div>
        </div>
      )}

      {/* Optional API Key Input Expander */}
      {showKeyInput && (
        <div className="p-3 rounded-lg bg-slate-950/80 border border-cyan-500/30 text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-300 font-mono text-[11px]">
            <span>Google AI Studio API Key (Free Tier Supported):</span>
            <span className="text-slate-500 text-[10px]">Zero cost stack • Falls back to local engine if empty</span>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>
      )}

      {/* Preset Scenario Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono tracking-wide text-slate-400 uppercase">
            Simulation Vectors:
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Select adversarial or standard inputs</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_SCENARIOS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="group text-left p-2 rounded-lg border border-slate-800 bg-slate-950/50 hover:border-cyan-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
            >
              <span className="text-xs font-medium text-slate-300 group-hover:text-cyan-300 line-clamp-1">
                {preset.label}
              </span>
              <span
                className={`mt-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded border inline-block w-fit ${preset.badgeColor}`}
              >
                {preset.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Source Channel Selector & Voice Dictation Toggle */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setChannel(ch.id)}
            className={`text-xs px-2.5 py-1 rounded-md font-mono flex items-center space-x-1.5 border transition-colors ${
              channel === ch.id
                ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            {ch.icon}
            <span>{ch.label}</span>
          </button>
        ))}

        {/* Real Microphone Voice Dictation Button */}
        <button
          type="button"
          onClick={toggleRecording}
          className={`text-xs px-3 py-1 rounded-md font-mono flex items-center space-x-1.5 border ml-auto transition-all ${
            isRecording
              ? 'border-rose-500 bg-rose-500/25 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
              : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
          }`}
          title="Record live audio from microphone via Web Audio API"
        >
          {isRecording ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
          <span>{isRecording ? `Stop Audio (${recordingSeconds}s)` : 'Voice Dictate'}</span>
        </button>
      </div>

      {/* Metadata Input Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
            Client Entity:
          </label>
          <input
            type="text"
            value={clientIdentifier}
            onChange={(e) => setClientIdentifier(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
            placeholder="e.g. Acme Corp"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
            Contract Baseline Ref:
          </label>
          <input
            type="text"
            value={contractRef}
            onChange={(e) => setContractRef(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
            placeholder="e.g. CTR-2026-001"
          />
        </div>
      </div>

      {/* Text Area Console with Real Waveform Overlay when Recording */}
      <div className="relative">
        <textarea
          rows={5}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste raw WhatsApp dumps, email trails, transcript excerpts, or click 'Voice Dictate' to speak..."
          className="w-full bg-slate-950/90 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400/80 transition-all placeholder:text-slate-600 resize-none leading-relaxed"
        />

        {/* Real Dynamic Audio Telemetry Overlay */}
        {isRecording && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs rounded-lg flex flex-col items-center justify-center space-y-3 p-4">
            <div className="flex items-end justify-center space-x-1.5 h-12">
              {audioAmplitudes.map((amp, i) => (
                <div
                  key={i}
                  className="w-2 rounded-full transition-all duration-75 bg-gradient-to-t from-cyan-500 to-rose-400"
                  style={{
                    height: `${Math.min(48, Math.max(8, amp))}px`,
                  }}
                />
              ))}
            </div>
            <div className="text-center font-mono space-y-0.5">
              <span className="text-xs text-cyan-300 font-semibold block">
                {realDictationActive ? '🔴 Live Speech Recognition Active' : '🔴 Capturing Audio Buffer...'}
              </span>
              <span className="text-[10px] text-slate-400">
                Recording duration: {recordingSeconds}s • Speak naturally or click Stop Audio
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error alert if any */}
      {errorBanner && (
        <div className="p-2.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-mono">{errorBanner}</span>
        </div>
      )}

      {/* Action Trigger Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>Zero Execution Authority Principle Active</span>
        </div>

        <button
          type="button"
          onClick={() => handleIngest()}
          disabled={isLoading || !rawText.trim()}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-semibold font-mono text-xs rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center space-x-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin text-slate-950" />
              <span>Scanning Airlock...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5 text-slate-950" />
              <span>Ingest & Airlock Lint</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
