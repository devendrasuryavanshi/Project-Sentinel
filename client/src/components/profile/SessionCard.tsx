import { Laptop, Smartphone, Globe, Clock, Trash2 } from "lucide-react";
import type { SessionData } from "../../types/profile";
import { formatDistanceToNow } from "date-fns";

interface Props {
  session: SessionData;
  isCurrent?: boolean;
  onRevoke?: (id: string) => void;
  isRevoking?: boolean;
}

export const SessionCard = ({
  session,
  isCurrent,
  onRevoke,
  isRevoking,
}: Props) => {
  // Simple heuristic for icon
  const isMobile = session?.userAgent?.toLowerCase().includes("mobile") || false;

  return (
    <div
      className={`relative p-6 rounded-xl border transition-all ${
        isCurrent
          ? "bg-blue-600/5 border-[#236AF2]/30 shadow-[0_0_30px_-10px_rgba(35,106,242,0.15)]"
          : "bg-white/5 border-white/10 hover:border-white/20"
      }`}
    >
      {/* "This Device" Badge */}
      {isCurrent && (
        <div className="absolute -top-3 left-6 bg-[#236AF2] text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-lg">
          This Device
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        {/* Left: Icon & Name */}
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-lg ${
              isCurrent
                ? "bg-[#236AF2]/20 text-[#236AF2]"
                : "bg-white/10 text-gray-400"
            }`}
          >
            {isMobile ? (
              <Smartphone className="w-6 h-6" />
            ) : (
              <Laptop className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-white font-medium text-lg">
              {session?.deviceName ||
                (isMobile ? "Mobile Device" : "Desktop Device")}
            </h3>
            <p className="text-sm text-text-muted break-all max-w-50 md:max-w-xs truncate">
              {session?.userAgent}
            </p>
          </div>
        </div>

        {/* Middle: Details */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#236AF2]" />
            <span>
              {session.location?.city || "Unknown"},{" "}
              {session.location?.country || "Unknown"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{session.ipLastSeen}</span>
          </div>
          <div
            className="flex items-center gap-2"
            title={new Date(session.lastActiveAt).toLocaleString()}
          >
            <Clock className="w-4 h-4" />
            <span>
              Active {formatDistanceToNow(new Date(session.lastActiveAt))} ago
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        {!isCurrent && onRevoke && (
          <button
            onClick={() => onRevoke(session._id)}
            disabled={isRevoking}
            className="group flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors text-sm disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {isRevoking ? "Revoking..." : "Revoke"}
          </button>
        )}
      </div>
    </div>
  );
};
