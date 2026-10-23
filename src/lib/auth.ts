/**
 * AI Healthcare System — Authentication State & Multi-Level Clearance Store (Zustand)
 */
import { create } from 'zustand';
import type { AclRoleId } from './acl';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: AclRoleId | string;
  clearance_level?: number;
  department_scope?: string;
  dob?: string;
  gender?: string;
  blood_type?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  switchRole: (role: AclRoleId) => void;
}

const DEFAULT_DEMO_USER: AuthUser = {
  id: 7,
  username: 'dr_sarah',
  email: 'dr.sarah@clinos.ai',
  full_name: 'Dr. Sarah Chen, MD',
  role: 'doctor',
  clearance_level: 4,
  department_scope: 'Cardiology & ICU',
  gender: 'Female',
  blood_type: 'O+',
};

function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return DEFAULT_DEMO_USER;
  try {
    const raw = localStorage.getItem('healthcare-auth-user');
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_DEMO_USER;
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return 'demo-session-token';
  return localStorage.getItem('healthcare-auth') || 'demo-session-token';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  isAuthenticated: true,

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('healthcare-auth-user', JSON.stringify(user));
      } else {
        localStorage.removeItem('healthcare-auth-user');
      }
    }
    set({ user, isAuthenticated: !!user });
  },

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('healthcare-auth', token);
      } else {
        localStorage.removeItem('healthcare-auth');
      }
    }
    set({ token });
  },

  login: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('healthcare-auth-user', JSON.stringify(user));
      localStorage.setItem('healthcare-auth', token);
    }
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('healthcare-auth');
      localStorage.removeItem('healthcare-auth-user');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    if (typeof window !== 'undefined') {
      localStorage.setItem('healthcare-auth-user', JSON.stringify(updated));
    }
    set({ user: updated });
  },

  switchRole: (role) => {
    const current = get().user || DEFAULT_DEMO_USER;
    const roleProfiles: Record<AclRoleId, Partial<AuthUser>> = {
      super_admin: {
        id: 1,
        full_name: 'Vikram Patel (Chief Security Officer)',
        username: 'cso_vikram',
        email: 'cso.vikram@clinos.ai',
        role: 'super_admin',
        clearance_level: 5,
        department_scope: 'All Hospital Facilities',
      },
      admin: {
        id: 2,
        full_name: 'Admin Console Manager',
        username: 'admin',
        email: 'admin@clinos.ai',
        role: 'admin',
        clearance_level: 5,
        department_scope: 'All Departments',
      },
      doctor: {
        id: 7,
        full_name: 'Dr. Sarah Chen, MD',
        username: 'dr_sarah',
        email: 'dr.sarah@clinos.ai',
        role: 'doctor',
        clearance_level: 4,
        department_scope: 'Cardiology & ICU',
      },
      nurse: {
        id: 14,
        full_name: 'Elena Rostova, RN (Charge Nurse)',
        username: 'nurse_elena',
        email: 'elena.rn@clinos.ai',
        role: 'nurse',
        clearance_level: 3,
        department_scope: 'ICU & Telemetry Ward',
      },
      pharmacist: {
        id: 19,
        full_name: 'Dr. Aarav Mehta, PharmD',
        username: 'pharm_aarav',
        email: 'aarav.pharm@clinos.ai',
        role: 'pharmacist',
        clearance_level: 2,
        department_scope: 'Pharmacy & Pathology Lab',
      },
      patient: {
        id: 42,
        full_name: 'Assigned Patient',
        username: 'assigned_patient',
        email: 'patient42@clinos.ai',
        role: 'patient',
        clearance_level: 1,
        department_scope: 'Self Record Only',
      },
      auditor: {
        id: 31,
        full_name: 'Clara Lin (HIPAA Compliance Auditor)',
        username: 'auditor_clara',
        email: 'clara.audit@clinos.ai',
        role: 'auditor',
        clearance_level: 0,
        department_scope: 'De-Identified Governance',
      },
    };
    const updated = { ...current, ...(roleProfiles[role] || { role }) };
    if (typeof window !== 'undefined') {
      localStorage.setItem('healthcare-auth-user', JSON.stringify(updated));
    }
    set({ user: updated });
  },
}));
