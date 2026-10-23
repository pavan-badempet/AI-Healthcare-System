# 🩺 AI Healthcare System — React Clinical Workstation

> Planetary-Scale Open-Source Clinical Intelligence, TabICLv2 Foundation Model & Databricks Lakehouse Platform rewritten as a modern React application.

---

## 🌟 Overview

The **AI Healthcare System** is an open-source clinical workstation and Electronic Health Record (EHR) decision support platform. It integrates tabular foundation models (TabICLv2), longitudinal physiological simulation, 95% conformal confidence coverage sets, and HL7 FHIR R4 standard models.

This application has been rewritten into a production-grade **React 19 + TypeScript + Vite + Tailwind CSS** architecture listening on port 3000 (`0.0.0.0:3000`).

---

## 🚀 Key Modules & Feature Highlights

1. **Hospital Operations Cockpit (`/dashboard`, `/capacity`)**:
   - Real-time ICU and ward bed occupancy management.
   - Bedside telemetry feeds and status updating (occupied/available).
   - Clinical care events bus and emergency alert feeds.

2. **Electronic Medical Records & Patients Registry (`/patients`, `/patients/:id`)**:
   - Comprehensive longitudinal patient chart navigation.
   - Clinical actions: encounters, admissions, and clinical orders (labs, radiology, medications).
   - Real-time monitoring signals and diagnostic results review.
   - Cryptographically-signed HL7 FHIR R4 Bundle exporter.
   - Active medication reconciliation with generic substitution and pricing calculators.

3. **Autonomous Frontier — Level 5 Health OS (`/frontier`)**:
   - **BioTwin-X 10-Year Coupled ODE**: Longitudinal multi-organ simulation (cardiac reserve, eGFR, vascular elasticity, metabolic resistance).
   - **Causal do-Calculus**: Pearl Level-3 counterfactual deduction with VanderWeele & Ding E-value sensitivity.
   - **Live Cybernetics & ICU**: Lyapunov-constrained closed-loop vasopressor titration ensuring asymptotic hemodynamic stability.
   - **Generative Molecular Docking**: SE(3) equivariant force-field biophysical binding affinity (&Delta;G).
   - **ZK Sovereign Passport**: Zero-knowledge non-interactive proofs (Fiat-Shamir heuristics) validating health assertions with zero PHI leakage.
   - **Delphi Consensus Swarm**: Multi-specialist Bayesian deliberation council with adversarial skeptic checks.
   - **Neuro-Symbolic PGx**: First-order logic (FOL) CPIC pharmacogenomic theorem prover.
   - **Offline CRDT Sync**: Strong eventual consistency join-semilattice chart synchronization for disconnected field units.
   - **Chaos & Concurrency**: Adaptive concurrency limiting and cryptographic idempotency.
   - **500 Hz Waveforms**: High-frequency Lead II ECG monitor with arrhythmia simulator.
   - **WebGPU 3D Volume**: Transfer function presets (Bone, Soft Tissue, Angiography) for volumetric CT/MRI rendering.

4. **Calibrated TabICLv2 Diagnostic AI (`/predict`, `/predict/unified`, `/predict/:modelType`)**:
   - 5 organ systems: Type 2 Diabetes, Cardiovascular Heart Disease, Chronic Kidney Disease (CKD), Hepatic Fibrosis, and Pulmonary Disease.
   - Exact 95% conformal confidence prediction sets with Shapley feature attributions.

5. **AI Clinical Chat Copilot (`/chat`)**:
   - Interactive streaming clinical assistant with multi-model switcher, RAG scope selection, and clinical safety disclaimers.

6. **WebRTC Telemedicine & Remote Consultation (`/telemedicine`)**:
   - Encrypted video consultation screen with live vitals telemetry HUD.
   - Specialist appointment scheduling with CASA (Clinical Assessment Scheduling Assistant) chatbot.

7. **SMART on FHIR v2 Sandbox (`/apps`)**:
   - App registry and sandbox launcher for pediatric growth charts, ASCVD risk calculators, and PharmGKB PGx advisors.

8. **Databricks Lakehouse & OMOP CDM Data Engineering (`/data-engineering`, `/admin`)**:
   - Delta Lake Medallion (Bronze/Silver/Gold) ingestion pipelines and time-travel querying.
   - Agentic BI for natural language analytical queries over clinical cohorts.
   - Great Expectations data quality rules and compliance audits.

9. **Decentralized Federated Learning (`/federated`)**:
   - Multi-institutional model training simulation with differential privacy (&epsilon;=1.25).

10. **Ayushman Bharat Digital Mission Gateway (`/abdm`)**:
    - ABHA Health ID generation and HIU/HIP consent manager.

---

## 💻 Tech Stack & Runtime

- **Framework**: React 19, TypeScript
- **Bundler & Dev Server**: Vite 6 (host `0.0.0.0`, port `3000`)
- **Styling**: Tailwind CSS v4, Framer Motion
- **Charts & Visualizations**: Recharts, Lucide React
- **State Management**: Zustand
- **Internationalization**: Custom multi-language context (English, Spanish, Hindi, French, German, Mandarin, Arabic)
- **Offline Resilience**: IndexedDB CRDT local chart store and offline mutation queue

---

## 🛠️ Development & Build Commands

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Compile production bundle
npm run build

# Preview production build
npm run preview
```

---

## ⚖️ Clinical Disclaimer

All algorithms, models, and predictions provided in this application are designed strictly for clinical decision support (CDS) and educational purposes. They do not constitute autonomous medical advice or diagnosis. Attending physicians and licensed healthcare professionals must independently review all clinical decisions.
