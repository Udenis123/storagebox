import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { loginPathFor } from "@/lib/session";

export function RequireAuth({ adminOnly = false }: { adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to={loginPathFor(`${location.pathname}${location.search}`)} replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
