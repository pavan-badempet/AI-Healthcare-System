import React, { useState } from 'react';
import {
  User,
  CheckCircle2,
  Globe,
  Languages,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { updateProfile } from '@/lib/api';
import {
  useTranslation,
  CLINICAL_LANGUAGES,
  type Language,
} from '@/lib/i18n';
import { PatientTransferQrCard } from '@/components/operations/PatientTransferQrCard';
import { toast } from '@/lib/toast';

export default function ProfilePage() {
  const { user, updateUser, switchRole } = useAuthStore();
  const { language, setLanguage, t } = useTranslation();

  const [fullName, setFullName] = useState<string>(
    user?.full_name || 'Dr. Sarah Chen, MD'
  );
  const [email, setEmail] = useState<string>(user?.email || 'dr.sarah@clinos.ai');
  const [bilingualMedicalTerms, setBilingualMedicalTerms] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('clinos_bilingual_terms') !== 'false';
    }
    return true;
  });
  const [saved, setSaved] = useState<boolean>(false);

  const activeLangMeta =
    CLINICAL_LANGUAGES.find((l) => l.code === language) ?? CLINICAL_LANGUAGES[0];

  const handleLanguageSelect = (nextLang: Language) => {
    const meta =
      CLINICAL_LANGUAGES.find((l) => l.code === nextLang) ?? CLINICAL_LANGUAGES[0];
    setLanguage(nextLang);
    toast.info(
      `Clinical interface language set to ${meta.nativeLabel} (${meta.localeTag})`
    );
  };

  const handleCycleNextLanguage = () => {
    const currentIndex = CLINICAL_LANGUAGES.findIndex((l) => l.code === language);
    const nextIndex = (currentIndex + 1) % CLINICAL_LANGUAGES.length;
    handleLanguageSelect(CLINICAL_LANGUAGES[nextIndex].code);
  };

  const handleToggleBilingualTerms = () => {
    setBilingualMedicalTerms((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('clinos_bilingual_terms', String(next));
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ full_name: fullName, email });
    try {
      await updateProfile({ full_name: fullName, email });
    } catch {
      // Offline zero-config fallback
    }
    setSaved(true);
    toast.success(t('profile.savedMessage'));
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div
      role="region"
      aria-label="User Profile and Clinical Language Settings"
      className="min-h-screen bg-[#020204] text-slate-100 pb-20"
    >
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <User aria-hidden="true" className="w-4 h-4" />
              <span>{t('profile.kicker')}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">
                {activeLangMeta.nativeLabel} ({activeLangMeta.localeTag})
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {t('profile.title')}
            </h1>
            <p className="text-sm text-slate-400 mt-1">{t('profile.subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="text-indigo-300 font-semibold capitalize">
              {t('profile.activeRole')}: {user?.role || 'doctor'}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-emerald-300 font-semibold">
              {activeLangMeta.code.toUpperCase()} ({activeLangMeta.direction.toUpperCase()})
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 mt-8 space-y-8">
        {/* 1. Clinical Interface Language & Localization Toggle Section */}
        <section
          aria-label="Clinical Interface Language Settings"
          className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                <Globe aria-hidden="true" className="w-4 h-4" />
                <span>Multi-Lingual Clinical Localization</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-400 font-normal">
                  {CLINICAL_LANGUAGES.length} Supported Languages
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-1">
                {t('profile.languageSectionTitle')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('profile.languageSectionDesc')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCycleNextLanguage}
                aria-label="Cycle to next clinical interface language"
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-indigo-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowRightLeft aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Quick Toggle Language ({activeLangMeta.code.toUpperCase()})</span>
              </button>
            </div>
          </div>

          {/* Interactive Language Selection Grid */}
          <div
            role="radiogroup"
            aria-label="Select Clinical Interface Language"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {CLINICAL_LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{lang.nativeLabel}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {lang.englishName}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase font-bold ${
                        isSelected ? 'text-indigo-300' : 'text-slate-400'
                      }`}
                    >
                      {lang.localeTag}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/70 font-mono">
                    <span>{lang.clinicalStandard}</span>
                    <span className={isSelected ? 'text-emerald-400 font-semibold' : ''}>
                      {isSelected ? 'Active' : lang.direction.toUpperCase()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bilingual Terminology & Live Localized Preview Strip */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
            <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Languages aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Preserve ICD-10 / SNOMED Codes</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Keep universal clinical codes alongside localized interface labels.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={bilingualMedicalTerms}
                aria-label="Preserve ICD-10 and SNOMED codes alongside localized labels"
                onClick={handleToggleBilingualTerms}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                  bilingualMedicalTerms ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    bilingualMedicalTerms ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div
              aria-live="polite"
              className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="font-semibold text-indigo-300">
                  Live Clinical Interface Preview ({activeLangMeta.nativeLabel})
                </span>
                <span className="font-mono">
                  dir=&quot;{activeLangMeta.direction}&quot; · lang=&quot;{activeLangMeta.code}&quot;
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white font-medium">
                <span>{t('nav.dashboard')}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{t('nav.patients')}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{t('nav.capacity')}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{t('nav.telemedicine')}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{t('nav.predict')}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('profile.disclaimerSample')}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Switch Role Quick Bar */}
        <section
          aria-label="Switch Active Clinical Persona or Role"
          className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
        >
          <h2 className="text-sm font-bold text-white mb-3">
            {t('profile.switchRole')}:
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {(['doctor', 'admin', 'nurse', 'patient'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  switchRole(r);
                  setFullName(
                    r === 'doctor'
                      ? 'Dr. Sarah Chen, MD'
                      : r === 'admin'
                      ? 'Admin Console Manager'
                      : r === 'nurse'
                      ? 'Elena Rostova, RN'
                      : 'James Wilson'
                  );
                  setEmail(`${r}@clinos.ai`);
                }}
                className={`py-2.5 px-3 rounded-xl capitalize font-semibold border transition-all text-center cursor-pointer ${
                  user?.role === r
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        {/* 3. Profile Edit Form */}
        <section
          aria-label="Edit Clinician Profile Details"
          className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
        >
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <User aria-hidden="true" className="w-4 h-4 text-indigo-400" />
            <span>{t('profile.editTitle')}</span>
          </h2>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label
                htmlFor="profile-full-name"
                className="text-slate-300 block mb-1 font-medium"
              >
                {t('profile.fullName')}
              </label>
              <input
                id="profile-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="text-slate-300 block mb-1 font-medium"
              >
                {t('profile.email')}
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="profile-username"
                className="text-slate-300 block mb-1 font-medium"
              >
                {t('profile.username')}
              </label>
              <input
                id="profile-username"
                type="text"
                value={user?.username || 'dr_sarah'}
                disabled
                className="w-full bg-slate-950/60 border border-slate-800/60 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {t('profile.saveButton')}
              </button>
              {saved && (
                <span
                  role="status"
                  aria-live="polite"
                  className="text-emerald-400 flex items-center gap-1 font-semibold text-xs"
                >
                  <CheckCircle2 aria-hidden="true" className="w-4 h-4" />
                  <span>{t('profile.savedMessage')}</span>
                </span>
              )}
            </div>
          </form>
        </section>

        {/* 4. Patient-Specific Inter-Departmental Transfer QR Code & EMR Link */}
        <PatientTransferQrCard
          patientId={42}
          patientName="Eleanor Vance"
          bloodType="A+"
          allowPatientSwitching={true}
        />
      </div>
    </div>
  );
}
