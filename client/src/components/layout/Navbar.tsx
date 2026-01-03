import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  /**
   * Logs the user out and redirects them to the login page.
   * @returns {void} Nothing.
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  return (
    <nav
      style={{ zIndex: 100 }}
      className="bg-surface border-b border-white/5 sticky top-0 z-100 bg-[#0f0f0f]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold tracking-tight text-white">
              Project Sentinel
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/profile"
              className="text-text-muted hover:text-white transition-colors font-medium"
            >
              Profile
            </Link>
            <Link
              to="/dashboard"
              className="text-text-muted hover:text-white transition-colors font-medium"
            >
              Dashboard
            </Link>
            {user?.role === "admin" && (
              <Link
                to="/admin"
                className="text-text-muted hover:text-white transition-colors font-medium"
              >
                Admin Panel
              </Link>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-white">
                    {user.email}
                  </span>
                  <span className="text-xs text-secondary">Protected</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5 text-danger" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-primary hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-all"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
