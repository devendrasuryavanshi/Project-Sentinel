import { ShieldAlert, ShieldCheck } from "lucide-react";

export const RiskBadge = ({ score }: { score: number }) => {
  const isHighRisk = score > 50;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
        isHighRisk
          ? "bg-red-500/10 border-red-500/20 text-red-400"
          : "bg-green-500/10 border-green-500/20 text-green-400"
      }`}
    >
      {isHighRisk ? (
        <ShieldAlert className="w-4 h-4" />
      ) : (
        <ShieldCheck className="w-4 h-4" />
      )}
      <span className="text-sm font-semibold">Risk Score: {score}/100</span>
    </div>
  );
};
