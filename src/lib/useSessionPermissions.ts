/**
 * AI Healthcare System — Reactive Session Permissions Hook
 * Dynamically fetches and evaluates role-based ACL permissions and Break-Glass grants
 * for the currently authenticated user session.
 */
import { useEffect, useMemo } from 'react';
import { useAuthStore } from './auth';
import {
  useAclStore,
  getRoleClearanceInfo,
  evaluatePermissionWithState,
  canAccessRouteWithState,
  ACL_RESOURCES,
  type AclRoleId,
  type AclResourceId,
  type AclAction,
} from './acl';

let hasFetchedInitialSessionPermissions = false;

export function useSessionPermissions() {
  const { user, switchRole } = useAuthStore();
  const { matrix, breakGlassGrants, fetchAclMatrix, loading } = useAclStore();

  useEffect(() => {
    if (!hasFetchedInitialSessionPermissions) {
      hasFetchedInitialSessionPermissions = true;
      fetchAclMatrix();
    }
  }, [fetchAclMatrix]);

  const role = ((user?.role || 'doctor').toLowerCase() as AclRoleId);
  const roleInfo = useMemo(() => getRoleClearanceInfo(role), [role]);

  const rolePermissions = useMemo(() => {
    return matrix[role] || ({} as Record<AclResourceId, AclAction[]>);
  }, [matrix, role]);

  const hasPermission = (resource: AclResourceId, action: AclAction = 'read'): boolean => {
    return evaluatePermissionWithState(role, matrix, breakGlassGrants, resource, action);
  };

  const canAccessRoute = (href: string): boolean => {
    return canAccessRouteWithState(href, role, matrix, breakGlassGrants);
  };

  const authorizedResources = useMemo(() => {
    return ACL_RESOURCES.filter((res) =>
      evaluatePermissionWithState(role, matrix, breakGlassGrants, res.id, 'read')
    );
  }, [role, matrix, breakGlassGrants]);

  const restrictedResources = useMemo(() => {
    return ACL_RESOURCES.filter(
      (res) => !evaluatePermissionWithState(role, matrix, breakGlassGrants, res.id, 'read')
    );
  }, [role, matrix, breakGlassGrants]);

  const activeBreakGlassForRole = useMemo(() => {
    return breakGlassGrants.filter((g) => g.active && g.actor_role === role);
  }, [breakGlassGrants, role]);

  return {
    user,
    role,
    roleInfo,
    rolePermissions,
    authorizedResources,
    restrictedResources,
    activeBreakGlassForRole,
    loading,
    hasPermission,
    canAccessRoute,
    switchRole,
    refreshPermissions: fetchAclMatrix,
  };
}
