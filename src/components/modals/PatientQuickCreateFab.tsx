import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  X,
  FileText,
  UserPlus,
  CheckCircle2,
  ArrowUpRight,
  Stethoscope,
  Sparkles,
  Building2,
  Activity,
} from 'lucide-react';
import {
  createPatientEmrNote,
  createPatientRegistryRecord,
  type CreatedPatientRegistryRecord,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { usePrivacyStore, maskPatientName, maskMrn } from '@/lib/privacy';
import { useOfflineAuditStore } from '@/lib/offlineAuditLogger';
import { useClinicalNoteAutoSave } from '@/lib/clinicalNoteAutoSave';
import ClinicalNoteAutoSaveBanner from '@/components/operations/ClinicalNoteAutoSaveBanner';
import { toast } from '@/lib/toast';

export interface FabPatientOption {
  id: number;
  mrn: string;
  full_name: string;
  username: string;
  department: string;
  status?: string;
}

export type QuickCreateMode = 'note' | 'patient';

interface PatientQuickCreateFabProps {
  patients: FabPatientOption[];
  departments: string[];
  externalOpenMode?: QuickCreateMode | null;
  preselectedPatientId?: number | null;
  onCloseExternal?: () => void;
  onPatientCreated: (newPatient: CreatedPatientRegistryRecord) => void;
  onClinicalNoteAdded?: (patientId: number, noteType: string) => void;
}

const NOTE_TYPES = [
  'SOAP Progress Note',
  'Clinical Observation',
  'Bedside Rounding Note',
  'Procedure & Intervention Note',
  'Consultation Summary',
];

const QUICK_NOTE_TEMPLATES: Array<{ label: string; noteType: string; text: string }> = [
  {
    label: 'SOAP Progress Template',
    noteType: 'SOAP Progress Note',
    text: 'Subjective: Patient alert and oriented x3, denies acute chest pain or shortness of breath.\nObjective: Vital signs stable on bedside telemetry; lungs clear to auscultation bilaterally.\nAssessment: Hemodynamically stable inpatient course.\nPlan: Continue current pharmacotherapy and repeat morning metabolic panel.',
  },
  {
    label: 'Bedside Vitals Check',
    noteType: 'Bedside Rounding Note',
    text: 'Bedside rounding assessment completed. Sinus rhythm verified on monitor, SpO2 >= 97% on room air, peripheral pulses 2+ bilaterally. No acute distress observed.',
  },
  {
    label: 'Triage Escalation Note',
    noteType: 'Clinical Observation',
    text: 'Patient evaluated for trending vital sign excursion. Repeat orthostatic blood pressure and 12-lead ECG ordered; charge nurse and attending physician notified.',
  },
];

export default function PatientQuickCreateFab({
  patients,
  departments,
  externalOpenMode,
  preselectedPatientId,
  onCloseExternal,
  onPatientCreated,
  onClinicalNoteAdded,
}: PatientQuickCreateFabProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isPrivacyMode } = usePrivacyStore();

  const [speedDialOpen, setSpeedDialOpen] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<QuickCreateMode>('note');

  // Clinical Note Form State
  const [notePatientId, setNotePatientId] = useState<number>(
    preselectedPatientId || patients[0]?.id || 42
  );
  const [noteType, setNoteType] = useState<string>('SOAP Progress Note');
  const [noteContent, setNoteContent] = useState<string>('');
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [noteSavedSuccess, setNoteSavedSuccess] = useState<{
    patientId: number;
    patientName: string;
    noteType: string;
  } | null>(null);

  // New Patient Record Form State
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [department, setDepartment] = useState<string>('Cardiology');
  const [acuityStatus, setAcuityStatus] = useState<string>('active');
  const [initialNote, setInitialNote] = useState<string>('');
  const [submittingPatient, setSubmittingPatient] = useState<boolean>(false);
  const [createdPatientResult, setCreatedPatientResult] =
    useState<CreatedPatientRegistryRecord | null>(null);

  const selectedPatientObj = patients.find((p) => p.id === notePatientId);

  // Dual-engine LocalStorage + IndexedDB Auto-Save for Quick Clinical Note
  const autoSave = useClinicalNoteAutoSave({
    formScope: 'quick_fab_note',
    patientId: notePatientId,
    patientName: selectedPatientObj?.full_name,
    noteType,
    content: noteContent,
    onRestoreDraft: (draft) => {
      setNoteContent(draft.content);
      if (draft.noteType) setNoteType(draft.noteType);
    },
  });

  useEffect(() => {
    if (externalOpenMode) {
      setActiveTab(externalOpenMode);
      setModalOpen(true);
      setSpeedDialOpen(false);
      setNoteSavedSuccess(null);
      setCreatedPatientResult(null);
    }
  }, [externalOpenMode]);

  useEffect(() => {
    if (preselectedPatientId) {
      setNotePatientId(preselectedPatientId);
    } else if (patients.length > 0 && !patients.some((p) => p.id === notePatientId)) {
      setNotePatientId(patients[0].id);
    }
  }, [preselectedPatientId, patients, notePatientId]);

  const openModalWithMode = (mode: QuickCreateMode) => {
    setActiveTab(mode);
    setModalOpen(true);
    setSpeedDialOpen(false);
    setNoteSavedSuccess(null);
    setCreatedPatientResult(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSpeedDialOpen(false);
    if (onCloseExternal) onCloseExternal();
  };

  const handleCreateClinicalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteContent.trim();
    if (!trimmed || submittingNote) return;

    setSubmittingNote(true);
    const targetPatient = patients.find((p) => p.id === notePatientId);
    const authorName = user?.full_name || 'Dr. Sarah Chen, MD';

    try {
      await createPatientEmrNote(notePatientId, {
        patient_id: notePatientId,
        note_type: noteType,
        content: trimmed,
        voice_transcribed: false,
        language: 'en-US',
        author_name: authorName,
        author_role: user?.role || 'Attending Physician',
      });

      await useOfflineAuditStore.getState().recordOfflineAuditEvent({
        eventType: 'DATA_MODIFICATION',
        action: 'QUICK_FAB_EMR_NOTE_CREATED',
        resourcePath: `/v1/hospital/patients/${notePatientId}/emr-notes`,
        httpMethod: 'POST',
        targetPatientId: notePatientId,
        details: `Added ${noteType} via Patients Registry Quick Action for Patient #${notePatientId}.`,
      });

      setNoteSavedSuccess({
        patientId: notePatientId,
        patientName: targetPatient?.full_name || `Patient #${notePatientId}`,
        noteType,
      });
      setNoteContent('');
      await autoSave.discardDraft();
      if (onClinicalNoteAdded) {
        onClinicalNoteAdded(notePatientId, noteType);
      }
      toast.success(`Saved ${noteType} to Patient #${notePatientId}'s EMR chart.`);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleCreatePatientRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (!trimmedName || submittingPatient) return;

    setSubmittingPatient(true);
    const authorName = user?.full_name || 'Dr. Sarah Chen, MD';

    try {
      const created = await createPatientRegistryRecord({
        full_name: trimmedName,
        email: email.trim() || undefined,
        department,
        status: acuityStatus,
        initial_note: initialNote.trim() || undefined,
        author_name: authorName,
        author_role: user?.role || 'Attending Physician',
      });

      await useOfflineAuditStore.getState().recordOfflineAuditEvent({
        eventType: 'DATA_MODIFICATION',
        action: 'QUICK_FAB_PATIENT_REGISTERED',
        resourcePath: '/v1/hospital/patients',
        httpMethod: 'POST',
        targetPatientId: created.id,
        details: `Registered new patient (${created.mrn} · ${created.department} · ${created.status}) via Patients Registry FAB.`,
      });

      onPatientCreated(created);
      setCreatedPatientResult(created);
      setFullName('');
      setEmail('');
      setInitialNote('');
      toast.success(`Registered ${created.full_name} (${created.mrn}) in ${created.department}.`);
    } finally {
      setSubmittingPatient(false);
    }
  };

  const selectableDepartments = departments.filter((d) => d !== 'All');
  const departmentOptions =
    selectableDepartments.length > 0
      ? selectableDepartments
      : ['Cardiology', 'OPD', 'ICU', 'Emergency', 'Inpatient'];

  return (
    <>
      <div
        aria-label="Quick clinical actions floating menu"
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5"
      >
        {speedDialOpen && (
          <div className="flex flex-col items-end gap-2 mb-1">
            <button
              type="button"
              onClick={() => openModalWithMode('note')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold shadow-xl flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Add Clinical Note</span>
            </button>

            <button
              type="button"
              onClick={() => openModalWithMode('patient')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold shadow-xl flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>New Patient Record</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openModalWithMode('note')}
            aria-label="Quick Add Clinical Note or Patient Record"
            className="h-12 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 border border-indigo-400/30 flex items-center gap-2.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Quick Note / New Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setSpeedDialOpen((prev) => !prev)}
            aria-label={speedDialOpen ? 'Close quick actions menu' : 'Expand quick actions menu'}
            aria-expanded={speedDialOpen}
            className="h-12 w-12 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shadow-xl transition-all cursor-pointer"
          >
            {speedDialOpen ? <X className="w-4 h-4" /> : <Stethoscope className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-create-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/50">
              <div>
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wide">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Direct Registry Clinical Composer · Auto-Save Active</span>
                </div>
                <h2 id="quick-create-modal-title" className="text-lg font-bold text-white mt-0.5">
                  {activeTab === 'note'
                    ? 'Add Clinical EMR Note'
                    : 'Register New Patient Record'}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="px-6 pt-4">
              <div
                role="tablist"
                aria-label="Choose clinical action type"
                className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'note'}
                  onClick={() => {
                    setActiveTab('note');
                    setNoteSavedSuccess(null);
                  }}
                  className={`py-2 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'note'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Add Clinical Note</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'patient'}
                  onClick={() => {
                    setActiveTab('patient');
                    setCreatedPatientResult(null);
                  }}
                  className={`py-2 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'patient'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>New Patient Record</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {activeTab === 'note' ? (
                <form onSubmit={handleCreateClinicalNote} className="space-y-4">
                  {/* Dual-Engine LocalStorage + IndexedDB Auto-Save Status Bar */}
                  <ClinicalNoteAutoSaveBanner
                    status={autoSave.status}
                    lastSavedAt={autoSave.lastSavedAt}
                    revisionCount={autoSave.revisionCount}
                    isOnline={autoSave.isOnline}
                    simulatedNetworkDrop={autoSave.simulatedNetworkDrop}
                    restoredFromStorage={autoSave.restoredFromStorage}
                    integrityChecksum={autoSave.integrityChecksum}
                    hasContent={Boolean(noteContent.trim())}
                    onToggleSimulateNetworkDrop={autoSave.toggleSimulateNetworkDrop}
                    onForceSaveNow={() => {
                      void autoSave.forceSaveNow();
                      toast.info('Snapshot saved to LocalStorage and IndexedDB.');
                    }}
                    onDiscardDraft={() => {
                      setNoteContent('');
                      void autoSave.discardDraft();
                      toast.info('Cleared unsaved note draft from LocalStorage & IndexedDB.');
                    }}
                  />

                  {noteSavedSuccess && (
                    <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Saved <strong>{noteSavedSuccess.noteType}</strong> for{' '}
                          <strong>
                            {maskPatientName(
                              noteSavedSuccess.patientName,
                              noteSavedSuccess.patientId,
                              isPrivacyMode
                            )}
                          </strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          closeModal();
                          navigate(`/patients/${noteSavedSuccess.patientId}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <span>Open Chart</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor="quick-note-patient-select"
                        className="block text-xs font-semibold text-slate-300 mb-1.5"
                      >
                        Target Patient
                      </label>
                      <select
                        id="quick-note-patient-select"
                        value={notePatientId}
                        onChange={(e) => {
                          setNoteContent('');
                          setNotePatientId(Number(e.target.value));
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {patients.map((pt) => (
                          <option key={pt.id} value={pt.id} className="bg-slate-950 text-white">
                            {maskPatientName(pt.full_name, pt.id, isPrivacyMode)} (
                            {maskMrn(pt.mrn, pt.id, isPrivacyMode)} · {pt.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="quick-note-type-select"
                        className="block text-xs font-semibold text-slate-300 mb-1.5"
                      >
                        Clinical Note Category
                      </label>
                      <select
                        id="quick-note-type-select"
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {NOTE_TYPES.map((t) => (
                          <option key={t} value={t} className="bg-slate-950 text-white">
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>1-Click Clinical Templates</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_NOTE_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.label}
                          type="button"
                          onClick={() => {
                            setNoteType(tpl.noteType);
                            setNoteContent(tpl.text);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          + {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="quick-note-content"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      Clinical Observations &amp; Plan
                    </label>
                    <textarea
                      id="quick-note-content"
                      rows={5}
                      required
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Enter SOAP progress note, bedside observations, or consultation findings (auto-saved continuously to LocalStorage & IndexedDB)..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Close (Draft Auto-Saved)
                    </button>
                    <button
                      type="submit"
                      disabled={submittingNote || !noteContent.trim()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{submittingNote ? 'Saving Note...' : 'Save Clinical Note'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreatePatientRecord} className="space-y-4">
                  {createdPatientResult && (
                    <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Registered{' '}
                          <strong>
                            {maskPatientName(
                              createdPatientResult.full_name,
                              createdPatientResult.id,
                              isPrivacyMode
                            )}
                          </strong>{' '}
                          ({maskMrn(createdPatientResult.mrn, createdPatientResult.id, isPrivacyMode)})
                          in {createdPatientResult.department}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          closeModal();
                          navigate(`/patients/${createdPatientResult.id}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <span>Open Chart</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor="new-patient-fullname"
                        className="block text-xs font-semibold text-slate-300 mb-1.5"
                      >
                        Patient Full Name *
                      </label>
                      <input
                        id="new-patient-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g., Arthur Pendelton"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="new-patient-email"
                        className="block text-xs font-semibold text-slate-300 mb-1.5"
                      >
                        Contact Email (Optional)
                      </label>
                      <input
                        id="new-patient-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="patient@example.com"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor="new-patient-department"
                        className="block text-xs font-semibold text-slate-300 mb-1.5"
                      >
                        <Building2 className="w-3.5 h-3.5 inline mr-1 text-indigo-400" />
                        Assigned Department / Ward
                      </label>
                      <select
                        id="new-patient-department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {departmentOptions.map((dept) => (
                          <option key={dept} value={dept} className="bg-slate-950 text-white">
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="new-patient-acuity"
                        className="block text-xs font-semibold text-slate-300 mb-1.5"
                      >
                        <Activity className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
                        Initial Clinical Acuity
                      </label>
                      <select
                        id="new-patient-acuity"
                        value={acuityStatus}
                        onChange={(e) => setAcuityStatus(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="active" className="bg-slate-950 text-white">
                          Active / Open Admission
                        </option>
                        <option value="stable" className="bg-slate-950 text-white">
                          Stable Observation
                        </option>
                        <option value="triage" className="bg-slate-950 text-white">
                          Triage Evaluation
                        </option>
                        <option value="critical" className="bg-slate-950 text-white">
                          Critical / High Acuity
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="new-patient-initial-note"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      Chief Complaint &amp; Initial Clinical Note (Optional)
                    </label>
                    <textarea
                      id="new-patient-initial-note"
                      rows={3}
                      value={initialNote}
                      onChange={(e) => setInitialNote(e.target.value)}
                      placeholder="Document presenting symptoms, admission reason, or initial triage vitals..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPatient || !fullName.trim()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>
                        {submittingPatient ? 'Registering...' : 'Register Patient Record'}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
