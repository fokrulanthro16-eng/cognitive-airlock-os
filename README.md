<div align="center">

# 🛡️ Cognitive Airlock OS
### **Zero-Execution-Authority Financial & Risk Quarantine Engine**

*An enterprise-grade, sovereign operational guardian designed for solo founders, freelancers, and agency leaders.*

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?style=for-the-badge&logo=google)](https://aistudio.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

---

</div>

## 🌐 Executive Summary & Core Mission

Solo founders and boutique software agencies lose tens of thousands of dollars each year to **scope creep ambush**, **unbilled out-of-scope client requests**, **uncontrolled budget breaches**, and **accidental leakage of sensitive client credentials (PII & API tokens)**.

Large consulting firms combat this using multi-thousand-dollar enterprise CRM and billing governance suites. **Cognitive Airlock OS** democratizes enterprise operational defense by running entirely on a **$0 sovereignty stack**:
- **Cognitive Semantic Ingestion:** Google Gemini 2.5 Flash via Google AI Studio Free Tier (with local deterministic offline fallback).
- **Airlock Verification Layer:** Deterministic mathematical linter running with **Strict Separation of Authority**.
- **Cryptographic Audit Seal:** Universal canonical SHA-256 hashing for immutable records.
- **Mission Control Cockpit:** Dark Aerospace Telemetry HUD with Web Audio real-time acoustic telemetry and instant webhook dispatch automation.

---

## 🏛️ Architectural Philosophy: Strict Separation of Authority

Traditional AI integrations fail because they grant LLMs autonomous access to execute database transactions, trigger financial transfers, or dispatch webhooks. 

**Cognitive Airlock OS enforces 0% LLM execution authority by design:**

```
                    ┌────────────────────────────────────────┐
                    │       UNTRUSTED CLIENT TELEMETRY       │
                    │  (Slack / WhatsApp / Email / Voice)    │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │      COGNITIVE EXTRACTION LAYER        │
                    │         (Gemini 2.5 Flash)             │
                    │  • Structured Schema Parsing           │
                    │  • 0% LLM Execution Authority          │
                    │  • Zero access to external APIs        │
                    └───────────────────┬────────────────────┘
                                        │ (Untrusted ActionIntent)
                                        ▼
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║                 DETERMINISTIC AIRLOCK VERIFICATION ENGINE                 ║
  ║  1. Mathematical PII & Credential Redaction (AWS, Stripe, SSN)            ║
  ║  2. Hard Budget Ceiling Protection ($5,000 Safety Kill-Switch)           ║
  ║  3. Unbilled Scope Creep Defense ($60/hr Benchmark Billing Surcharge)    ║
  ║  4. Single-Packet Effort Threshold Check (< 80 hours unvetted limit)      ║
  ║  5. Fails Closed: Automatic Quarantine & Revocation of Execution Rights   ║
  ╚═══════════════════════════════════════════════════════════════════════════╝
                                        │
                                        ▼ (Signed Canonical Payload)
                    ┌────────────────────────────────────────┐
                    │     IMMUTABLE CRYPTOGRAPHIC SEAL       │
                    │        (Canonical SHA-256 Digest)      │
                    │  • Key-sorted tamper-proof signature   │
                    │  • Local Persistence Ledger Vault      │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼ (If Approved)
                    ┌────────────────────────────────────────┐
                    │   MISSION CONTROL COCKPIT & DISPATCH   │
                    │  • Real-Time Web Audio Dynamic Bars    │
                    │  • Visual Invoice Slip Slide-Over      │
                    │  • Signed Webhook Dispatch (200 OK)    │
                    │  • PDF / JSON Audit Export             │
                    └────────────────────────────────────────┘
```

---

## ⚡ Core Defense Features

### 1. 🛡️ Unbilled Scope Creep Defense
When clients sneak in feature expansions disguised as *"small tweaks"* over WhatsApp or Slack, the cognitive engine flags `isScopeExpansion: true`. The airlock calculates billable developer hours against the **\$60/hr benchmark** ($24\text{h} \times \$60/\text{h} = \$1,440$). If the client offered \$0, the airlock flags a **Critical Deficit Violation** and prevents unbilled work before a formal scope rider invoice is dispatched.

### 2. 🛑 Hard Budget Ceiling Protection
Guards solo founders from accidental exposure to high-liability requests. Any ticket requesting unauthorized autonomous spends greater than **\$5,000** triggers an immediate **Hard Budget Ceiling Breach** and fail-closed quarantine.

### 3. 🔐 Automated PII & Secret Redaction
Filters incoming client transmissions through regex security sweeps before storing or dispatching:
- **AWS Access Keys:** `AKIA...` $\rightarrow$ `[REDACTED_AWS_ACCESS_KEY]`
- **Stripe & Live API Secrets:** `sk_live_...` $\rightarrow$ `[REDACTED_API_SECRET_TOKEN]`
- **Social Security Numbers (SSN):** `\d{3}-\d{2}-\d{4}` $\rightarrow$ `[REDACTED_SSN]`
- **Credit Card Numbers & Tokens:** $\rightarrow$ `[REDACTED_FINANCIAL_CARD]`

### 4. 🎙️ Real-Time Web Audio Dictation Telemetry
Upgrade "Voice Dictate" captures live microphone streams via browser `navigator.mediaDevices.getUserMedia`, connecting an `AudioContext` and `AnalyserNode` to animate dynamic 8-band acoustic waveform telemetry bars and transcribing via native Web Speech Recognition.

### 5. 🗄️ Local Persistence Ledger Vault
All evaluated audit packets are stored locally in the browser's persistent storage under `airlock_audit_vault_v1`. Page refreshes restore previous audits and state transitions seamlessly without hydration layout shifts.

### 6. 🔗 Cryptographic Webhook Automation Pipeline
Dispatches cryptographically verified POST payloads directly to Zapier, Make.com, n8n, Slack, or internal ERP systems with custom authentication headers (`X-Airlock-Signature: <SHA-256>`).

---

## 🛠️ Technology Stack

| Layer | Technology | Specification |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | React 19, Server & Route Handlers, Edge Compatible |
| **Language** | TypeScript 5.7 | 100% Strict Type Safety, Zero `any` leaks |
| **Intelligence** | Google Gemini 2.5 Flash | Structured Outputs (`response_schema`), Zero Execution Authority |
| **Styling** | Tailwind CSS 3.4 | Dark Aerospace Telemetry Theme (`#030712`, `#0b0f19`, Neon Cyan) |
| **Icons** | Lucide React | High-performance tree-shakeable icons |
| **Audio** | Web Audio API | `AudioContext`, `AnalyserNode`, `SpeechRecognition` |
| **Auditing** | Node / Web Crypto | Deterministic Canonical Key-Sorted SHA-256 Digestion |
| **Persistence** | LocalStorage Engine | Local-First Ledger Vault (`airlock_audit_vault_v1`) |

---

## 📂 Project Structure

```
cognitive-airlock-os/
├── types/
│   └── airlock.ts             # Strict TypeScript interfaces for payloads, intents, rules, & receipts
├── lib/
│   └── airlock-linter.ts      # Deterministic engine: $5k cap, $60/hr scope calc, PII filter, SHA-256
├── app/
│   ├── api/
│   │   ├── ingest/route.ts    # Gemini 2.5 Flash structured schema ingestion & airlock evaluation
│   │   └── dispatch/route.ts  # Cryptographic webhook dispatch pipeline with signed headers
│   ├── page.tsx               # Aerospace Telemetry Mission Control HUD & Local Audit Vault
│   ├── layout.tsx             # Root dark aerospace layout
│   └── globals.css            # Tailwind directives & glow effects
├── components/
│   ├── IngestDock.tsx         # Raw input dock with Web Audio mic dictation & scenario presets
│   └── AirlockCockpit.tsx     # Live telemetry HUD, violation matrix, & visual invoice slip drawer
└── scripts/
    ├── verify-airlock.ts      # Unit tests for deterministic linter & PII redaction
    ├── e2e-verify.ts          # 3-Phase live server automated E2E integration test
    ├── test-webhook-dispatch.ts # Webhook automation verification with mock HTTP receiver
    └── live-dispatch-pipeline.ts# Full end-to-end simulation: Ingest -> Lint -> Dispatch -> Webhook
```

---

## 🚀 Quickstart & Verification

### 1. Clone & Install
```bash
git clone https://github.com/fokrulanthro16-eng/cognitive-airlock-os.git
cd cognitive-airlock-os
npm install
```

### 2. Configure Environment (Optional)
The system runs out of the box with the local deterministic engine. To connect live Gemini 2.5 Flash, copy the example:
```bash
cp .env.local.example .env.local
```
Add your free API key from [Google AI Studio](https://aistudio.google.com/):
```env
GEMINI_API_KEY=your_gemini_api_key_here
BENCHMARK_HOURLY_RATE_USD=60
HARD_BUDGET_CEILING_USD=5000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the Mission Control HUD.

### 4. Run Automated Verification Suites
```bash
# 1. Deterministic Linter Suite
npx tsx scripts/verify-airlock.ts

# 2. Live E2E Ingestion & Policy Test
npx tsx scripts/e2e-verify.ts

# 3. Live Webhook Dispatch Pipeline Test
npx tsx scripts/live-dispatch-pipeline.ts
```

---

## 📜 Cryptographic Verification Proof

Every authorized dispatch generates a canonical audit payload signed with SHA-256:

```json
{
  "event": "ACTION_DISPATCHED",
  "trace_id": "log_1789495777188_a85c",
  "sha256_proof": "caed1fc80f6c5ab21a749ef82bad149b989b26801e5776922299ceb5ccad8d05",
  "client_entity": "Starlight Media",
  "amount": 450,
  "sanitized_intent": "Monthly retainer ticket: Perform routine dependency audit, update Docker containers...",
  "target_integration": "STRIPE_INVOICE",
  "timestamp": "2026-09-15T18:09:37.241Z",
  "receipt_id": "rcpt_1789495777241_UMDU7Z"
}
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE). Built for solo operators, freelancers, and sovereign agencies worldwide.
