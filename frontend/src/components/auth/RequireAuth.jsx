import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function RequireAuth() {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
