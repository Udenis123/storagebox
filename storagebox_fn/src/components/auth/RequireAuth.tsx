import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DASHBOARD_HOME, loginPathFor } from "@/lib/session";

export function RequireAuth({ adminOnly = false }: { adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to={loginPathFor(`${location.pathname}${location.search}`)} replace />;
  if (adminOnly && !isAdmin) return <Navigate to={DASHBOARD_HOME} replace />;
  return <Outlet />;
}
