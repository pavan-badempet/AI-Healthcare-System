/**
 * ProfileDropdown – Clean user profile menu, role switcher, and clinical language toggle.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Shield, LogOut, ChevronDown, UserCheck, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { prefetchRoute } from '@/lib/prefetch';
import { useAuthStore } from '@/lib/auth';
import { ROLE_CLEARANCE_LEVELS, getRoleClearanceInfo, type AclRoleId } from '@/lib/acl';
import { useTranslation, CLINICAL_LANGUAGES, type Language } from '@/lib/i18n';
import { toast } from '@/lib/toast';

interface User {
  full_name?: string;
  username: string;
  role: string;
  department_scope?: string;
}

interface ProfileDropdownProps {
  user?: User | null;
  logout?: () => void;
  adminLabel?: string;
}

export default function ProfileDropdown({
  user: propUser,
  logout: propLogout,
  adminLabel = 'Access Control & Admin',
}: ProfileDropdownProps) {
  const auth = useAuthStore();
  const { language, setLanguage, t } = useTranslation();
  const user = propUser !== undefined ? propUser : auth.user;
  const logout = propLogout || auth.logout;
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        profileOpen &&
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  if (!user) return null;

  const displayName = user.full_name || user.username;
  const initial = displayName.charAt(0).toUpperCase();
  const clearance = getRoleClearanceInfo(user.role);

  const handleSelectLanguage = (code: Language, label: string) => {
    setLanguage(code);
    toast.info(`Clinical interface language set to ${label}`);
  };

  return (
    <div ref={profileRef} className="relative">
      <button
        onClick={() => setProfileOpen(!profileOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-focus)] transition-all cursor-pointer"
        aria-label={`Profile: ${displayName} (${clearance.title})`}
        aria-expanded={profileOpen}
      >
        <div className="w-6 h-6 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] font-bold text-[10px]">
          {initial}
        </div>
        <div className="text-left hidden xl:block">
          <p className="text-[11px] font-bold text-[var(--text-primary)] leading-none">
            {displayName}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-none">
            {clearance.title}
          </p>
        </div>
        <ChevronDown
          size={11}
          className={`text-[var(--text-dim)] hidden sm:block transition-transform duration-200 ${
            profileOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {profileOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[44px] w-72 pt-1 z-50"
          >
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-focus)] rounded-2xl shadow-2xl overflow-hidden">
              {/* Profile Header */}
              <div className="p-3.5 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {displayName}
                  </h4>
                  <div className="text-[11px] text-[var(--accent)] font-medium">
                    {clearance.title}
                  </div>
                </div>
              </div>

              {/* Simple Role Switcher */}
              <div className="p-2.5 border-b border-[var(--border)] space-y-1">
                <div className="flex items-center gap-1.5 px-1 text-[10px] uppercase text-[var(--text-dim)] font-semibold">
                  <UserCheck size={11} className="text-indigo-400" />
                  <span>Switch Role</span>
                </div>
                <div className="grid grid-cols-1 gap-0.5">
                  {ROLE_CLEARANCE_LEVELS.map((tier) => {
                    const isCurrent = clearance.id === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          auth.switchRole(tier.id as AclRoleId);
                          toast.info(`Switched role to ${tier.title}`);
                          setProfileOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        <span className="truncate">{tier.title}</span>
                        {isCurrent && (
                          <span className="text-[10px] text-indigo-400">Active</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Clinical Interface Language Toggle inside Profile Menu */}
              <div className="p-2.5 border-b border-[var(--border)] space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[10px] uppercase text-[var(--text-dim)] font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <Globe size={11} className="text-indigo-400" />
                    <span>{t('profile.menuLanguage')}</span>
                  </span>
                  <span className="font-mono text-indigo-300">
                    {language.toUpperCase()}
                  </span>
                </div>
                <div
                  role="group"
                  aria-label="Profile quick clinical language toggle"
                  className="grid grid-cols-4 gap-1"
                >
                  {CLINICAL_LANGUAGES.map((lang) => {
                    const isSelected = language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleSelectLanguage(lang.code, lang.nativeLabel)}
                        title={`${lang.nativeLabel} (${lang.englishName})`}
                        className={`px-1.5 py-1 rounded-md text-[10px] font-semibold transition-colors text-center truncate cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {lang.code.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Profile & Admin Links */}
              <div className="p-1.5">
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  onMouseEnter={() => prefetchRoute('/profile')}
                  className="flex items-center justify-between px-2.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings size={13} className="text-[var(--text-dim)]" />
                    <span>{t('profile.menuSettings')}</span>
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400">
                    {language.toUpperCase()}
                  </span>
                </Link>

                <Link
                  to="/admin"
                  onClick={() => setProfileOpen(false)}
                  onMouseEnter={() => prefetchRoute('/admin')}
                  className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-colors"
                >
                  <Shield size={13} className="text-indigo-400" /> {adminLabel}
                </Link>
              </div>

              <div className="p-1.5 border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-[var(--danger)] hover:text-white hover:bg-[var(--danger)]/15 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <LogOut size={13} /> {t('common.logout')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
