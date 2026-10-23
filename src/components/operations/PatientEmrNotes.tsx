import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  FileText,
  Save,
  Sparkles,
  Clock,
  CheckCircle2,
  Copy,
  Trash2,
  Volume2,
  AlertCircle,
  Search,
  UserCheck,
} from 'lucide-react';
import {
  EmrNote,
  getPatientEmrNotes,
  createPatientEmrNote,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { usePrivacyStore, maskFreeTextPii } from '@/lib/privacy';
import { useClinicalNoteAutoSave } from '@/lib/clinicalNoteAutoSave';
import ClinicalNoteAutoSaveBanner from './ClinicalNoteAutoSaveBanner';

interface PatientEmrNotesProps {
  patientId: number;
  patientName?: string;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

const NOTE_TYPES = [
  'SOAP Progress Note',
  'Clinical Observation',
  'Bedside Rounding Note',
  'Procedure & Intervention Note',
  'Consultation Summary',
];

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Español' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
];

const DEMO_DICTATION_PHRASES = [
  'Subjective: Patient reports steady improvement in chest comfort and normal sleep quality overnight.',
  'Objective: Vital signs stable with blood pressure 118/76 mmHg, heart rate 72 bpm in normal sinus rhythm, SpO2 98% on room air.',
  'Assessment: Controlled hypertension and stable cardiovascular status following medication titration.',
  'Plan: Continue current beta-blocker regimen, encourage daily ambulation, and review metabolic panel prior to discharge.',
];

function formatMedicalTranscript(raw: string): string {
  return raw
    .replace(/\bnew paragraph\b/gi, '\n\n')
    .replace(/\bnew line\b/gi, '\n')
    .replace(/\bperiod\b/gi, '.')
    .replace(/\bfull stop\b/gi, '.')
    .replace(/\bcomma\b/gi, ',')
    .replace(/\bcolon\b/gi, ':')
    .replace(/\bsemicolon\b/gi, ';')
    .replace(/\bquestion mark\b/gi, '?')
    .replace(/\s+([.,:;?])/g, '$1');
}

export default function PatientEmrNotes({ patientId, patientName }: PatientEmrNotesProps) {
  const { user } = useAuthStore();
  const { isPrivacyMode } = usePrivacyStore();
  const [notes, setNotes] = useState<EmrNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [noteType, setNoteType] = useState<string>('SOAP Progress Note');
  const [noteContent, setNoteContent] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSimulatingDictation, setIsSimulatingDictation] = useState<boolean>(false);
  const [usedVoiceDictation, setUsedVoiceDictation] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>('en-US');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldKeepListeningRef = useRef<boolean>(false);
  const simulationTimerRef = useRef<number | null>(null);

  // Dual-engine LocalStorage + IndexedDB Auto-Save
  const autoSave = useClinicalNoteAutoSave({
    formScope: 'emr_chart_note',
    patientId,
    patientName,
    noteType,
    content: noteContent,
    language,
    voiceTranscribed: usedVoiceDictation,
    onRestoreDraft: (draft) => {
      setNoteContent(draft.content);
      if (draft.noteType) setNoteType(draft.noteType);
      if (draft.language) setLanguage(draft.language);
      if (typeof draft.voiceTranscribed === 'boolean') {
        setUsedVoiceDictation(draft.voiceTranscribed);
      }
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSpeechSupported(Boolean(SpeechRec));
    }
  }, []);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPatientEmrNotes(patientId);
      setNotes(data);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (!isRecording && !isSimulatingDictation) {
      setRecordingSeconds(0);
      return;
    }
    const interval = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRecording, isSimulatingDictation]);

  const stopRecording = useCallback(() => {
    shouldKeepListeningRef.current = false;
    setIsRecording(false);
    setInterimTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors if already stopped
      }
      recognitionRef.current = null;
    }
    if (simulationTimerRef.current) {
      window.clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsSimulatingDictation(false);
  }, []);

  useEffect(() => () => stopRecording(), [stopRecording]);

  const startVoiceRecording = () => {
    setSpeechError(null);
    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechSupported(false);
      setSpeechError(
        'Browser Web Speech API is unavailable in this environment. Use "Demo Voice Dictation" to test clinical transcription.'
      );
      return;
    }

    try {
      const recognition: BrowserSpeechRecognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript + ' ';
          } else {
            interimChunk += res[0].transcript;
          }
        }
        if (finalChunk) {
          const formatted = formatMedicalTranscript(finalChunk);
          setNoteContent((prev) => {
            const sep = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
            return `${prev}${sep}${formatted.trim()}`;
          });
          setUsedVoiceDictation(true);
        }
        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech') return;
        setSpeechError(
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'Microphone access was blocked. Allow permission or use "Demo Voice Dictation".'
            : `Voice recognition paused (${event.error}).`
        );
        stopRecording();
      };

      recognition.onend = () => {
        if (shouldKeepListeningRef.current) {
          try {
            recognition.start();
          } catch {
            setIsRecording(false);
            shouldKeepListeningRef.current = false;
          }
        } else {
          setIsRecording(false);
          setInterimTranscript('');
        }
      };

      recognitionRef.current = recognition;
      shouldKeepListeningRef.current = true;
      recognition.start();
      setIsRecording(true);
      setUsedVoiceDictation(true);
      toast.info('Voice dictation active — speak clinical observations clearly.');
    } catch (err: any) {
      setSpeechError(err?.message || 'Could not initialize Web Speech API.');
      setIsRecording(false);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording || isSimulatingDictation) {
      stopRecording();
      toast.success('Voice dictation stopped.');
    } else {
      startVoiceRecording();
    }
  };

  const handleSimulateVoiceDictation = () => {
    if (isRecording || isSimulatingDictation) {
      stopRecording();
      return;
    }
    setSpeechError(null);
    setIsSimulatingDictation(true);
    setUsedVoiceDictation(true);

    let phraseIdx = 0;
    let wordIdx = 0;

    simulationTimerRef.current = window.setInterval(() => {
      if (phraseIdx >= DEMO_DICTATION_PHRASES.length) {
        if (simulationTimerRef.current) {
          window.clearInterval(simulationTimerRef.current);
          simulationTimerRef.current = null;
        }
        setInterimTranscript('');
        setIsSimulatingDictation(false);
        toast.success('Voice transcription completed and auto-saved.');
        return;
      }

      const currentWords = DEMO_DICTATION_PHRASES[phraseIdx].split(' ');
      if (wordIdx < currentWords.length) {
        setInterimTranscript(currentWords.slice(0, wordIdx + 1).join(' '));
        wordIdx += 2;
      } else {
        const completedLine = DEMO_DICTATION_PHRASES[phraseIdx];
        setNoteContent((prev) => (prev ? `${prev}\n${completedLine}` : completedLine));
        setInterimTranscript('');
        phraseIdx += 1;
        wordIdx = 0;
      }
    }, 180);
  };

  const insertSoapSection = (heading: string) => {
    setNoteContent((prev) => {
      const prefix = prev && !prev.endsWith('\n') ? '\n' : '';
      return `${prev}${prefix}${heading}: `;
    });
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = [noteContent.trim(), interimTranscript.trim()]
      .filter(Boolean)
      .join(' ');

    if (!finalContent) {
      toast.error('Please record or enter a clinical observation before saving.');
      return;
    }

    if (isRecording || isSimulatingDictation) {
      stopRecording();
    }

    setIsSaving(true);
    try {
      const created = await createPatientEmrNote(patientId, {
        patient_id: patientId,
        author_name: user?.full_name || 'Dr. Sarah Chen, MD',
        author_role: user?.role
          ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)} Clinician`
          : 'Attending Physician',
        note_type: noteType,
        content: finalContent,
        voice_transcribed: usedVoiceDictation,
        language,
      });

      setNotes((prev) => [created, ...prev.filter((n) => n.id !== created.id)]);
      setNoteContent('');
      setInterimTranscript('');
      setUsedVoiceDictation(false);
      await autoSave.discardDraft();

      toast.success(
        created.queued_offline
          ? 'EMR note saved offline and queued for automatic background sync.'
          : 'Clinical observation saved to patient EMR and draft cleared.'
      );
    } catch {
      toast.error('Failed to save EMR note; draft remains protected in IndexedDB.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyNote = (note: EmrNote) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(note.content);
      setCopiedId(note.id);
      toast.info('EMR note copied to clipboard.');
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const rem = (sec % 60).toString().padStart(2, '0');
    return `${mins}:${rem}`;
  };

  const filteredNotes = notes.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.content.toLowerCase().includes(q) ||
      n.note_type.toLowerCase().includes(q) ||
      n.author_name.toLowerCase().includes(q)
    );
  });

  const activeListening = isRecording || isSimulatingDictation;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Mic className="w-3.5 h-3.5" />
            Web Speech API · Dual-Engine Auto-Save (IndexedDB + LocalStorage)
          </div>
          <h2 className="text-lg font-extrabold text-white">
            Patient EMR Notes &amp; Voice Transcription
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dictate bedside clinical observations hands-free or type directly into{' '}
            <span className="text-slate-200 font-semibold">
              {patientName || `Patient #${patientId}`}
            </span>
            &apos;s electronic medical record.
          </p>
        </div>

        {/* Recording Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Dictation Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={activeListening}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleToggleRecording}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                Stop Dictation ({formatTimer(recordingSeconds)})
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                Start Voice Dictation
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSimulateVoiceDictation}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isSimulatingDictation
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-950/90 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
            title="Simulate clinical voice dictation when working without a microphone"
          >
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            {isSimulatingDictation
              ? `Transcribing... (${formatTimer(recordingSeconds)})`
              : 'Demo Voice Dictation'}
          </button>
        </div>
      </div>

      {/* Speech Error Notice */}
      {speechError && (
        <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Voice Recognition Notice</span>
              {speechError}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-xs text-amber-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

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
          setInterimTranscript('');
          setUsedVoiceDictation(false);
          void autoSave.discardDraft();
          toast.info('Cleared unsaved clinical note draft from local storage & IndexedDB.');
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dictation Studio & Note Editor */}
        <form onSubmit={handleSaveNote} className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                EMR Note Category
              </label>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {NOTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Quick SOAP Sections
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['Subjective', 'Objective', 'Assessment', 'Plan'].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => insertSoapSection(sec)}
                    className="px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    + {sec[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeListening && (
            <div className="px-4 py-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
                <div className="text-xs">
                  <span className="font-bold text-white">
                    Listening for clinical observations...
                  </span>
                  <span className="text-indigo-300 ml-2 font-mono">
                    {formatTimer(recordingSeconds)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Note Textarea */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="emr-clinical-note-textarea"
                className="text-xs font-semibold text-slate-300 flex items-center gap-2"
              >
                <span>Clinical Observation Transcript</span>
                {usedVoiceDictation && (
                  <span className="text-indigo-300 text-[10px] font-mono">
                    · Voice Transcribed
                  </span>
                )}
              </label>
              {noteContent && (
                <button
                  type="button"
                  onClick={() => {
                    setNoteContent('');
                    setInterimTranscript('');
                    setUsedVoiceDictation(false);
                    void autoSave.discardDraft();
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <textarea
              id="emr-clinical-note-textarea"
              rows={7}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Click 'Start Voice Dictation' or type SOAP progress notes directly (auto-saved continuously to LocalStorage & IndexedDB)..."
              className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-500 leading-relaxed focus:outline-none focus:border-indigo-500 resize-y font-sans"
            />

            {interimTranscript && (
              <div className="mt-2 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 italic flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-spin" />
                <span>Live speech: &ldquo;{interimTranscript}&rdquo;</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-400">
              {speechSupported
                ? 'Web Speech API Ready · Dual LocalStorage + IndexedDB Auto-Save'
                : 'Simulation Mode Ready · Dual LocalStorage + IndexedDB Auto-Save'}
            </span>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving to EMR...' : 'Save to Patient EMR'}
            </button>
          </div>
        </form>

        {/* Right Column: Recorded EMR Notes History */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">
                Recorded EMR Notes ({filteredNotes.length})
              </h3>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter notes..."
                className="bg-slate-950/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-center text-xs text-slate-400">
                Loading patient EMR notes...
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-center text-xs text-slate-400">
                No matching EMR notes found for this patient.
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-indigo-300 font-bold">{note.note_type}</span>
                      {note.voice_transcribed && (
                        <>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="inline-flex items-center gap-1 text-emerald-300 text-[10px] font-mono">
                            <Mic className="w-2.5 h-2.5" /> Voice Dictated
                          </span>
                        </>
                      )}
                      {note.queued_offline && (
                        <>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-amber-300 text-[10px] font-mono">
                            Queued Offline Sync
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(note.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyNote(note)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy note content"
                      >
                        {copiedId === note.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                    {maskFreeTextPii(note.content, isPrivacyMode)}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3 text-indigo-400" />
                      <strong className="text-slate-300">{note.author_name}</strong> ·{' '}
                      {note.author_role}
                    </span>
                    {note.language && (
                      <span className="font-mono text-[10px] text-slate-500">
                        {note.language}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
