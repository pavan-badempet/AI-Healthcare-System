import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  ShieldCheck,
  Users,
  CheckCircle2,
  BedDouble,
  Sparkles,
  Pill,
  Lock,
  EyeOff,
  ArrowUpRight,
  TrendingUp,
  Stethoscope,
} from 'lucide-react';
import ClinicalInsightsCard from '@/components/operations/ClinicalInsightsCard';
import VitalSignsChartCard, { type VitalMetricFilter } from '@/components/operations/VitalSignsChartCard';
import SmartTriageSidebar from '@/components/operations/SmartTriageSidebar';
import RealtimeNotificationPanel from '@/components/operations/RealtimeNotificationPanel';
import RoleScopedWorkspaceCard from '@/components/operations/RoleScopedWorkspaceCard';
import PatientHandoffWidget from '@/components/operations/PatientHandoffWidget';
import { PrivacyModeToggle } from '@/components/layout/PrivacyModeBanner';
import CapacityShortageForecastModal, {
  CapacityShortageBanner,
} from '@/components/modals/CapacityShortageForecastModal';
import { GlobalEmergencyTriggerButton } from '@/components/modals/GlobalEmergencyModal';
import {
  getRecords,
  getDepartmentCapacityForecast24h,
  type CapacityForecast24hResponse,
} from '@/lib/api';
import { useSessionPermissions } from '@/lib/useSessionPermissions';
import { useTelemetry } from '@/lib/useTelemetry';
import {
  usePrivacyStore,
  maskPatientName,
  maskMrn,
  maskDob,
  maskEmail,
} from '@/lib/privacy';

const DASHBOARD_COHORT = [
  {
    id: 42,
    full_name: 'Eleanor Vance',
    dob: '1981-04-12',
    mrn: 'MRN-0042',
    email: 'eleanor.vance@example.com',
    ward: 'Cardiology • Bed CARD-01',
    status: 'Active',
  },
  {
    id: 43,
    full_name: 'Marcus Vance',
    dob: '1972-09-18',
    mrn: 'MRN-0043',
    email: 'marcus.vance@example.com',
    ward: 'ICU • Bed ER-01 Resus',
    status: 'Critical',
  },
  {
    id: 44,
    full_name: 'Elena Morales',
    dob: '1990-11-23',
    mrn: 'MRN-0044',
    email: 'elena.morales@example.com',
    ward: 'MICU • Bed ICU-01',
    status: 'Stable',
  },
];

export default function Dashboard() {
  const { role, roleInfo, hasPermission, canAccessRoute } = useSessionPermissions();
  const { data: liveVitals } = useTelemetry();
  const { isPrivacyMode } = usePrivacyStore();
  const [recordsCount, setRecordsCount] = useState<number>(142);
  const [capacityForecast, setCapacityForecast] =
    useState<CapacityForecast24hResponse | null>(null);
  const [capacityOverlayOpen, setCapacityOverlayOpen] = useState<boolean>(false);

  // Synchronized Vital Signs & Smart Triage Sidebar state
  const [selectedTriagePatientId, setSelectedTriagePatientId] = useState<number>(43);
  const [selectedTriageMetric, setSelectedTriageMetric] =
    useState<VitalMetricFilter>('all');
  const [simulatedSurgePatients, setSimulatedSurgePatients] = useState<
    Record<number, boolean>
  >({});
  const [triageSidebarOpen, setTriageSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    getRecords()
      .then((recordsData) => {
        if (Array.isArray(recordsData) && recordsData.length > 0) {
          setRecordsCount(recordsData.length);
        }
      })
      .catch(() => {});

    getDepartmentCapacityForecast24h()
      .then(setCapacityForecast)
      .catch(() => {});
  }, []);

  const handleSelectPatientAndMetric = (
    patientId: number,
    metric: VitalMetricFilter = 'all'
  ) => {
    setSelectedTriagePatientId(patientId);
    setSelectedTriageMetric(metric);
  };

  const handleToggleSimulateSurge = (patientId: number) => {
    setSimulatedSurgePatients((prev) => ({
      ...prev,
      [patientId]: !prev[patientId],
    }));
    setSelectedTriagePatientId(patientId);
  };

  const showBedKpi = hasPermission('bed_capacity', 'read');
  const showPatientEmrKpi = hasPermission('patient_emr', 'read');
  const showTelemetryKpi =
    hasPermission('patient_emr', 'read') || hasPermission('bed_capacity', 'read');
  const showAiModelKpi = hasPermission('organ_ai_models', 'read');
  const showOrdersKpi = hasPermission('clinical_orders', 'read');

  const showNotificationModule =
    role !== 'auditor' &&
    (hasPermission('patient_emr', 'read') ||
      hasPermission('clinical_orders', 'read') ||
      hasPermission('bed_capacity', 'read'));

  const showClinicalInsightsModule =
    hasPermission('patient_emr', 'read') && hasPermission('organ_ai_models', 'read');

  return (
    <div
      role="region"
      aria-label="Clinical Operations Dashboard"
      className="min-h-screen bg-[#020204] text-slate-100 pb-20"
    >
      {/* Simple, Self-Explanatory Header */}
      <header
        aria-label="Clinical Dashboard Header and Quick Actions"
        className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-5"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wide mb-1">
              <LayoutDashboard aria-hidden="true" className="w-4 h-4" />
              <span>Hospital Overview · {roleInfo.title}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Clinical Dashboard
            </h1>
          </div>

          <div
            role="toolbar"
            aria-label="Dashboard operational controls"
            className="flex flex-wrap items-center gap-2.5"
          >
            <GlobalEmergencyTriggerButton />
            <PrivacyModeToggle />

            {showTelemetryKpi && (
              <button
                type="button"
                aria-expanded={triageSidebarOpen}
                aria-controls="smart-triage-sidebar-panel"
                aria-label={
                  triageSidebarOpen
                    ? 'Hide Smart Triage Vital Signs Sidebar'
                    : 'Show Smart Triage Vital Signs Sidebar'
                }
                onClick={() => setTriageSidebarOpen((prev) => !prev)}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  triageSidebarOpen
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Stethoscope aria-hidden="true" className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {triageSidebarOpen ? 'Hide Smart Triage' : 'Show Smart Triage'}
                </span>
              </button>
            )}

            {showBedKpi && (
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={capacityOverlayOpen}
                aria-label="Open 24-hour department capacity shortage forecast modal"
                onClick={() => setCapacityOverlayOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <TrendingUp aria-hidden="true" className="w-3.5 h-3.5 text-rose-400" />
                <span>24h Capacity Forecast</span>
              </button>
            )}

            <div
              role="status"
              aria-live="polite"
              aria-label="Hospital telemetry system status: Online"
              className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full text-emerald-300 text-xs font-semibold"
            >
              <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5" />
              <span>System Online</span>
            </div>

            {canAccessRoute('/admin') && (
              <Link
                to="/admin"
                aria-label="Open Access Control and Governance Administration"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400" />
                Access Control
              </Link>
            )}

            {canAccessRoute('/predict') && (
              <Link
                to="/predict"
                aria-label="Open Health AI Organ Risk Evaluation"
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Sparkles aria-hidden="true" className="w-3.5 h-3.5" />
                Health AI Check
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        {/* Proactive 24-Hour Department Capacity Shortage Alert Banner */}
        {showBedKpi && (
          <CapacityShortageBanner
            forecast={capacityForecast}
            onOpenOverlay={() => setCapacityOverlayOpen(true)}
          />
        )}

        {/* 1. Role Switcher & Role-Specific Quick Tasks */}
        <RoleScopedWorkspaceCard />

        {/* 2. Key Summary Numbers (Filtered by Role) */}
        <section
          aria-label="Key Clinical Performance Indicators"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {showPatientEmrKpi && (
            <Link
              to="/patients"
              aria-label={`${
                role === 'patient' ? 'My Health Record: 1 Active' : `Total Patients: ${recordsCount}`
              }. Click to view patient records.`}
              className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-2xl p-4 transition-colors"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-slate-400">
                  {role === 'patient' ? 'My Health Record' : 'Total Patients'}
                </span>
                <Users aria-hidden="true" className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1.5">
                {role === 'patient' ? '1 Active' : recordsCount}
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">
                Click to view patient records
              </span>
            </Link>
          )}

          {showBedKpi && (
            <Link
              to="/capacity"
              aria-label="Available Beds: 7 Beds Free, 38 of 45 occupied. Click to open capacity management."
              className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-2xl p-4 transition-colors"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-slate-400">Available Beds</span>
                <BedDouble aria-hidden="true" className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1.5">7 Beds Free</div>
              <span className="text-[11px] text-cyan-400 font-medium">38 of 45 occupied</span>
            </Link>
          )}

          {showTelemetryKpi && (
            <div
              role="status"
              aria-live="polite"
              aria-label={`Ward Vitals Monitor: ${
                liveVitals ? `${liveVitals.heart_rate} beats per minute` : 'Normal'
              }`}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-slate-400">Ward Vitals Monitor</span>
                <Activity aria-hidden="true" className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1.5">
                {liveVitals ? `${liveVitals.heart_rate} bpm` : 'Normal'}
              </div>
              <span className="text-[11px] text-rose-400 font-medium">Live patient monitoring</span>
            </div>
          )}

          {showAiModelKpi && (
            <Link
              to="/predict"
              aria-label="AI Risk Screening Ready: Run heart, kidney, and diabetes risk checks"
              className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-2xl p-4 transition-colors"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-slate-400">AI Risk Screening</span>
                <Sparkles aria-hidden="true" className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1.5">Ready</div>
              <span className="text-[11px] text-purple-400 font-medium">
                Heart, kidney &amp; diabetes checks
              </span>
            </Link>
          )}

          {!showBedKpi && showOrdersKpi && (
            <div
              role="group"
              aria-label="Active Prescriptions: 2 Active, verified by pharmacy"
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-slate-400">Active Prescriptions</span>
                <Pill aria-hidden="true" className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1.5">2 Active</div>
              <span className="text-[11px] text-amber-400 font-medium">Verified by pharmacy</span>
            </div>
          )}
        </section>

        {/* Main Clinical Workspace + Smart Triage Sidebar Split View */}
        <div
          className={`grid grid-cols-1 ${
            showTelemetryKpi && triageSidebarOpen
              ? 'xl:grid-cols-12 gap-6 items-start'
              : 'gap-6'
          }`}
        >
          {/* Left / Primary Operational Column */}
          <div
            className={
              showTelemetryKpi && triageSidebarOpen
                ? 'xl:col-span-8 space-y-6 min-w-0'
                : 'space-y-6 min-w-0'
            }
          >
            {/* 3. 24-Hour Vital Signs D3 Trend Chart (Heart Rate, Blood Pressure, SpO2) */}
            {showTelemetryKpi && (
              <VitalSignsChartCard
                patientId={selectedTriagePatientId}
                externalMetricFilter={selectedTriageMetric}
                simulatedSurgePatients={simulatedSurgePatients}
                onPatientChange={setSelectedTriagePatientId}
                onMetricFilterChange={setSelectedTriageMetric}
              />
            )}

            {/* 4. Active Patient Cohort Watchlist (PII Masked in Privacy Mode) */}
            {showPatientEmrKpi && (
              <section
                aria-label="Monitored Patient Cohort"
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wide">
                      {isPrivacyMode ? (
                        <>
                          <EyeOff aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-300">
                            HIPAA De-Identified Cohort • Training &amp; Research Mode
                          </span>
                        </>
                      ) : (
                        <>
                          <Users aria-hidden="true" className="w-3.5 h-3.5" />
                          <span>Active Inpatient Cohort</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-white mt-0.5">
                      Patient Census &amp; Identifier Overview
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <PrivacyModeToggle />
                    <Link
                      to="/patients"
                      aria-label="View all patients in the Patients Registry"
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      All Patients <ArrowUpRight aria-hidden="true" className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table
                    aria-label="Active Inpatient Cohort Census Table"
                    className="w-full text-left text-xs"
                  >
                    <caption className="sr-only">
                      Active inpatient cohort census displaying patient identifier, MRN, date of birth, contact email, assigned ward, and chart link
                    </caption>
                    <thead className="text-slate-400 uppercase font-mono border-b border-slate-800/80">
                      <tr>
                        <th scope="col" className="py-2.5 pr-4">Patient / Research ID</th>
                        <th scope="col" className="py-2.5 px-4">MRN / Cohort Tag</th>
                        <th scope="col" className="py-2.5 px-4">Date of Birth</th>
                        <th scope="col" className="py-2.5 px-4">Contact Email</th>
                        <th scope="col" className="py-2.5 px-4">Assigned Ward</th>
                        <th scope="col" className="py-2.5 pl-4 text-right">Chart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {DASHBOARD_COHORT.map((pt) => {
                        const displayPtName = maskPatientName(pt.full_name, pt.id, isPrivacyMode);
                        return (
                          <tr key={pt.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 pr-4 font-bold text-white">
                              <div className="flex items-center gap-2">
                                {isPrivacyMode && (
                                  <Lock aria-hidden="true" className="w-3 h-3 text-amber-400 shrink-0" />
                                )}
                                <span>{displayPtName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-indigo-300">
                              {maskMrn(pt.mrn, pt.id, isPrivacyMode)}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {maskDob(pt.dob, isPrivacyMode)}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">
                              {maskEmail(pt.email, isPrivacyMode)}
                            </td>
                            <td className="py-3 px-4 text-slate-300">{pt.ward}</td>
                            <td className="py-3 pl-4 text-right">
                              <Link
                                to={`/patients/${pt.id}`}
                                aria-label={`Open full clinical chart for ${displayPtName}`}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
                              >
                                Open <ArrowUpRight aria-hidden="true" className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 5. Patient Handoff & Care Responsibility Transfer Ledger */}
            {(showPatientEmrKpi || role === 'auditor') && <PatientHandoffWidget />}

            {/* 6. Live Staff Notifications & Alerts (Hidden for Auditor) */}
            {showNotificationModule && <RealtimeNotificationPanel />}

            {/* 7. Patient Recovery Trends D3 Chart (Shown when role has patient & insights access) */}
            {showClinicalInsightsModule && <ClinicalInsightsCard />}
          </div>

          {/* Right Column: Smart Triage Sidebar monitoring Vital Signs dashboard data */}
          {showTelemetryKpi && triageSidebarOpen && (
            <div className="xl:col-span-4 xl:sticky xl:top-6">
              <SmartTriageSidebar
                liveTelemetry={liveVitals}
                activePatientId={selectedTriagePatientId}
                activeMetricFilter={selectedTriageMetric}
                simulatedSurgePatients={simulatedSurgePatients}
                onSelectPatientAndMetric={handleSelectPatientAndMetric}
                onToggleSimulateSurge={handleToggleSimulateSurge}
              />
            </div>
          )}
        </div>
      </div>

      {/* 24-Hour Department Capacity Shortage Prediction Overlay */}
      <CapacityShortageForecastModal
        open={capacityOverlayOpen}
        onClose={() => setCapacityOverlayOpen(false)}
        forecastData={capacityForecast}
      />
    </div>
  );
}
