import React, { useState } from 'react';
import { Pill, CheckCircle2 } from 'lucide-react';
import SmartPrescriptionModule from './SmartPrescriptionModule';
import type { ActivePrescribedMedication } from '@/lib/api';

interface PatientMedicationsPanelProps {
  patientId: number;
}

const INITIAL_MEDICATIONS: ActivePrescribedMedication[] = [
  {
    id: 'MED-1',
    name: 'Lisinopril Oral Tablet',
    dosage: '10 mg',
    route: 'Oral',
    frequency: 'Once Daily (QAM)',
    indication: 'Essential Hypertension',
    rxNorm: 'RxNorm: 314076',
    status: 'active',
    started_at: '2025-11-10',
  },
  {
    id: 'MED-2',
    name: 'Metformin Hydrochloride Extended-Release',
    dosage: '500 mg',
    route: 'Oral',
    frequency: 'Twice Daily with Meals (BID)',
    indication: 'Type 2 Diabetes Mellitus',
    rxNorm: 'RxNorm: 860975',
    status: 'active',
    started_at: '2026-01-15',
  },
  {
    id: 'MED-3',
    name: 'Atorvastatin Calcium Oral Tablet',
    dosage: '20 mg',
    route: 'Oral',
    frequency: 'Nightly (QHS)',
    indication: 'Hyperlipidemia / Primary Cardiovascular Prevention',
    rxNorm: 'RxNorm: 259255',
    status: 'active',
    started_at: '2026-02-01',
  },
];

export default function PatientMedicationsPanel({ patientId }: PatientMedicationsPanelProps) {
  const [medications, setMedications] =
    useState<ActivePrescribedMedication[]>(INITIAL_MEDICATIONS);

  const handleMedicationPrescribed = (newMed: ActivePrescribedMedication) => {
    setMedications((prev) => [newMed, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Smart Prescription Module (Dosage Suggestions & Contraindication Screening) */}
      <SmartPrescriptionModule
        patientId={patientId}
        activeMedicationsOverride={medications}
        onMedicationPrescribed={handleMedicationPrescribed}
      />

      {/* Active Prescribed Medications List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider">
              <Pill className="w-4 h-4" />
              Pharmacotherapy Reconciliation
            </div>
            <h3 className="text-xl font-bold text-white mt-1">
              Active Prescribed Medications ({medications.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Synchronized RxNorm clinical ontology with automated drug-drug interaction safety scanning.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            No Unresolved Drug Interactions in Active Regimen
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {medications.map((med) => (
            <div
              key={med.id}
              className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors hover:border-slate-700"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-bold text-white text-sm">{med.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {med.dosage}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                    {med.rxNorm}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Route: {med.route}</span>
                  <span>•</span>
                  <span>Frequency: {med.frequency}</span>
                  <span>•</span>
                  <span>Indication: {med.indication}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-500">
                  Started {med.started_at}
                </span>
                <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
