import { useEffect, useState } from "react";
import { client } from "../api/client";
import { userApi } from "../api/user"; // Ensure you created this in the previous step
import { SessionCard } from "../components/profile/SessionCard";
import { RiskBadge } from "../components/profile/RiskBadge";
import { Loader2, History, AlertCircle, Clock, ShieldOff } from "lucide-react";
import type { ProfileResponse, SessionData } from "../types/profile";
import { format } from "date-fns";
import { toast } from "sonner";

export const ProfilePage = () => {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [history, setHistory] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Loading states for actions
  const [historyLoading, setHistoryLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await client.get("/user/profile");
      setData(res.data);
    } catch (error) {
      console.error("Failed to load profile", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (history.length > 0) return;
    setHistoryLoading(true);
    try {
      const res = await client.get("/user/sessions/history");
      setHistory(res.data.history);
    } catch (error) {
      console.error("Failed to load history", error);
      toast.error("Failed to load session history");
    } finally {
      setHistoryLoading(false);
    }
  };

/**
 * Revokes a session by its ID.
 * If the revocation is successful, the session will be removed from the 'otherSessions' array in the current user's data.
 * A success message is shown if the revocation is successful.
 * An error message is shown if the revocation fails.
 * @param {string} sessionId - The ID of the session to revoke.
 */
  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await client.delete("/user/sessions", {
        data: { sessionId },
      });

      // Optimistic update
      if (data) {
        setData({
          ...data,
          otherSessions: data.otherSessions.filter((s) => s._id !== sessionId),
        });
      }
      toast.success("Session revoked successfully");
    } catch (error) {
      console.error("Failed to revoke session", error);
      toast.error("Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

/**
 * Revokes all other sessions for the current user.
 * This will log the user out from all other devices immediately.
 * A confirmation dialog is shown to the user before revoking all sessions.
 * If the revocation is successful, the 'otherSessions' array in the current user's data is cleared.
 * A success message is shown if the revocation is successful.
 * An error message is shown if the revocation fails.
 */
  const handleRevokeAllOthers = async () => {
    if (!data || data.otherSessions.length === 0) return;

    const confirm = window.confirm(
      "Are you sure? This will log you out from all other devices immediately."
    );
    if (!confirm) return;

    setRevokingAll(true);
    try {
      await userApi.revokeAllOtherSessions();

      // Optimistic Update: Clear the 'otherSessions' array immediately
      setData({
        ...data,
        otherSessions: [],
      });

      toast.success("All other sessions have been revoked");
    } catch (error) {
      console.error("Failed to revoke all sessions", error);
      toast.error("Failed to revoke sessions");
    } finally {
      setRevokingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#236AF2]" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background text-white pb-20">
      <div className="w-full max-w-5xl mx-auto px-6 py-12 space-y-12 animate-fade-in">
        {/* --- User Header Section --- */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Security Profile
              </h1>
              <p className="text-text-muted mt-1">
                Manage your account security and active sessions.
              </p>
            </div>
            <RiskBadge score={data.user.riskScore} />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <span className="text-sm text-text-muted uppercase tracking-wider block mb-1">
                  Email
                </span>
                <span className="font-medium text-lg">{data.user.email}</span>
              </div>
              <div>
                <span className="text-sm text-text-muted uppercase tracking-wider block mb-1">
                  Account Role
                </span>
                <span className="font-medium text-lg capitalize">
                  {data.user.role}
                </span>
              </div>
              <div>
                <span className="text-sm text-text-muted uppercase tracking-wider block mb-1">
                  Member Since
                </span>
                <span className="font-medium text-lg">
                  {new Date(data.user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Active Sessions Section --- */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-semibold text-[#236AF2]">
                Active Sessions
              </h2>
              <p className="text-sm text-text-muted mt-1">
                Devices currently logged into your account.
              </p>
            </div>

            {/* Revoke All Others Button */}
            {data.otherSessions.length > 0 && (
              <button
                onClick={handleRevokeAllOthers}
                disabled={revokingAll}
                className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all text-sm font-medium disabled:opacity-50"
              >
                {revokingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldOff className="w-4 h-4" />
                )}
                Sign out all other devices
              </button>
            )}
          </div>

          {/* Current Session */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase text-text-muted tracking-widest pl-1">
              Current Device
            </h3>
            <SessionCard session={data.currentSession} isCurrent={true} />
          </div>

          {/* Other Active Sessions */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase text-text-muted tracking-widest pl-1 mt-6">
              Other Devices ({data.otherSessions.length})
            </h3>

            {data.otherSessions.length > 0 ? (
              data.otherSessions.map((session) => (
                <SessionCard
                  key={session._id}
                  session={session}
                  onRevoke={handleRevoke}
                  isRevoking={revokingId === session._id}
                />
              ))
            ) : (
              <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-text-muted bg-white/5">
                <p>No other active sessions detected.</p>
                <p className="text-xs opacity-50 mt-1">
                  Your account is secure.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* --- Session History Section --- */}
        <div className="space-y-6 pt-8 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-muted">
              Session History
            </h2>
            <button
              onClick={fetchHistory}
              disabled={historyLoading || history.length > 0}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-[#030B2E] hover:border-[#236AF2]/30 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {historyLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <History className="w-4 h-4" />
              )}
              {history.length > 0 ? "History Loaded" : "Load Inactive Sessions"}
            </button>
          </div>

          {history.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-text-muted uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4">Device</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {history.map((s) => (
                      <tr
                        key={s._id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">
                            {s.deviceName || "Unknown Device"}
                          </div>
                          <div className="text-xs text-text-muted truncate max-w-50">
                            {s.userAgent}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-muted">
                          {s.location?.city}, {s.location?.country}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              s.status === "revoked"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-gray-500/10 text-gray-400"
                            }`}
                          >
                            {s.status === "revoked" ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-text-muted font-mono">
                          {format(
                            new Date(s.lastActiveAt),
                            "MMM d, yyyy HH:mm"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
