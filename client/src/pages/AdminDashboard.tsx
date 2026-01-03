import { useEffect, useState } from "react";
import { adminApi } from "../api/admin";
import {
  Search,
  Shield,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  Monitor,
  Smartphone,
  Globe,
  AlertTriangle,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// --- Types ---
interface User {
  _id: string;
  email: string;
  role: "user" | "admin";
  riskScore: number;
  activeSessionCount: number;
  createdAt: string;
}

interface Session {
  _id: string;
  deviceName: string;
  ipAddress: string;
  location: { city: string; country: string };
  lastActiveAt: string;
  status: "active" | "inactive" | "revoked";
  isSuspicious: boolean;
  userAgent: string;
}

const UserRow = ({
  user,
  isExpanded,
  toggleExpand,
  onRoleUpdate,
  refreshTrigger,
}: any) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch sessions when row is expanded
  useEffect(() => {
    if (isExpanded) {
      loadSessions(showHistory ? "history" : "active");
    }
  }, [isExpanded, showHistory, refreshTrigger]);

/**
 * Loads the sessions for a given user.
 * @param {string} type - The type of sessions to load. Can be either "active" or "history".
 * @returns {Promise<void>} A promise that resolves when the sessions have been loaded.
 */
  const loadSessions = async (type: "active" | "history") => {
    setLoadingSessions(true);
    try {
      const data = await adminApi.getUserSessions(user._id, type);
      setSessions(data.sessions);
    } catch (e) {
      toast.error("Failed to load sessions");
    } finally {
      setLoadingSessions(false);
    }
  };

/**
 * Revokes a session by its ID.
 * If the revocation is successful, a success message is shown.
 * If there is an error, an error message is shown.
 * @param {string} sessionId - The ID of the session to revoke.
 * @returns {Promise<void>} A promise that resolves when the session has been revoked.
 */
  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Revoke this session?")) return;
    try {
      await adminApi.revokeSession(sessionId);
      toast.success("Session revoked");
      loadSessions(showHistory ? "history" : "active"); // Refresh list
    } catch (error: any) {
      if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
        return;
      }
      toast.error("Failed");
    }
  };

/**
 * Revokes all sessions for a given user.
 * If the revocation is successful, a success message is shown.
 * If there is an error, an error message is shown.
 * @returns {Promise<void>} A promise that resolves when the sessions have been revoked.
 */
  const handleRevokeAll = async () => {
    const confirmMsg = `Are you sure you want to sign out ${user.email} from ALL devices?`;
    if (!confirm(confirmMsg)) return;

    try {
      await adminApi.revokeAllUserSessions(user._id);
      toast.success("User signed out from all devices");
      loadSessions("active");
    } catch (error: any) {
      if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
        return;
      }
      toast.error("Failed");
    }
  };

  return (
    <>
      <tr
        className={`border-b border-white/5 transition-colors ${
          isExpanded ? "bg-white/5" : "hover:bg-white/5"
        }`}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              {user.role === "admin" ? (
                <Shield className="w-4 h-4 text-[#236AF2]" />
              ) : (
                <UserCog className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div>
              <div className="text-white font-medium">{user.email}</div>
              <div className="text-xs text-text-muted">ROLE: {user.role}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <span
            className={`px-2 py-1 rounded-full text-xs border ${
              user.riskScore > 50
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-green-500/10 text-green-400 border-green-500/20"
            }`}
          >
            Risk: {user.riskScore}/100
          </span>
        </td>
        <td className="px-6 py-4 text-text-muted">
          {user.activeSessionCount} Active
        </td>
        <td className="px-6 py-4 text-right">
          <button
            onClick={toggleExpand}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-white"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </td>
      </tr>

      {/* EXPANDED SECTION */}
      {isExpanded && (
        <tr>
          <td colSpan={4} className="bg-[#050505] p-0">
            <div className="p-6 border-b border-white/10 space-y-4 shadow-inner">
              {/* Actions Header */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHistory(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      !showHistory
                        ? "bg-[#236AF2] text-white"
                        : "text-text-muted hover:bg-white/10"
                    }`}
                  >
                    Active Sessions
                  </button>
                  <button
                    onClick={() => setShowHistory(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      showHistory
                        ? "bg-[#236AF2] text-white"
                        : "text-text-muted hover:bg-white/10"
                    }`}
                  >
                    History Log
                  </button>
                </div>

                <div className="flex gap-3">
                  {/* SUPER ADMIN ROLE TOGGLE */}
                  {/* In a real app, verify currentUser.email === SUPER_ADMIN_EMAIL from env/api */}
                  <button
                    onClick={() =>
                      onRoleUpdate(
                        user._id,
                        user.role === "admin" ? "user" : "admin"
                      )
                    }
                    className="px-3 py-1.5 rounded-md border border-white/10 text-xs font-medium hover:bg-white/5 text-text-muted"
                  >
                    {user.role === "admin"
                      ? "Demote to User"
                      : "Promote to Admin"}
                  </button>

                  <button
                    onClick={handleRevokeAll}
                    className="px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" /> Sign Out All Devices
                  </button>
                </div>
              </div>

              {/* Sessions Table */}
              {loadingSessions ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-[#236AF2]" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-center text-text-muted text-sm py-4">
                  No sessions found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-text-muted uppercase bg-white/5">
                      <tr>
                        <th className="px-4 py-3">Device</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Seen</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sessions.map((session) => (
                        <tr key={session._id} className="hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {session.userAgent
                                .toLowerCase()
                                .includes("mobile") ? (
                                <Smartphone className="w-4 h-4 text-text-muted" />
                              ) : (
                                <Monitor className="w-4 h-4 text-text-muted" />
                              )}
                              <span className="text-white">
                                {session.deviceName || "Unknown"}
                              </span>
                              {session.isSuspicious && (
                                <span title="Suspicious Activity">
                                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-text-muted">
                            <div className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />{" "}
                              {session.location?.city},{" "}
                              {session.location?.country}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                session.status === "active"
                                  ? "bg-green-500/10 text-green-400"
                                  : session.status === "inactive"
                                  ? "bg-gray-500/10 text-gray-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {session.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-muted">
                            {formatDistanceToNow(
                              new Date(session.lastActiveAt)
                            )}{" "}
                            ago
                          </td>
                          <td className="px-4 py-3 text-right">
                            {session.status === "active" && (
                              <button
                                onClick={() => handleRevokeSession(session._id)}
                                className="text-red-400 hover:text-red-300 text-xs underline"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};


/**
 * AdminDashboard component.
 *
 * This component provides an interface for administrators to view and manage users.
 * It displays a list of users, their risk levels, and their sessions.
 * Admins can also revoke sessions and update user roles using this component.
 *
 * @returns {JSX.Element} The rendered AdminDashboard component.
 */
export const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // To trigger re-fetch on sub-component updates
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, page, refreshKey]);

/**
 * Fetches all users from the backend API.
 */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAllUsers(page, search);
      setUsers(data.users);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      toast.error("Access Denied: Admins Only");
    } finally {
      setLoading(false);
    }
  };

/**
 * Updates a user's role.
 * A confirmation dialog is shown to the user before updating the role.
 * If the update is successful, a success message is shown.
 * If there is an error, an error message is shown.
 * @param {string} userId - The ID of the user to update.
 * @param {"user" | "admin"} newRole - The new role for the user.
 */
  const handleRoleUpdate = async (
    userId: string,
    newRole: "user" | "admin"
  ) => {
    const confirmMsg = `Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`;
    if (!confirm(confirmMsg)) return;

    try {
      await adminApi.updateUserRole(userId, newRole);
      toast.success("Role updated successfully");
      setRefreshKey((prev) => prev + 1); // Refresh list
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update role");
    }
  };

  return (
    <div className="min-h-screen bg-background text-white pb-20">
      <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-[#236AF2]" /> Admin Console
            </h1>
            <p className="text-text-muted mt-1">
              Monitor users, assess risks, and manage global security.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-2 w-full md:w-auto">
            <Search className="w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 w-full md:w-64"
            />
          </div>
        </div>

        {/* User Table */}
        <div className="bg-surface border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-muted uppercase bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">User Identity</th>
                  <th className="px-6 py-4">Risk Level</th>
                  <th className="px-6 py-4">Sessions</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#236AF2]" />
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <UserRow
                      key={user._id}
                      user={user}
                      isExpanded={expandedUserId === user._id}
                      toggleExpand={() =>
                        setExpandedUserId(
                          expandedUserId === user._id ? null : user._id
                        )
                      }
                      onRoleUpdate={handleRoleUpdate}
                      refreshTrigger={refreshKey}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center bg-white/2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-text-muted">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
