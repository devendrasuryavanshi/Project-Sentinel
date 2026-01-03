import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";


/**
 * A React Router component that wraps an Outlet component and checks if the user is authenticated.
 * If the user is not authenticated, it redirects them to the login page.
 * This component is useful for protecting routes that require authentication.
 * @returns {JSX.Element} A React Router component that wraps an Outlet component and checks if the user is authenticated.
 */
export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};
