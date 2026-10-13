import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getUserRole, getRoleHomePath, useAuth } from '../../context/AuthContext.jsx';

/**
 * Guards a page.
 *  - Not signed in      → /auth (and back here after signing in)
 *  - Wrong role         → the signed-in user's own home page
 * The API enforces the same rules server-side; this only controls navigation.
 */
export function ProtectedRoute({ children, roles }) {
  const { user, authStatus } = useAuth();
  const location = useLocation();

  if (authStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          Checking your session…
        </div>
      </div>
    );
  }

  if (authStatus !== 'authenticated' || !user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(getUserRole(user))) {
    const home = getRoleHomePath(user);
    return (
      <Navigate
        to={home === location.pathname ? '/dashboard' : home}
        state={{ roleRestricted: true, requiredRoles: roles, from: location.pathname }}
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;
