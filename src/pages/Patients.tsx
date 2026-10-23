import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  ArrowUpRight,
  Eye,
  X,
  Building2,
  Activity,
  RotateCcw,
  QrCode,
  FileText,
  Keyboard,
} from 'lucide-react';
import {
  PatientQuickViewModal,
  type QuickViewPatient,
} from '@/components/modals/PatientQuickViewModal';
import PatientQrScannerModal from '@/components/modals/PatientQrScannerModal';
import PatientQuickCreateFab, {
  type QuickCreateMode,
} from '@/components/modals/PatientQuickCreateFab';
import { PrivacyModeToggle } from '@/components/layout/PrivacyModeBanner';
import {
  usePrivacyStore,
  maskPatientName,
  maskMrn,
  maskUsername,
} from '@/lib/privacy';
import { computeAutomatedPatientAssignments } from '@/lib/patientAssignmentEngine';
import {
  StaffShiftLoadBanner,
  PatientAssignedStaffCell,
} from '@/components/operations/PatientStaffAssignmentCells';
import {
  DEFAULT_DEPARTMENTS,
  fetchMergedPatientDirectory,
  isEditableTarget,
  triggerKeyboardShortcutsModal,
  type PatientDirectoryEntry,
} from '@/lib/keyboardShortcuts';
import { PatientRegistryShortcutBar } from '@/components/modals/KeyboardShortcutsModal';
import { toast } from '@/lib/toast';

export type { PatientDirectoryEntry };

export default function Patients() {
  const navigate = useNavigate();
  const { isPrivacyMode } = usePrivacyStore();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [patients, setPatients] = useState<PatientDirectoryEntry[]>([]);
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const [quickViewPatient, setQuickViewPatient] = useState<QuickViewPatient | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState<boolean>(false);
  const [quickCreateMode, setQuickCreateMode] = useState<QuickCreateMode | null>(null);
  const [quickNotePatientId, setQuickNotePatientId] = useState<number | null>(null);
  const [manualStaffOverrides, setManualStaffOverrides] = useState<Record<number, string>>({});
  const [rebalanceSeed, setRebalanceSeed] = useState<number>(0);

  useEffect(() => {
    let active = true;
    fetchMergedPatientDirectory().then(({ patients: merged, departments: depts }) => {
      if (!active) return;
      setPatients(merged);
      setDepartments(depts);
    });
    return () => {
      active = false;
    };
  }, []);

  // Automated patient-to-staff assignment based on department load, specialty, and shift schedule
  const { assignmentsByPatientId, staffLoadSummaries } = useMemo(
    () =>
      computeAutomatedPatientAssignments(
        patients,
        manualStaffOverrides,
        rebalanceSeed
      ),
    [patients, manualStaffOverrides, rebalanceSeed]
  );

  // Real-time filtering by patient name, ID, MRN, department, or assigned clinician
  const filteredPatients = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    const normalizedIdQuery = rawQuery.replace(/^#|^id\s*|^mrn-?0*/i, '');

    return patients.filter((p) => {
      const assignedStaff = assignmentsByPatientId[p.id]?.staff;
      const matchesSearch =
        rawQuery === '' ||
        p.full_name?.toLowerCase().includes(rawQuery) ||
        p.username?.toLowerCase().includes(rawQuery) ||
        p.department?.toLowerCase().includes(rawQuery) ||
        p.encounter_type?.toLowerCase().includes(rawQuery) ||
        p.mrn?.toLowerCase().includes(rawQuery) ||
        assignedStaff?.name.toLowerCase().includes(rawQuery) ||
        assignedStaff?.primarySpecialty.toLowerCase().includes(rawQuery) ||
        String(p.id).includes(rawQuery) ||
        (normalizedIdQuery !== '' && String(p.id) === normalizedIdQuery);

      const matchesDepartment =
        selectedDepartment === 'All' ||
        p.department?.toLowerCase() === selectedDepartment.toLowerCase() ||
        p.encounter_type?.toLowerCase() === selectedDepartment.toLowerCase();

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active'
          ? p.status?.toLowerCase() === 'active' || p.status?.toLowerCase() === 'open'
          : p.status?.toLowerCase() === selectedStatus.toLowerCase());

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [patients, searchQuery, selectedDepartment, selectedStatus, assignmentsByPatientId]);

  // Keep selectedRowIndex within bounds when filteredPatients changes
  useEffect(() => {
    setSelectedRowIndex((prev) => {
      if (filteredPatients.length === 0) return 0;
      return Math.min(prev, filteredPatients.length - 1);
    });
  }, [filteredPatients.length]);

  const activePatient = filteredPatients[selectedRowIndex] ?? null;

  const handleRebalanceShiftLoad = useCallback(() => {
    setManualStaffOverrides({});
    setRebalanceSeed((prev) => prev + 1);
    toast.success(
      'Rebalanced incoming and active patient assignments across on-shift staff.'
    );
  }, []);

  // Comprehensive keyboard shortcuts for Patients Registry navigation and record actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (quickViewPatient) {
          setQuickViewPatient(null);
          return;
        }
        if (qrScannerOpen) {
          setQrScannerOpen(false);
          return;
        }
        if (quickCreateMode) {
          setQuickCreateMode(null);
          return;
        }
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
          return;
        }
      }

      if (isEditableTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        if (filteredPatients.length === 0) return;
        e.preventDefault();
        setSelectedRowIndex((prev) => Math.min(prev + 1, filteredPatients.length - 1));
        return;
      }

      if (e.key === 'k' || e.key === 'ArrowUp') {
        if (filteredPatients.length === 0) return;
        e.preventDefault();
        setSelectedRowIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === 'Enter' && activePatient && !quickCreateMode && !qrScannerOpen) {
        e.preventDefault();
        navigate(`/patients/${activePatient.id}`);
        return;
      }

      if ((e.key === 'q' || e.key === ' ') && activePatient && !quickCreateMode) {
        e.preventDefault();
        setQuickViewPatient((prev) =>
          prev?.id === activePatient.id ? null : activePatient
        );
        return;
      }

      if (e.key === 'n' && !e.shiftKey && activePatient) {
        e.preventDefault();
        setQuickNotePatientId(activePatient.id);
        setQuickCreateMode('note');
        return;
      }

      if (e.key === 'c' || (e.key === 'N' && e.shiftKey)) {
        e.preventDefault();
        setQuickCreateMode('patient');
        return;
      }

      if (e.key === 'r' && !e.shiftKey) {
        e.preventDefault();
        handleRebalanceShiftLoad();
        return;
      }

      if (e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        setQrScannerOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activePatient,
    filteredPatients.length,
    handleRebalanceShiftLoad,
    navigate,
    qrScannerOpen,
    quickCreateMode,
    quickViewPatient,
  ]);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { All: patients.length };
    patients.forEach((p) => {
      const dept = p.department || 'General';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return counts;
  }, [patients]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedDepartment !== 'All' || selectedStatus !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('All');
    setSelectedStatus('all');
    searchInputRef.current?.focus();
  };

  return (
    <div
      role="region"
      aria-label="Patients Registry and EMR Directory"
      className="min-h-screen bg-[#020204] text-slate-100 pb-20"
    >
      {/* Header */}
      <header
        aria-label="Patients Registry Header and Actions"
        className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <Users aria-hidden="true" className="w-4 h-4" />
              Electronic Medical Records (EMR)
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Patients Registry
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Longitudinal EHR records, FHIR R4 interoperability, and TabICLv2 multi-organ risk profiles.
            </p>
          </div>

          <div
            role="toolbar"
            aria-label="Patients registry primary actions"
            className="flex flex-wrap items-center gap-3"
          >
            <PrivacyModeToggle />
            <button
              type="button"
              onClick={triggerKeyboardShortcutsModal}
              aria-label="Open clinical keyboard shortcuts reference guide"
              className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              title="Open Keyboard Shortcuts Reference (?)"
            >
              <Keyboard aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400" />
              <span>Shortcuts</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 border border-slate-700 rounded text-indigo-300">
                ?
              </kbd>
            </button>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={qrScannerOpen}
              aria-label="Open patient wristband QR scanner modal (Shortcut: s)"
              onClick={() => setQrScannerOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <QrCode aria-hidden="true" className="w-4 h-4" />
              <span>Scan Patient QR</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-indigo-700/80 border border-indigo-400/40 rounded text-indigo-100">
                s
              </kbd>
            </button>
            <button
              type="button"
              aria-label="Navigate to Organ Risk Evaluation and Health AI predictors"
              onClick={() => navigate('/predict')}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Organ Risk Evaluation
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-5">
        {/* Real-Time Search & Multi-Facet Filter Bar */}
        <div
          role="search"
          aria-label="Patient directory search and department filters"
          className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4"
        >
          <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
            {/* Instant Search Input */}
            <div className="relative flex-1">
              <Search aria-hidden="true" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                aria-label="Search patients by name, ID, MRN, or department"
                placeholder="Search in real time by patient name, ID (#42 or MRN-0042), username, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-20 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X aria-hidden="true" className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Department & Clinical Status Dropdown Controls */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                <Building2 aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <label htmlFor="department-select" className="text-xs text-slate-400 whitespace-nowrap">
                  Department:
                </label>
                <select
                  id="department-select"
                  aria-label="Filter patient directory by department"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept} className="bg-slate-950 text-white">
                      {dept === 'All' ? 'All Departments' : dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                <Activity aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <label htmlFor="status-select" className="text-xs text-slate-400 whitespace-nowrap">
                  Acuity:
                </label>
                <select
                  id="status-select"
                  aria-label="Filter patient directory by clinical acuity status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-950 text-white">All Statuses</option>
                  <option value="critical" className="bg-slate-950 text-white">Critical</option>
                  <option value="active" className="bg-slate-950 text-white">Active / Open</option>
                  <option value="stable" className="bg-slate-950 text-white">Stable</option>
                  <option value="triage" className="bg-slate-950 text-white">Triage</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  aria-label="Reset all search, department, and acuity filters"
                  onClick={handleResetFilters}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw aria-hidden="true" className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Quick Department Segmented Filter Bar & Live Match Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/70">
            <div
              role="group"
              aria-label="Quick filter by department"
              className="flex items-center gap-1.5 flex-wrap"
            >
              {departments.map((dept) => {
                const isSelected = selectedDepartment === dept;
                const count = departmentCounts[dept] ?? 0;
                const deptLabel = dept === 'All' ? 'All Departments' : dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`Filter by ${deptLabel} (${count} patients)`}
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                    }`}
                  >
                    <span>{deptLabel}</span>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              role="status"
              aria-live="polite"
              className="text-xs font-mono text-slate-400 shrink-0"
            >
              Showing <strong className="text-white">{filteredPatients.length}</strong> of{' '}
              <strong className="text-white">{patients.length}</strong> patients
            </div>
          </div>
        </div>

        {/* Automated Staff Shift & Department Load Distribution Strip */}
        <StaffShiftLoadBanner
          summaries={staffLoadSummaries}
          hasManualOverrides={Object.keys(manualStaffOverrides).length > 0}
          onResetOverrides={() => {
            setManualStaffOverrides({});
            toast.info('Reset manual staff overrides to automated load-balanced routing.');
          }}
          onRebalance={handleRebalanceShiftLoad}
        />

        {/* High-Speed Keyboard Workflow Bar */}
        <PatientRegistryShortcutBar
          selectedPatientName={
            activePatient
              ? maskPatientName(activePatient.full_name, activePatient.id, isPrivacyMode)
              : undefined
          }
          selectedPatientId={activePatient?.id}
          onOpenChart={() => {
            if (activePatient) navigate(`/patients/${activePatient.id}`);
          }}
          onQuickView={() => {
            if (activePatient) setQuickViewPatient(activePatient);
          }}
          onQuickNote={() => {
            if (activePatient) {
              setQuickNotePatientId(activePatient.id);
              setQuickCreateMode('note');
            }
          }}
          onNewPatient={() => setQuickCreateMode('patient')}
          onRebalance={handleRebalanceShiftLoad}
          onOpenHelp={triggerKeyboardShortcutsModal}
        />

        {/* Patients Table */}
        <section
          aria-label="Patients Registry Table Section"
          className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden overflow-x-auto"
        >
          <table
            aria-label="Patients Registry Directory Table"
            className="w-full text-left text-xs"
          >
            <caption className="sr-only">
              Patients Registry listing patient identifier, department, clinical status, assigned staff member, open orders count, and record actions
            </caption>
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th scope="col" className="py-3.5 px-6">Patient Identifier</th>
                <th scope="col" className="py-3.5 px-6">Department / Ward</th>
                <th scope="col" className="py-3.5 px-6">Clinical Status</th>
                <th scope="col" className="py-3.5 px-6">Assigned Staff (Load · Specialty · Shift)</th>
                <th scope="col" className="py-3.5 px-6">Open Orders</th>
                <th scope="col" className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="text-sm font-bold text-slate-200">
                        No matching patient records found
                      </p>
                      <p className="text-xs text-slate-400">
                        No patients matched your search for{' '}
                        {searchQuery ? `"${searchQuery}"` : 'the selected filters'} in{' '}
                        {selectedDepartment === 'All' ? 'any department' : selectedDepartment}.
                      </p>
                      <button
                        type="button"
                        aria-label="Clear all patient search and department filters"
                        onClick={handleResetFilters}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <RotateCcw aria-hidden="true" className="w-3.5 h-3.5" />
                        Clear All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, rowIndex) => {
                  const isFocusedRow = rowIndex === selectedRowIndex;
                  const displayPatientName = maskPatientName(
                    patient.full_name,
                    patient.id,
                    isPrivacyMode
                  );
                  return (
                    <tr
                      key={patient.id}
                      tabIndex={0}
                      aria-selected={isFocusedRow}
                      aria-label={`Patient ${displayPatientName}, ID #${patient.id}, ${patient.department || 'General'}, status ${patient.status || 'Active'}`}
                      onFocus={() => setSelectedRowIndex(rowIndex)}
                      onMouseEnter={() => setSelectedRowIndex(rowIndex)}
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className={`cursor-pointer transition-colors ${
                        isFocusedRow
                          ? 'bg-indigo-950/35 hover:bg-indigo-950/50 border-l-2 border-l-indigo-400'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {displayPatientName}
                          </span>
                          {isFocusedRow && (
                            <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 rounded">
                              ↵ Enter
                            </kbd>
                          )}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                          ID #{patient.id} &bull; {maskMrn(patient.mrn, patient.id, isPrivacyMode)} &bull; @{maskUsername(patient.username, patient.id, isPrivacyMode)}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-indigo-300">
                          {patient.department || patient.encounter_type || 'General'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold capitalize ${
                            patient.status === 'critical'
                              ? 'text-rose-400'
                              : patient.status === 'open' || patient.status === 'active'
                              ? 'text-emerald-400'
                              : patient.status === 'triage'
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }`}
                        >
                          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current" />
                          {patient.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <PatientAssignedStaffCell
                          patientId={patient.id}
                          assignment={assignmentsByPatientId[patient.id]}
                          onOverrideStaff={(ptId, newStaffId) => {
                            setManualStaffOverrides((prev) => ({
                              ...prev,
                              [ptId]: newStaffId,
                            }));
                          }}
                        />
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-mono">
                        {patient.open_orders ?? 0} active
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div
                          role="group"
                          aria-label={`Actions for ${displayPatientName}`}
                          className="inline-flex items-center justify-end gap-2"
                        >
                          <button
                            type="button"
                            aria-label={`Add clinical note for ${displayPatientName} (Shortcut: n)`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickNotePatientId(patient.id);
                              setQuickCreateMode('note');
                            }}
                            title="Add Clinical Note (Shortcut: n)"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer"
                          >
                            <FileText aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400" />
                            <span>+ Note</span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Open quick view summary for ${displayPatientName} (Shortcut: q)`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickViewPatient(patient);
                            }}
                            title="Quick View Summary (Shortcut: q)"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] text-[var(--accent)] hover:bg-indigo-500/20 font-semibold transition-colors cursor-pointer"
                          >
                            <Eye aria-hidden="true" className="w-3.5 h-3.5" />
                            <span>Quick View</span>
                          </button>
                          <Link
                            to={`/patients/${patient.id}`}
                            aria-label={`View full EMR chart for ${displayPatientName}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1.5"
                          >
                            <span>View Chart</span>
                            <ArrowUpRight aria-hidden="true" className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </div>

      {/* Floating Action Button (FAB) for Quick Clinical Note or New Patient Record */}
      <PatientQuickCreateFab
        patients={patients}
        departments={departments}
        externalOpenMode={quickCreateMode}
        preselectedPatientId={quickNotePatientId}
        onCloseExternal={() => setQuickCreateMode(null)}
        onPatientCreated={(newPatient) => {
          setPatients((prev) => [newPatient, ...prev.filter((p) => p.id !== newPatient.id)]);
          setDepartments((prev) =>
            prev.includes(newPatient.department) ? prev : [...prev, newPatient.department]
          );
        }}
      />

      {/* Patient QR Code Scanner Modal */}
      <PatientQrScannerModal
        open={qrScannerOpen}
        patients={patients}
        onClose={() => setQrScannerOpen(false)}
        onPatientScanned={(scannedPatient) => {
          setQuickViewPatient(scannedPatient);
        }}
      />

      {/* Patient Quick-View Slide-Over Overlay */}
      <PatientQuickViewModal
        patient={quickViewPatient}
        onClose={() => setQuickViewPatient(null)}
      />
    </div>
  );
}
