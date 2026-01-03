import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { LogOut, ShieldCheck, Menu, X } from "lucide-react";
import { toast } from "sonner";

export const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  /**
   * Logs the user out and redirects them to the login page.
   * @returns {void} Nothing.
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      setOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  return (
    <nav className="sticky top-0 z-100 bg-[#0f0f0f] border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold tracking-tight text-white">
              Project Sentinel
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/profile"
              className="text-text-muted hover:text-white transition-colors font-medium"
            >
              Profile
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

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-white">
                  {user.email}
                </span>
                <span className="text-xs text-secondary">Protected</span>
              </div>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="hidden md:flex p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-5 h-5 text-danger" />
              </button>
            ) : (
              <Link
                to="/login"
                className="hidden md:block bg-primary hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium"
              >
                Login
              </Link>
            )}

            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {open ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-[#0f0f0f]">
          <div className="px-4 py-4 flex flex-col gap-4">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-white font-medium"
            >
              Profile
            </Link>

            {user?.role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-white font-medium"
              >
                Admin Panel
              </Link>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-danger font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="bg-primary text-center text-white px-4 py-2 rounded-lg font-medium"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
