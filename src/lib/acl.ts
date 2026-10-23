/**
 * AI Healthcare System — Multi-Level Access Control List (ACL) & RBAC Engine
 * Supports 6 hierarchical clearance levels (L0–L5), granular resource actions,
 * department-scoped ABAC, and emergency Break-Glass clinical privilege elevation.
 */
import { create } from 'zustand';
import { apiFetch } from './apiCore';
import { toast } from './toast';

export type AclRoleId =
  | 'super_admin'
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'pharmacist'
  | 'auditor'
  | 'patient';

export type AclResourceId =
  | 'patient_emr'
  | 'clinical_orders'
  | 'organ_ai_models'
  | 'bed_capacity'
  | 'telemedicine'
  | 'lakehouse_omop'
  | 'rbac_governance';

export type AclAction = 'read' | 'write' | 'approve' | 'export_pdf' | 'break_glass';

export interface RoleClearanceDefinition {
  id: AclRoleId;
  level: number;
  code: string;
  title: string;
  defaultDepartmentScope: string;
  description: string;
  badgeColor: string;
}

export interface ResourceDefinition {
  id: AclResourceId;
  label: string;
  category: string;
  description: string;
}

export type RolePermissionMap = Record<AclRoleId, Record<AclResourceId, AclAction[]>>;

export interface BreakGlassGrant {
  id: string;
  actor_username: string;
  actor_role: string;
  target_resource: string;
  patient_id?: number;
  justification: string;
  granted_at: string;
  expires_at: string;
  active: boolean;
}

export const ROLE_CLEARANCE_LEVELS: RoleClearanceDefinition[] = [
  {
    id: 'super_admin',
    level: 5,
    code: 'L5-ROOT',
    title: 'Super Administrator',
    defaultDepartmentScope: 'All Hospital Facilities',
    description:
      'Full platform governance, ACL policy editing, user clearance assignment, and HIPAA security operations.',
    badgeColor: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  },
  {
    id: 'admin',
    level: 5,
    code: 'L5-ADM',
    title: 'System Administrator',
    defaultDepartmentScope: 'All Departments',
    description:
      'Operational administration, user directory management, audit log inspection, and lakehouse governance.',
    badgeColor: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10',
  },
  {
    id: 'doctor',
    level: 4,
    code: 'L4-MD',
    title: 'Attending Physician',
    defaultDepartmentScope: 'Cardiology & ICU',
    description:
      'Full clinical EMR read/write, CPOE order signature, TabICLv2 risk diagnostics, PDF export, and Break-Glass override.',
    badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  },
  {
    id: 'nurse',
    level: 3,
    code: 'L3-RN',
    title: 'Charge Nurse / RN',
    defaultDepartmentScope: 'Assigned Ward & Telemetry',
    description:
      'Bedside vital signs entry, care timeline updates, bed status coordination, and medication administration.',
    badgeColor: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
  },
  {
    id: 'pharmacist',
    level: 2,
    code: 'L2-PHARM',
    title: 'Clinical Pharmacist & Lab',
    defaultDepartmentScope: 'Pharmacy & Pathology',
    description:
      'Closed-loop barcode medication verification, laboratory panel result validation, and order fulfillment.',
    badgeColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  {
    id: 'patient',
    level: 1,
    code: 'L1-SELF',
    title: 'Patient Portal User',
    defaultDepartmentScope: 'Self Record Only',
    description:
      'Read-only access to personal longitudinal health summary, scheduled telemedicine sessions, and AI care companion.',
    badgeColor: 'text-teal-400 border-teal-500/40 bg-teal-500/10',
  },
  {
    id: 'auditor',
    level: 0,
    code: 'L0-AUDIT',
    title: 'Compliance Auditor',
    defaultDepartmentScope: 'De-Identified Governance',
    description:
      'Zero-PHI modification access; read-only inspection of immutable HIPAA audit logs and OMOP data quality metrics.',
    badgeColor: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
  },
];

export const ACL_RESOURCES: ResourceDefinition[] = [
  {
    id: 'patient_emr',
    label: 'Patient EMR & Quick-View',
    category: 'Clinical Records',
    description: 'Longitudinal EHR charts, vitals telemetry, and PDF medical report export.',
  },
  {
    id: 'clinical_orders',
    label: 'CPOE Clinical Orders',
    category: 'Clinical Workflow',
    description: 'Laboratory panels, diagnostic imaging, and FHIR MedicationRequest prescriptions.',
  },
  {
    id: 'organ_ai_models',
    label: 'TabICLv2 & Frontier AI',
    category: 'Clinical Decision Support',
    description: 'Multi-organ conformal risk scoring, BioTwin simulation, and causal treatment effects.',
  },
  {
    id: 'bed_capacity',
    label: 'Bed Census & Admissions',
    category: 'Hospital Operations',
    description: 'ICU/Ward bed allocation, inpatient admissions, and step-down transfers.',
  },
  {
    id: 'telemedicine',
    label: 'Telemedicine & CASA Triage',
    category: 'Virtual Care',
    description: 'WebRTC video consultations, specialist scheduling, and pre-visit AI intake.',
  },
  {
    id: 'lakehouse_omop',
    label: 'Delta Lakehouse & OMOP CDM',
    category: 'Data Platform',
    description: 'Bronze/Silver/Gold medallion pipelines and Great Expectations quality gates.',
  },
  {
    id: 'rbac_governance',
    label: 'ACL Matrix & Audit Logs',
    category: 'Security & Governance',
    description: 'Role permission management, user clearance assignment, and HIPAA audit trails.',
  },
];

export const DEFAULT_PERMISSION_MATRIX: RolePermissionMap = {
  super_admin: {
    patient_emr: ['read', 'write', 'approve', 'export_pdf', 'break_glass'],
    clinical_orders: ['read', 'write', 'approve', 'export_pdf', 'break_glass'],
    organ_ai_models: ['read', 'write', 'approve', 'export_pdf'],
    bed_capacity: ['read', 'write', 'approve'],
    telemedicine: ['read', 'write', 'approve'],
    lakehouse_omop: ['read', 'write', 'approve'],
    rbac_governance: ['read', 'write', 'approve', 'export_pdf', 'break_glass'],
  },
  admin: {
    patient_emr: ['read', 'export_pdf', 'break_glass'],
    clinical_orders: ['read', 'approve'],
    organ_ai_models: ['read', 'export_pdf'],
    bed_capacity: ['read', 'write', 'approve'],
    telemedicine: ['read', 'write'],
    lakehouse_omop: ['read', 'write', 'approve'],
    rbac_governance: ['read', 'write', 'approve', 'export_pdf'],
  },
  doctor: {
    patient_emr: ['read', 'write', 'approve', 'export_pdf', 'break_glass'],
    clinical_orders: ['read', 'write', 'approve', 'export_pdf'],
    organ_ai_models: ['read', 'write', 'approve', 'export_pdf'],
    bed_capacity: ['read', 'write'],
    telemedicine: ['read', 'write', 'approve'],
    lakehouse_omop: ['read'],
    rbac_governance: ['read'],
  },
  nurse: {
    patient_emr: ['read', 'write', 'export_pdf', 'break_glass'],
    clinical_orders: ['read', 'write'],
    organ_ai_models: ['read'],
    bed_capacity: ['read', 'write'],
    telemedicine: ['read', 'write'],
    lakehouse_omop: [],
    rbac_governance: [],
  },
  pharmacist: {
    patient_emr: ['read'],
    clinical_orders: ['read', 'write', 'approve'],
    organ_ai_models: ['read'],
    bed_capacity: ['read'],
    telemedicine: [],
    lakehouse_omop: [],
    rbac_governance: [],
  },
  patient: {
    patient_emr: ['read', 'export_pdf'],
    clinical_orders: ['read'],
    organ_ai_models: ['read'],
    bed_capacity: [],
    telemedicine: ['read', 'write'],
    lakehouse_omop: [],
    rbac_governance: [],
  },
  auditor: {
    patient_emr: [],
    clinical_orders: ['read'],
    organ_ai_models: ['read'],
    bed_capacity: ['read'],
    telemedicine: [],
    lakehouse_omop: ['read', 'export_pdf'],
    rbac_governance: ['read', 'export_pdf'],
  },
};

interface AclStoreState {
  matrix: RolePermissionMap;
  breakGlassGrants: BreakGlassGrant[];
  loading: boolean;
  fetchAclMatrix: () => Promise<void>;
  togglePermission: (
    role: AclRoleId,
    resource: AclResourceId,
    action: AclAction
  ) => Promise<void>;
  triggerBreakGlass: (payload: {
    actor_username: string;
    actor_role: string;
    target_resource: string;
    patient_id?: number;
    justification: string;
  }) => Promise<BreakGlassGrant>;
  revokeBreakGlass: (id: string) => Promise<void>;
}

export const useAclStore = create<AclStoreState>((set, get) => ({
  matrix: DEFAULT_PERMISSION_MATRIX,
  breakGlassGrants: [
    {
      id: 'bg-901',
      actor_username: 'dr_sarah',
      actor_role: 'doctor',
      target_resource: 'patient_emr',
      patient_id: 43,
      justification:
        'Emergency resuscitation in ER-01 for acute NSTEMI; cross-department chart unsealing required.',
      granted_at: new Date(Date.now() - 1200000).toISOString(),
      expires_at: new Date(Date.now() + 2400000).toISOString(),
      active: true,
    },
  ],
  loading: false,

  fetchAclMatrix: async () => {
    set({ loading: true });
    try {
      const res = await apiFetch<{
        matrix: RolePermissionMap;
        break_glass_grants: BreakGlassGrant[];
      }>('/v1/admin/acl/matrix');
      if (res?.matrix) {
        set({
          matrix: res.matrix,
          breakGlassGrants: res.break_glass_grants || get().breakGlassGrants,
        });
      }
    } catch {
      // Fallback to default matrix
    } finally {
      set({ loading: false });
    }
  },

  togglePermission: async (role, resource, action) => {
    const currentMatrix = get().matrix;
    const rolePerms = currentMatrix[role] || ({} as Record<AclResourceId, AclAction[]>);
    const currentActions = rolePerms[resource] || [];
    const exists = currentActions.includes(action);
    const updatedActions = exists
      ? currentActions.filter((a) => a !== action)
      : [...currentActions, action];

    const updatedMatrix: RolePermissionMap = {
      ...currentMatrix,
      [role]: {
        ...rolePerms,
        [resource]: updatedActions,
      },
    };

    set({ matrix: updatedMatrix });

    try {
      await apiFetch(`/v1/admin/acl/roles/${role}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          resource,
          actions: updatedActions,
        }),
      });
      toast.success(
        `ACL updated: ${role.toUpperCase()} → ${resource} [${
          exists ? `-${action}` : `+${action}`
        }]`
      );
    } catch {
      toast.info(
        `Local ACL updated: ${role.toUpperCase()} → ${resource} [${
          exists ? `-${action}` : `+${action}`
        }]`
      );
    }
  },

  triggerBreakGlass: async (payload) => {
    try {
      const grant = await apiFetch<BreakGlassGrant>('/v1/admin/acl/break-glass', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      set((state) => ({
        breakGlassGrants: [grant, ...state.breakGlassGrants],
      }));
      toast.warning(
        `Break-Glass Emergency Access Granted for ${payload.actor_username} (Logged to HIPAA Audit Trail)`
      );
      return grant;
    } catch {
      const fallbackGrant: BreakGlassGrant = {
        id: `bg-${Date.now()}`,
        actor_username: payload.actor_username,
        actor_role: payload.actor_role,
        target_resource: payload.target_resource,
        patient_id: payload.patient_id,
        justification: payload.justification,
        granted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        active: true,
      };
      set((state) => ({
        breakGlassGrants: [fallbackGrant, ...state.breakGlassGrants],
      }));
      toast.warning(
        `Break-Glass Emergency Access Granted for ${payload.actor_username}`
      );
      return fallbackGrant;
    }
  },

  revokeBreakGlass: async (id) => {
    set((state) => ({
      breakGlassGrants: state.breakGlassGrants.map((g) =>
        g.id === id ? { ...g, active: false } : g
      ),
    }));
    try {
      await apiFetch(`/v1/admin/acl/break-glass/${id}/revoke`, {
        method: 'POST',
      });
      toast.info('Break-Glass emergency grant revoked.');
    } catch {
      toast.info('Break-Glass emergency grant revoked.');
    }
  },
}));

export function getRoleClearanceInfo(role?: string): RoleClearanceDefinition {
  const normalized = (role || 'doctor').toLowerCase() as AclRoleId;
  return (
    ROLE_CLEARANCE_LEVELS.find((r) => r.id === normalized) ||
    ROLE_CLEARANCE_LEVELS[2]
  );
}

export function checkAclPermission(
  role: string | undefined,
  resource: AclResourceId,
  action: AclAction
): boolean {
  const normalized = (role || 'doctor').toLowerCase() as AclRoleId;
  const matrix = useAclStore.getState().matrix;
  const activeGrants = useAclStore.getState().breakGlassGrants;

  // Check if an active break-glass override applies
  if (
    activeGrants.some(
      (g) =>
        g.active &&
        (g.target_resource === resource || g.target_resource === 'all') &&
        g.actor_role === normalized
    )
  ) {
    return true;
  }

  const actions = matrix[normalized]?.[resource] || [];
  return actions.includes(action);
}

export interface RouteAclRequirement {
  resource?: AclResourceId;
  action?: AclAction;
  allowedRoles?: AclRoleId[];
  excludedRoles?: AclRoleId[];
}

export const ROUTE_ACL_REQUIREMENTS: Record<string, RouteAclRequirement> = {
  '/dashboard': {},
  '/patients': {
    resource: 'patient_emr',
    action: 'read',
  },
  '/capacity': {
    resource: 'bed_capacity',
    action: 'read',
  },
  '/telemedicine': {
    resource: 'telemedicine',
    action: 'read',
  },
  '/predict': {
    resource: 'organ_ai_models',
    action: 'read',
  },
  '/unified-hub': {
    resource: 'clinical_orders',
    action: 'read',
  },
  '/frontier': {
    resource: 'organ_ai_models',
    action: 'write',
    allowedRoles: ['super_admin', 'admin', 'doctor'],
  },
  '/chat': {
    resource: 'organ_ai_models',
    action: 'read',
    excludedRoles: ['auditor'],
  },
  '/telemetry': {
    resource: 'bed_capacity',
    action: 'read',
  },
  '/data-engineering': {
    resource: 'lakehouse_omop',
    action: 'read',
  },
  '/federated': {
    resource: 'organ_ai_models',
    action: 'write',
    allowedRoles: ['super_admin', 'admin', 'doctor'],
  },
  '/abdm': {
    resource: 'patient_emr',
    action: 'read',
  },
  '/app-registry': {
    resource: 'clinical_orders',
    action: 'read',
  },
  '/infrastructure': {
    resource: 'rbac_governance',
    action: 'read',
  },
  '/admin': {
    resource: 'rbac_governance',
    action: 'read',
  },
};

export function evaluatePermissionWithState(
  role: AclRoleId,
  matrix: RolePermissionMap,
  breakGlassGrants: BreakGlassGrant[],
  resource: AclResourceId,
  action: AclAction = 'read'
): boolean {
  if (
    breakGlassGrants.some(
      (g) =>
        g.active &&
        (g.target_resource === resource || g.target_resource === 'all') &&
        g.actor_role === role
    )
  ) {
    return true;
  }
  const actions = matrix[role]?.[resource] || [];
  return actions.includes(action);
}

export function canAccessRouteWithState(
  href: string,
  role: AclRoleId,
  matrix: RolePermissionMap,
  breakGlassGrants: BreakGlassGrant[]
): boolean {
  const req = ROUTE_ACL_REQUIREMENTS[href];
  if (!req) return true;

  if (req.excludedRoles && req.excludedRoles.includes(role)) {
    return false;
  }

  // If allowedRoles is specified along with a resource/action, allow if EITHER the role has the explicit resource permission OR is in allowedRoles with read access
  if (req.resource) {
    const action = req.action || 'read';
    const hasPerm = evaluatePermissionWithState(
      role,
      matrix,
      breakGlassGrants,
      req.resource,
      action
    );
    if (hasPerm) return true;
    if (
      req.allowedRoles?.includes(role) &&
      evaluatePermissionWithState(role, matrix, breakGlassGrants, req.resource, 'read')
    ) {
      return true;
    }
    return false;
  }

  if (req.allowedRoles) {
    return req.allowedRoles.includes(role);
  }

  return true;
}

