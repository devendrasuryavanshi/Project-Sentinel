import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-background flex items-center">
      <div className="w-full max-w-5xl mx-auto px-6">
        <div className="space-y-10 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-bold text-white tracking-tight">
              Project <span className="text-[#236AF2]">Sentinel</span>
            </h1>

            <p className="text-3xl md:text-4xl font-semibold text-blue-400 max-w-4xl">
              The most secure place you’ve ever visited.
            </p>
          </div>

          <p className="text-lg md:text-xl text-text-muted max-w-4xl leading-relaxed">
            Every session is verified. Every device is tracked.
            <br />
            Nothing moves without being observed.
          </p>

          <div className="flex gap-4 pt-4">
            <Link
              to="/login"
              className="px-10 py-4 rounded-lg bg-primary bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              Enter Secure Zone <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              to="/dashboard"
              className="px-10 py-4 rounded-lg border border-white/20 text-white font-semibold hover:bg-[#030B2E] bg-white/5 transition-all"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
