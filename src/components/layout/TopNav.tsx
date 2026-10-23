import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Stethoscope, LayoutDashboard, Users, BedDouble,
  Video, Sparkles, ShieldCheck, Search, Menu, X, Sun, Moon, Keyboard
} from 'lucide-react';
import { useSessionPermissions } from '@/lib/useSessionPermissions';
import type { AclRoleId } from '@/lib/acl';
import { toast } from '@/lib/toast';
import CommandPalette from './CommandPalette';
import ProfileDropdown from './ProfileDropdown';
import LanguageSelector from './LanguageSelector';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { PWAInstallButton, OfflineSyncControl } from './PWAInstallButton';
import { PrivacyModeToggle } from './PrivacyModeBanner';
import { usePrivacyStore } from '@/lib/privacy';
import { useTranslation } from '@/lib/i18n';
import {
  NAVIGATION_CHORD_MAP,
  ALT_NUMBER_NAVIGATION_MAP,
  OPEN_SHORTCUTS_MODAL_EVENT,
  isEditableTarget,
} from '@/lib/keyboardShortcuts';
import KeyboardShortcutsModal, {
  ChordIndicatorHud,
} from '@/components/modals/KeyboardShortcutsModal';
import { GlobalEmergencyTriggerButton } from '@/components/modals/GlobalEmergencyModal';
import { useGlobalEmergencyStore } from '@/lib/globalEmergencyService';

const QUICK_ROLES: Array<{ id: AclRoleId; label: string }> = [
  { id: 'doctor', label: 'Doctor' },
  { id: 'nurse', label: 'Nurse' },
  { id: 'admin', label: 'Admin' },
  { id: 'patient', label: 'Patient' },
];

export default function TopNav({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen?: boolean;
  setMobileOpen?: (val: boolean) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, canAccessRoute, switchRole } = useSessionPermissions();
  const { language, t } = useTranslation();

  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [activeChord, setActiveChord] = useState<string | null>(null);
  const chordTimerRef = useRef<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('healthcare-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('light', theme === 'light');
    localStorage.setItem('healthcare-theme', theme);
  }, [theme]);

  // Listen for custom event to open the keyboard shortcuts modal from any page
  useEffect(() => {
    const handleOpenShortcuts = () => setIsShortcutsOpen(true);
    window.addEventListener(OPEN_SHORTCUTS_MODAL_EVENT, handleOpenShortcuts);
    return () => {
      window.removeEventListener(OPEN_SHORTCUTS_MODAL_EVENT, handleOpenShortcuts);
    };
  }, []);

  // Global keyboard shortcuts for navigation, command palette, privacy mode, and cheat sheet
  useEffect(() => {
    const clearChord = () => {
      if (chordTimerRef.current) {
        window.clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }
      setActiveChord(null);
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K -> Toggle Global Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        clearChord();
        setIsCommandOpen((prev) => !prev);
        return;
      }

      // Alt+M -> Toggle Privacy Mode (works anywhere)
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        clearChord();
        usePrivacyStore.getState().togglePrivacyMode();
        return;
      }

      // Alt+E -> Trigger / Open Global Emergency Trauma Command (works anywhere)
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        clearChord();
        useGlobalEmergencyStore.getState().triggerGlobalEmergency();
        return;
      }

      // Alt+1..7 -> Direct module navigation
      if (e.altKey && !e.ctrlKey && !e.metaKey && ALT_NUMBER_NAVIGATION_MAP[e.key]) {
        const target = ALT_NUMBER_NAVIGATION_MAP[e.key];
        if (canAccessRoute(target.path)) {
          e.preventDefault();
          clearChord();
          navigate(target.path);
          toast.info(`Navigated to ${target.label}`);
        }
        return;
      }

      // Escape closes active global modals or clears armed chord
      if (e.key === 'Escape') {
        if (activeChord) {
          clearChord();
        }
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
        }
        return;
      }

      // Guard single-key and chord shortcuts when typing in inputs/textareas/selects
      if (isEditableTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      // '?' -> Toggle Keyboard Shortcuts Reference Modal
      if (e.key === '?') {
        e.preventDefault();
        clearChord();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Handle second key of an armed 'g' chord
      if (activeChord === 'g') {
        const lower = e.key.toLowerCase();
        const chordTarget = NAVIGATION_CHORD_MAP[lower];
        clearChord();
        if (chordTarget) {
          e.preventDefault();
          if (canAccessRoute(chordTarget.path)) {
            navigate(chordTarget.path);
            toast.info(`Shortcut g → ${lower}: ${chordTarget.label}`);
          } else {
            toast.error(`Current role does not have access to ${chordTarget.label}`);
          }
        }
        return;
      }

      // Arm 'g' navigation chord
      if (e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        setActiveChord('g');
        if (chordTimerRef.current) {
          window.clearTimeout(chordTimerRef.current);
        }
        chordTimerRef.current = window.setTimeout(() => {
          setActiveChord(null);
          chordTimerRef.current = null;
        }, 1800);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [activeChord, canAccessRoute, isShortcutsOpen, navigate]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const allNavItems = useMemo(
    () => [
      { href: '/dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard, shortcutHint: 'g d / Alt+1' },
      { href: '/patients', label: t('nav.patients', 'Patients'), icon: Users, shortcutHint: 'g p / Alt+2' },
      { href: '/capacity', label: t('nav.capacity', 'Beds'), icon: BedDouble, shortcutHint: 'g b / Alt+3' },
      { href: '/telemedicine', label: t('nav.telemedicine', 'Telehealth'), icon: Video, shortcutHint: 'g t / Alt+4' },
      { href: '/predict', label: t('nav.predict', 'Health AI'), icon: Sparkles, shortcutHint: 'g e / Alt+5' },
      { href: '/chat', label: t('nav.chat', 'Assistant'), icon: Stethoscope, shortcutHint: 'g c / Alt+6' },
      { href: '/admin', label: t('nav.admin', 'Admin'), icon: ShieldCheck, shortcutHint: 'g a / Alt+7' },
    ],
    [language, t]
  );

  // Dynamically filter navigation links based on current role's permissions
  const navItems = allNavItems.filter((item) => canAccessRoute(item.href));

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const handleRoleChange = (newRole: AclRoleId, label: string) => {
    switchRole(newRole);
    toast.info(`Switched view to ${label}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--bg-secondary)]/90 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand & Clean Role-Filtered Navigation */}
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="font-bold text-base text-[var(--text-primary)] tracking-tight">
              ClinOS
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={`${item.label} (${item.shortcutHint})`}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    active
                      ? 'bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent-border)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Simple 1-Click Role Switcher */}
          <div
            role="group"
            aria-label="Switch user role"
            className="hidden md:flex items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-1 gap-0.5"
          >
            {QUICK_ROLES.map((r) => {
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleChange(r.id, r.label)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Global Emergency Trauma Trigger Button */}
          <GlobalEmergencyTriggerButton compact />

          {/* Privacy Mode Toggle for Staff Training & Research */}
          <PrivacyModeToggle compact />

          {/* Offline & Workbox Background Sync Status / Simulator */}
          <OfflineSyncControl />

          {/* In-App PWA Install Button */}
          <PWAInstallButton />

          {/* Search Button */}
          <button
            onClick={() => setIsCommandOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs transition-colors cursor-pointer"
            title="Quick search (⌘K / Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{t('common.search', 'Search')}</span>
            <kbd className="hidden xl:inline-block px-1 py-0.5 text-[10px] font-mono bg-slate-900 border border-slate-700 rounded text-slate-300">
              ⌘K
            </kbd>
          </button>

          {/* Keyboard Shortcuts Reference Button */}
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            aria-label="Keyboard shortcuts reference"
            title="Keyboard shortcuts reference (?)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
            <kbd className="px-1 py-0.5 text-[10px] font-mono bg-slate-900 border border-slate-700 rounded text-indigo-300">
              ?
            </kbd>
          </button>

          {/* Notifications */}
          <NotificationCenter />

          {/* Dark/Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-center"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--accent)]" />
            )}
          </button>

          {/* Language Selector */}
          <LanguageSelector />

          {/* Profile Menu */}
          <ProfileDropdown />

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4 space-y-2">
          <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border)] mb-3">
            {QUICK_ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleChange(r.id, r.label)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                  role === r.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                  active
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent-border)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <ChordIndicatorHud activeChord={activeChord} />
      <CommandPalette open={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
      <KeyboardShortcutsModal
        open={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        onNavigate={(path) => navigate(path)}
      />
    </header>
  );
}
